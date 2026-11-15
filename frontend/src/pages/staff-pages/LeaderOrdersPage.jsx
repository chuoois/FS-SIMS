// =========================================================
// LeaderOrdersPage.jsx
// Màn hình Quản lý Sản xuất & Tiếp nhận đơn hàng dành cho Tổ trưởng xưởng (LEADERSTAFF)
//
// Chức năng:
// 1. Xem danh sách các đơn hàng được Owner phân công cho Tổ trưởng
// 2. Tiếp nhận đơn hàng sản xuất (chuyển sang IN_PRODUCTION)
// 3. Xem bản vẽ khóa, thông số kỹ thuật (Dài x Rộng x Cao cm), chất liệu, màu sắc
// 4. Cập nhật tiến độ sản xuất (Hoàn thành / Chưa hoàn thành)
// 5. Gửi yêu cầu nghiệm thu lên Chủ xưởng (chuyển sang UNDER_INSPECTION)
// 6. Nhận lại đơn nếu Chủ xưởng nghiệm thu chưa đạt (khắc phục và nộp lại)
// =========================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  RotateCw,
  Eye,
  CheckCircle2,
  Clock,
  Hammer,
  AlertTriangle,
  Truck,
  Send,
  Layers,
  X,
  FileCheck,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Square,
  Palette,
  Ruler,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getLeaderOrders,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
  uploadInspectionImages,
  getLeaderOrderDetail,
} from '../../services/leaderStaffService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVND = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);

const getStatusBadge = (status, rejectReason) => {
  // Nếu IN_PRODUCTION có rejectReason => hiển thị đặc biệt
  if (status === 'IN_PRODUCTION' && rejectReason) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        <AlertCircle className="h-3 w-3" />
        Làm lại (Nghiệm thu chưa đạt)
      </span>
    );
  }
  switch (status) {
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <Clock className="h-3 w-3" />
          Chờ tiếp nhận
        </span>
      );
    case 'IN_PRODUCTION':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          <Hammer className="h-3 w-3" />
          Đang gia công
        </span>
      );
    case 'UNDER_INSPECTION':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
          <Clock className="h-3 w-3" />
          Chờ Owner nghiệm thu
        </span>
      );
    case 'READY_TO_DELIVER':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
          <CheckCircle2 className="h-3 w-3" />
          Nghiệm thu đạt (Chờ giao)
        </span>
      );
    case 'DELIVERING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
          <Truck className="h-3 w-3" />
          Đang giao hàng
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          Hoàn tất đơn
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
          {status}
        </span>
      );
  }
};

export const LeaderOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modal chi tiết & thao tác
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal Cập nhật tiến độ
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressIsCompleted, setProgressIsCompleted] = useState(false);
  const [progressNote, setProgressNote] = useState('');

  // Modal Gửi nghiệm thu
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectionNote, setInspectionNote] = useState('');
  const [inspectionImages, setInspectionImages] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [searchBy, setSearchBy] = useState('ALL');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      };
      if (search.trim()) {
        const kw = search.trim();
        if (searchBy === 'ORDER_CODE') params.order_code = kw;
        else if (searchBy === 'CUSTOMER_NAME') params.customer_name = kw;
        else if (searchBy === 'PHONE') {
          params.search = kw;
          params.search_by = 'PHONE';
        } else {
          params.search = kw;
          params.search_by = 'ALL';
        }
      }
      const res = await getLeaderOrders(params);
      setOrders(res.data || res.orders || (Array.isArray(res) ? res : []));
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng của Tổ trưởng:', err);
      toast.error('Không thể tải danh sách đơn hàng được phân công.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search, searchBy]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDetail = async (order) => {
    try {
      setSelectedOrder(order);
      setDetailModalOpen(true);
      setLoadingDetail(true);
      const res = await getLeaderOrderDetail(order.orderId);
      if (res && res.order) setSelectedOrder(res.order);
      else if (res && res.data) setSelectedOrder(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết đơn:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 1. Tiếp nhận sản xuất
  const handleAcceptOrder = async (orderId) => {
    if (!window.confirm('Xác nhận tiếp nhận đơn hàng này vào dây chuyền sản xuất của xưởng?')) return;
    try {
      setActionLoading(true);
      await leaderAcceptOrder(orderId);
      toast.success('Đã tiếp nhận sản xuất! Đơn chuyển sang trạng thái Đang gia công.');
      fetchOrders();
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: 'IN_PRODUCTION' }));
      }
    } catch (err) {
      console.error('Lỗi khi tiếp nhận đơn:', err);
      toast.error(err.response?.data?.message || 'Không thể tiếp nhận đơn hàng.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Mở modal cập nhật tiến độ
  const handleOpenProgressModal = (order) => {
    setSelectedOrder(order);
    setProgressIsCompleted(order.isProductionCompleted || false);
    setProgressNote('');
    setProgressModalOpen(true);
  };

  // 2. Submit cập nhật tiến độ
  const handleUpdateProgressSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      await leaderUpdateProgress(selectedOrder.orderId, {
        isCompleted: progressIsCompleted,
        progressNote: progressNote.trim(),
      });
      toast.success(
        progressIsCompleted
          ? '✅ Đã đánh dấu hoàn thành sản xuất!'
          : '📋 Đã cập nhật trạng thái chưa hoàn thành.'
      );
      setProgressModalOpen(false);
      setProgressNote('');
      setProgressIsCompleted(false);
      fetchOrders();
      if (selectedOrder) {
        setSelectedOrder((prev) => ({ ...prev, isProductionCompleted: progressIsCompleted }));
      }
    } catch (err) {
      console.error('Lỗi cập nhật tiến độ:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật tiến độ.');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý upload ảnh nghiệm thu
  const handlePhotoFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setUploadingPhotos(true);
      try {
        const uploadRes = await uploadInspectionImages(files);
        const urls = uploadRes.urls || uploadRes.images || [];
        if (urls.length > 0) {
          setInspectionImages((prev) => [...prev, ...urls]);
          toast.success(`Đã tải lên ${urls.length} ảnh thành phẩm.`);
          e.target.value = '';
          return;
        }
      } catch (uploadErr) {
        console.warn('Upload API không khả dụng, dùng data URL preview cục bộ:', uploadErr);
      }
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setInspectionImages((prev) => [...prev, reader.result]);
          }
        };
        reader.readAsDataURL(file);
      });
      toast.success(`Đã thêm ${files.length} ảnh thành phẩm.`);
      e.target.value = '';
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
      toast.error('Không thể đọc file ảnh.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleAddPhotoUrl = (e) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;
    setInspectionImages((prev) => [...prev, newPhotoUrl.trim()]);
    setNewPhotoUrl('');
    toast.success('Đã thêm liên kết ảnh.');
  };

  const handleRemovePhoto = (index) => {
    setInspectionImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 3. Mở modal gửi nghiệm thu
  const handleOpenInspectionModal = (order) => {
    setSelectedOrder(order);
    setInspectionNote('');
    setInspectionImages([]);
    setInspectionModalOpen(true);
  };

  // 3. Submit gửi yêu cầu nghiệm thu
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      await leaderSubmitInspection(selectedOrder.orderId, {
        note: inspectionNote.trim(),
        images: inspectionImages,
      });
      toast.success('Đã gửi yêu cầu nghiệm thu kèm hình ảnh lên Chủ xưởng thành công!');
      setInspectionModalOpen(false);
      setInspectionNote('');
      setInspectionImages([]);
      fetchOrders();
      if (selectedOrder) {
        setSelectedOrder((prev) => ({ ...prev, status: 'UNDER_INSPECTION' }));
      }
    } catch (err) {
      console.error('Lỗi khi gửi nghiệm thu:', err);
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu nghiệm thu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Đếm đơn bị reject cần xử lý
  const rejectedCount = orders.filter((o) => o.status === 'IN_PRODUCTION' && o.rejectReason).length;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Cảnh báo toàn trang nếu có đơn bị reject ── */}
      {rejectedCount > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">
              {rejectedCount} đơn hàng nghiệm thu CHƯA ĐẠT — cần khắc phục và gửi lại
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Chủ xưởng đã từ chối nghiệm thu. Vui lòng xem chi tiết lý do, khắc phục và gửi lại yêu cầu nghiệm thu.
            </p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Hammer className="h-6 w-6 text-amber-800" />
            <h1 className="text-xl font-bold text-stone-900">Quản Lý Sản Xuất Đơn Hàng</h1>
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-900">
              Tổ Trưởng Xưởng
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Tiếp nhận đơn hàng được Chủ xưởng giao, bám sát bản vẽ kỹ thuật đã chốt, gia công và gửi nghiệm thu.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-sm transition"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* ── Khu vực Tìm kiếm & Bộ lọc ── */}
      <div className="flex flex-col gap-3.5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm text-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-52">
            <select
              aria-label="Tiêu chí tìm kiếm"
              value={searchBy}
              onChange={(e) => { setSearchBy(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-3 pr-8 text-xs font-semibold text-stone-800 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">🔍 Tất cả tiêu chí</option>
              <option value="CUSTOMER_NAME">👤 Tên khách hàng</option>
              <option value="ORDER_CODE">🏷️ Mã đơn hàng</option>
              <option value="PHONE">📞 Số điện thoại</option>
            </select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={
                searchBy === 'ORDER_CODE' ? 'Nhập mã đơn hàng...' :
                searchBy === 'CUSTOMER_NAME' ? 'Nhập họ tên khách hàng...' :
                searchBy === 'PHONE' ? 'Nhập số điện thoại khách...' :
                'Tìm theo mã đơn, tên khách, số điện thoại...'
              }
              className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-8 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-2.5 rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-100 pt-3">
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-stone-200 bg-stone-50 py-1.5 px-3 text-xs font-semibold text-stone-700 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">📋 Tất cả trạng thái sản xuất</option>
              <option value="CONFIRMED">⏳ Chờ tiếp nhận</option>
              <option value="IN_PRODUCTION">🔨 Đang gia công</option>
              <option value="UNDER_INSPECTION">🔍 Chờ Owner nghiệm thu</option>
              <option value="READY_TO_DELIVER">✅ Nghiệm thu đạt (Chờ giao)</option>
              <option value="COMPLETED">🎉 Hoàn tất đơn</option>
            </select>
            {(search || statusFilter !== 'ALL' || searchBy !== 'ALL') && (
              <button
                onClick={() => { setSearch(''); setSearchBy('ALL'); setStatusFilter('ALL'); setPage(1); }}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bảng danh sách đơn hàng ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Hợp đồng</th>
                <th className="px-4 py-3">Loại đơn</th>
                <th className="px-4 py-3">Ngày giao mong muốn</th>
                <th className="px-4 py-3 text-center">Tiến độ nội bộ</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác sản xuất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                    <p className="mt-2 text-xs">Đang tải danh sách đơn sản xuất...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-500">
                    <Package className="mx-auto h-10 w-10 text-stone-300" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">Chưa có đơn hàng nào được phân công</p>
                    <p className="mt-1 text-xs text-stone-500">Khi Chủ xưởng duyệt và giao đơn, danh sách sẽ hiển thị tại đây.</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.orderId}
                    className={`hover:bg-stone-50/70 transition ${o.status === 'IN_PRODUCTION' && o.rejectReason ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-amber-900">
                      {o.orderCode}
                      {o.status === 'IN_PRODUCTION' && o.rejectReason && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-red-200 px-1 py-0.5 text-[10px] font-bold text-red-800">
                          Làm lại
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-900">{o.contactName}</p>
                      <p className="text-[11px] text-stone-500">{o.contactPhone}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-600">{o.contractCode || '---'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                        {o.orderType === 'READY' ? 'Hàng sẵn' : 'May đo (CUSTOM)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-mono">
                      {o.expectedDate ? o.expectedDate.split('T')[0] : '---'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.status === 'IN_PRODUCTION' || o.status === 'UNDER_INSPECTION' ? (
                        o.isProductionCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                            <Clock className="h-3 w-3" /> Đang làm
                          </span>
                        )
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(o.status, o.rejectReason)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenDetail(o)}
                          className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 shadow-sm hover:bg-stone-100 transition"
                        >
                          <Eye className="h-3 w-3 text-stone-500" />
                          Xem chi tiết
                        </button>

                        {/* Tiếp nhận */}
                        {o.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleAcceptOrder(o.orderId)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 rounded bg-amber-800 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-amber-900 transition"
                          >
                            <Hammer className="h-3 w-3" />
                            Tiếp nhận
                          </button>
                        )}

                        {/* Cập nhật tiến độ & gửi nghiệm thu khi IN_PRODUCTION */}
                        {o.status === 'IN_PRODUCTION' && (
                          <>
                            <button
                              onClick={() => handleOpenProgressModal(o)}
                              className="inline-flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition"
                            >
                              {o.isProductionCompleted ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                              Tiến độ
                            </button>
                            <button
                              onClick={() => handleOpenInspectionModal(o)}
                              className="inline-flex items-center gap-1 rounded bg-purple-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-purple-800 transition"
                            >
                              <Send className="h-3 w-3" />
                              {o.rejectReason ? 'Gửi lại' : 'Nghiệm thu'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pagination.currentPage || page}
          totalPages={pagination.totalPages || 1}
          totalItems={pagination.totalItems}
          currentCount={orders.length}
          itemsPerPage={limit}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
          itemLabel="đơn sản xuất"
          loading={loading}
        />
      </div>

      {/* ── MODAL CHI TIẾT ĐƠN HÀNG & THÔNG SỐ KỸ THUẬT ── */}
      {detailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <Hammer className="h-5 w-5 text-amber-800" />
                <h3 className="text-base font-bold text-stone-900">
                  Bản vẽ kỹ thuật & Thông số gia công #{selectedOrder.orderCode}
                </h3>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <RotateCw className="h-6 w-6 animate-spin text-amber-800" />
              </div>
            ) : (
              <div className="overflow-y-auto p-6 text-xs text-stone-800 space-y-4">
                {/* Banner cảnh báo nghiệm thu thất bại */}
                {selectedOrder.rejectReason && selectedOrder.status === 'IN_PRODUCTION' && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-700 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-800">⚠️ Nghiệm thu KHÔNG ĐẠT — Cần khắc phục và gửi lại</p>
                      <p className="mt-1 text-red-700">
                        <span className="font-semibold">Lý do từ Chủ xưởng:</span> {selectedOrder.rejectReason}
                      </p>
                      <p className="mt-1 text-red-600">
                        Vui lòng khắc phục theo yêu cầu, sau đó nhấn "Gửi lại nghiệm thu" để nộp lại cho Chủ xưởng kiểm tra.
                      </p>
                    </div>
                  </div>
                )}

                {/* Banner bản vẽ đã khóa */}
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-center gap-2 text-amber-900">
                  <FileCheck className="h-5 w-5 shrink-0 text-amber-800" />
                  <span>
                    <strong>Bản vẽ đã khóa:</strong> Tổ trưởng và thợ xưởng gia công chính xác theo thông số kích thước và yêu cầu kỹ thuật bên dưới, không tự ý thay đổi.
                  </span>
                </div>

                {/* Thông tin đơn & giao hàng */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                  <div>
                    <span className="text-stone-500">Khách hàng:</span>
                    <p className="font-semibold text-stone-900">{selectedOrder.contactName}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Số điện thoại:</span>
                    <p className="font-semibold text-stone-900">{selectedOrder.contactPhone}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Hợp đồng:</span>
                    <p className="font-mono font-semibold text-amber-900">{selectedOrder.contractCode || '---'}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Trạng thái:</span>
                    <div className="mt-0.5">{getStatusBadge(selectedOrder.status, selectedOrder.rejectReason)}</div>
                  </div>
                  <div>
                    <span className="text-stone-500">Ngày giao mong muốn:</span>
                    <p className="font-semibold text-stone-900">
                      {selectedOrder.expectedDate ? selectedOrder.expectedDate.split('T')[0] : '---'}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-500">Tiến độ nội bộ:</span>
                    <p className="mt-0.5">
                      {selectedOrder.isProductionCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                          <Clock className="h-3 w-3" /> Đang làm
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-stone-500">Địa chỉ giao hàng / lắp đặt:</span>
                    <p className="font-semibold text-stone-900">{selectedOrder.deliveryAddress || 'Nhận tại quầy'}</p>
                  </div>
                </div>

                {/* Yêu cầu thiết kế / mô tả nếu có */}
                {selectedOrder.requestTitle && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                    <p className="font-semibold text-blue-900">📐 Yêu cầu thiết kế: {selectedOrder.requestTitle}</p>
                    {selectedOrder.requestDescription && (
                      <p className="mt-1 text-blue-800">{selectedOrder.requestDescription}</p>
                    )}
                  </div>
                )}

                {/* Bảng sản phẩm kỹ thuật */}
                <div>
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-800" /> Chi tiết từng sản phẩm cần gia công
                  </h4>
                  <div className="rounded-xl border border-stone-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                        <tr>
                          <th className="px-3 py-2">Sản phẩm</th>
                          <th className="px-3 py-2">
                            <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> Kích thước (D x R x C)</span>
                          </th>
                          <th className="px-3 py-2">
                            <span className="flex items-center gap-1"><Palette className="h-3 w-3" /> Chất liệu / Màu sắc</span>
                          </th>
                          <th className="px-3 py-2 text-center">SL</th>
                          <th className="px-3 py-2">Yêu cầu gia công</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {(selectedOrder.items || []).length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-3 py-4 text-center text-stone-400 italic">
                              Không có thông tin sản phẩm.
                            </td>
                          </tr>
                        ) : (
                          (selectedOrder.items || []).map((it, idx) => {
                            const dim = [it.lengthCm, it.widthCm, it.heightCm]
                              .filter((v) => v !== null && v !== undefined && v !== '')
                              .join(' × ');
                            const matColor = [it.materialName, it.colorName].filter(Boolean).join(' / ');
                            return (
                              <tr key={it.orderItemId || idx}>
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-stone-900">
                                    {it.productName || it.itemName}
                                  </p>
                                  {it.productCode && (
                                    <span className="text-[10px] font-mono text-stone-500">({it.productCode})</span>
                                  )}
                                  {it.categoryName && (
                                    <span className="ml-1 rounded bg-stone-100 px-1 py-0.5 text-[10px] text-stone-600">{it.categoryName}</span>
                                  )}
                                  {it.roomName && (
                                    <span className="ml-1 rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-700">{it.roomName}</span>
                                  )}
                                  {/* Ảnh thiết kế / bản vẽ */}
                                  {it.images && it.images.length > 0 && (
                                    <div className="mt-1.5 flex gap-1 flex-wrap">
                                      {it.images.map((img, iIdx) => (
                                        <a key={iIdx} href={img.imageUrl} target="_blank" rel="noopener noreferrer">
                                          <img
                                            src={img.imageUrl}
                                            alt={`Bản vẽ ${iIdx + 1}`}
                                            className="h-10 w-10 rounded border border-stone-200 object-cover hover:scale-105 transition"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  {it.imageUrl && (!it.images || it.images.length === 0) && (
                                    <div className="mt-1.5">
                                      <a href={it.imageUrl} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={it.imageUrl}
                                          alt="Hình sản phẩm"
                                          className="h-10 w-10 rounded border border-stone-200 object-cover hover:scale-105 transition"
                                        />
                                      </a>
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono text-stone-800 font-bold">
                                  {dim ? `${dim} cm` : <span className="text-stone-400 font-normal italic">Theo mẫu chuẩn</span>}
                                </td>
                                <td className="px-3 py-2">
                                  {matColor ? (
                                    <div>
                                      {it.materialName && (
                                        <span className="block font-semibold text-stone-800">{it.materialName}</span>
                                      )}
                                      {it.colorName && (
                                        <span className="inline-flex items-center gap-1">
                                          {it.colorHex && (
                                            <span
                                              className="inline-block h-3 w-3 rounded-full border border-stone-300"
                                              style={{ backgroundColor: it.colorHex }}
                                            />
                                          )}
                                          <span className="text-stone-700">{it.colorName}</span>
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-stone-400 italic">Theo quy chuẩn</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-amber-900">{it.quantity}</td>
                                <td className="px-3 py-2 text-stone-600 italic">
                                  {it.description || <span className="text-stone-400">Theo quy chuẩn xưởng</span>}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ảnh nghiệm thu trước đó (nếu có) */}
                {selectedOrder.inspectionImages && selectedOrder.inspectionImages.length > 0 && (
                  <div>
                    <h4 className="font-bold text-stone-900 mb-2">📸 Ảnh đã gửi nghiệm thu lần trước:</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedOrder.inspectionImages.map((img, idx) => (
                        <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                          <img
                            src={img}
                            alt={`Ảnh nghiệm thu ${idx + 1}`}
                            className="rounded-lg border border-stone-200 object-cover aspect-video w-full hover:opacity-90 transition"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Modal */}
            <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {selectedOrder.status === 'CONFIRMED' && (
                  <button
                    type="button"
                    onClick={() => handleAcceptOrder(selectedOrder.orderId)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-5 py-2 font-bold text-white shadow-md hover:bg-amber-900 transition"
                  >
                    <Hammer className="h-4 w-4" />
                    Tiếp nhận sản xuất
                  </button>
                )}

                {selectedOrder.status === 'IN_PRODUCTION' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setDetailModalOpen(false); handleOpenProgressModal(selectedOrder); }}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 font-semibold text-blue-800 hover:bg-blue-100 transition"
                    >
                      {selectedOrder.isProductionCompleted ? '✅ Cập nhật tiến độ' : '📋 Cập nhật tiến độ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDetailModalOpen(false); handleOpenInspectionModal(selectedOrder); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-5 py-2 font-bold text-white shadow-md hover:bg-purple-800 transition"
                    >
                      <Send className="h-4 w-4" />
                      {selectedOrder.rejectReason ? 'Gửi lại nghiệm thu' : 'Gửi Chủ xưởng nghiệm thu'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CẬP NHẬT TIẾN ĐỘ ── */}
      {progressModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-700" />
                Cập nhật tiến độ gia công #{selectedOrder.orderCode}
              </h3>
              <button
                type="button"
                onClick={() => setProgressModalOpen(false)}
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgressSubmit} className="space-y-4 text-xs">
              {/* Toggle Hoàn thành / Chưa hoàn thành */}
              <div>
                <label className="block font-semibold text-stone-700 mb-2">
                  Trạng thái gia công:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setProgressIsCompleted(false)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold transition ${
                      !progressIsCompleted
                        ? 'border-orange-400 bg-orange-50 text-orange-800'
                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    <Square className={`h-4 w-4 ${!progressIsCompleted ? 'text-orange-600' : 'text-stone-400'}`} />
                    Chưa hoàn thành
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressIsCompleted(true)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold transition ${
                      progressIsCompleted
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    <CheckSquare className={`h-4 w-4 ${progressIsCompleted ? 'text-emerald-600' : 'text-stone-400'}`} />
                    Hoàn thành
                  </button>
                </div>
              </div>

              {/* Ghi chú tùy chọn */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Ghi chú thêm (tùy chọn):
                </label>
                <textarea
                  rows="3"
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder={
                    progressIsCompleted
                      ? 'VD: Đã hoàn thiện sơn PU 3 lớp, lắp phụ kiện đầy đủ.'
                      : 'VD: Đang chà nhám, dự kiến xong sơn lót ngày mai.'
                  }
                  className="w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`rounded-lg px-5 py-2 font-bold text-white disabled:opacity-50 transition ${
                    progressIsCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-700 hover:bg-blue-800'
                  }`}
                >
                  {actionLoading ? 'Đang lưu...' : progressIsCompleted ? '✅ Xác nhận hoàn thành' : '📋 Lưu tiến độ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL GỬI NGHIỆM THU KÈM HÌNH ẢNH THÀNH PHẨM LÊN OWNER ── */}
      {inspectionModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Send className="h-5 w-5 text-purple-700" />
                {selectedOrder.rejectReason ? 'Gửi lại nghiệm thu' : 'Nộp nghiệm thu sản phẩm'} #{selectedOrder.orderCode}
              </h3>
              <button
                type="button"
                onClick={() => setInspectionModalOpen(false)}
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Banner lý do reject nếu có */}
            {selectedOrder.rejectReason && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 flex items-start gap-2 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-700 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">Lý do nghiệm thu KHÔNG ĐẠT lần trước:</p>
                  <p className="text-red-700 mt-0.5">{selectedOrder.rejectReason}</p>
                  <p className="text-red-600 mt-1 italic">Vui lòng khắc phục và ghi rõ những cải thiện đã thực hiện trong ghi chú bên dưới.</p>
                </div>
              </div>
            )}

            <p className="text-xs text-stone-500 mb-4">
              Xác nhận xưởng đã hoàn tất gia công sản phẩm. Vui lòng chụp và tải ảnh thành phẩm thực tế để Chủ xưởng đối chiếu bản vẽ thiết kế trước khi chuyển Sales giao hàng.
            </p>

            <form onSubmit={handleSubmitInspection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {selectedOrder.rejectReason
                    ? 'Mô tả cải thiện / Kết quả khắc phục:'
                    : 'Ghi chú hoàn thiện / Kết quả tự kiểm tra tại xưởng:'}
                </label>
                <textarea
                  rows="3"
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                  placeholder={
                    selectedOrder.rejectReason
                      ? 'VD: Đã sửa lại mối ghép theo yêu cầu, kiểm tra lại toàn bộ phụ kiện.'
                      : 'VD: Đã hoàn thiện sơn PU 3 lớp, các mối ghép khít, phụ kiện Hafele lắp chuẩn, tải trọng đạt yêu cầu.'
                  }
                  className="w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-purple-700 focus:outline-none"
                />
              </div>

              {/* Khu vực Upload Ảnh Thành Phẩm */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  📸 Tải ảnh thành phẩm thực tế để Chủ xưởng thẩm định:
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-purple-400 bg-purple-50 px-4 py-2 font-semibold text-purple-800 hover:bg-purple-100 transition shadow-2xs">
                    <Package className="h-4 w-4" />
                    <span>Chọn ảnh từ máy tính (Có thể chọn nhiều)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoFileUpload}
                      className="hidden"
                    />
                  </label>
                  {uploadingPhotos && (
                    <span className="flex items-center gap-1 text-purple-700 text-xs">
                      <RotateCw className="h-3.5 w-3.5 animate-spin" /> Đang tải...
                    </span>
                  )}
                </div>

                {/* Hoặc dán link ảnh */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Hoặc dán URL ảnh trực tiếp (https://...)"
                    className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-purple-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    className="rounded-lg bg-stone-100 px-3 py-1.5 font-semibold text-stone-700 hover:bg-stone-200"
                  >
                    Thêm link
                  </button>
                </div>

                {/* Danh sách ảnh đã đính kèm */}
                {inspectionImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200 max-h-40 overflow-y-auto">
                    {inspectionImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-md overflow-hidden border border-stone-200 aspect-video bg-white">
                        <img
                          src={img}
                          alt={`Thành phẩm ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white shadow-xs opacity-80 hover:opacity-100"
                          title="Xóa ảnh này"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-center text-xs text-stone-400">
                    Chưa có ảnh nào được đính kèm. Khuyến khích chụp 1-3 góc để Chủ xưởng thẩm định nhanh chóng.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setInspectionModalOpen(false)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || uploadingPhotos}
                  className="rounded-lg bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 disabled:opacity-50 transition shadow-sm"
                >
                  {actionLoading
                    ? 'Đang gửi...'
                    : selectedOrder.rejectReason
                    ? 'Xác nhận gửi lại nghiệm thu'
                    : 'Xác nhận nộp nghiệm thu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderOrdersPage;
