// =========================================================
// LeaderOrdersPage.jsx
// Màn hình Quản lý Sản xuất & Tiếp nhận đơn hàng dành cho Tổ trưởng xưởng (LEADERSTAFF)
//
// Chức năng:
// 1. Xem danh sách các đơn hàng được Owner phân công cho Tổ trưởng
// 2. Tiếp nhận đơn hàng sản xuất (chuyển sang IN_PRODUCTION)
// 3. Xem bản vẽ khóa, thông số kỹ thuật (Dài x Rộng x Cao cm), chất liệu, màu sắc
// 4. Cập nhật tiến độ sản xuất
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
  XCircle,
  Truck,
  Send,
  Calendar,
  Layers,
  User,
  Phone,
  MapPin,
  X,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getLeaderOrders,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
  getOrderDetail,
} from '../../services/orderManagementService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVND = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);

const getStatusBadge = (status) => {
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
  const [progressNote, setProgressNote] = useState('');

  // Modal Gửi nghiệm thu
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectionNote, setInspectionNote] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: statusFilter,
        search: search.trim() || undefined,
      };
      const res = await getLeaderOrders(params);
      setOrders(res.orders || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng của Tổ trưởng:', err);
      toast.error('Không thể tải danh sách đơn hàng được phân công.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDetail = async (order) => {
    try {
      setSelectedOrder(order);
      setDetailModalOpen(true);
      setLoadingDetail(true);
      const res = await getOrderDetail(order.orderId);
      if (res.order) setSelectedOrder(res.order);
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

  // 2. Cập nhật tiến độ
  const handleUpdateProgressSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      await leaderUpdateProgress(selectedOrder.orderId, { progressNote });
      toast.success('Đã cập nhật tiến độ sản xuất thành công!');
      setProgressModalOpen(false);
      setProgressNote('');
      fetchOrders();
    } catch (err) {
      console.error('Lỗi cập nhật tiến độ:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật tiến độ.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Gửi yêu cầu nghiệm thu
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      await leaderSubmitInspection(selectedOrder.orderId, { note: inspectionNote });
      toast.success('Đã gửi yêu cầu nghiệm thu lên Chủ xưởng!');
      setInspectionModalOpen(false);
      setInspectionNote('');
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

  return (
    <div className="space-y-6 pb-12">
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

      {/* ── Bộ lọc & Tìm kiếm ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm text-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, tên khách, số điện thoại..."
            className="w-full rounded-lg border border-stone-200 pl-9 pr-4 py-2 text-xs focus:border-amber-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Chờ tiếp nhận</option>
            <option value="IN_PRODUCTION">Đang gia công</option>
            <option value="UNDER_INSPECTION">Chờ nghiệm thu</option>
            <option value="READY_TO_DELIVER">Nghiệm thu đạt</option>
            <option value="COMPLETED">Hoàn thành</option>
          </select>
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
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác sản xuất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                    <p className="mt-2 text-xs">Đang tải danh sách đơn sản xuất...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-stone-500">
                    <Package className="mx-auto h-10 w-10 text-stone-300" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">
                      Chưa có đơn hàng nào được phân công
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Khi Chủ xưởng duyệt và giao đơn, danh sách sẽ hiển thị tại đây.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-amber-900">
                      {o.orderCode}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-900">{o.contactName}</p>
                      <p className="text-[11px] text-stone-500">{o.contactPhone}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-600">
                      {o.contractCode || '---'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                        {o.orderType === 'READY' ? 'Hàng sẵn' : 'May đo (CUSTOM)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-mono">
                      {o.expectedDate ? o.expectedDate.split('T')[0] : '---'}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(o.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(o)}
                          className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 shadow-sm hover:bg-stone-100 transition"
                        >
                          <Eye className="h-3 w-3 text-stone-500" />
                          Xem chi tiết
                        </button>

                        {/* Nút Tiếp nhận sản xuất khi CONFIRMED */}
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

                        {/* Nút Gửi nghiệm thu khi IN_PRODUCTION */}
                        {o.status === 'IN_PRODUCTION' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setInspectionModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded bg-purple-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-purple-800 transition"
                          >
                            <Send className="h-3 w-3" />
                            Nghiệm thu
                          </button>
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
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemLabel="đơn sản xuất"
          loading={loading}
        />
      </div>

      {/* ── MODAL CHI TIẾT ĐƠN HÀNG & THÔNG SỐ KỸ THUẬT KHÓA ── */}
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
              <button
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="overflow-y-auto p-6 text-xs text-stone-800 space-y-4">
              {/* Banner lưu ý thiết kế đã khóa */}
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
                  <div className="mt-0.5">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <span className="text-stone-500">Địa chỉ giao hàng / lắp đặt:</span>
                  <p className="font-semibold text-stone-900">{selectedOrder.deliveryAddress || 'Nhận tại quầy'}</p>
                </div>
              </div>

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
                        <th className="px-3 py-2">Kích thước (Dài x Rộng x Cao)</th>
                        <th className="px-3 py-2 text-center">Số lượng</th>
                        <th className="px-3 py-2">Yêu cầu gia công / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedOrder.items || []).map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' x ');
                        return (
                          <tr key={it.orderItemId || idx}>
                            <td className="px-3 py-2 font-semibold text-stone-900">
                              {it.productName || it.itemName}
                              {it.productCode && (
                                <span className="ml-1 text-[10px] font-mono text-stone-500">
                                  ({it.productCode})
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-stone-800 font-bold">
                              {dim ? `${dim} cm` : 'Theo mẫu chuẩn'}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-amber-900">
                              {it.quantity}
                            </td>
                            <td className="px-3 py-2 text-stone-600 italic">
                              {it.description || 'Theo quy chuẩn xưởng'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Modal với các nút hành động */}
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
                      onClick={() => setProgressModalOpen(true)}
                      className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100 transition"
                    >
                      Cập nhật tiến độ
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-5 py-2 font-bold text-white shadow-md hover:bg-purple-800 transition"
                    >
                      <Send className="h-4 w-4" />
                      Gửi Chủ xưởng nghiệm thu
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GỬI NGHIỆM THU LÊN OWNER ── */}
      {inspectionModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-700" />
              Gửi yêu cầu nghiệm thu #{selectedOrder.orderCode}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Xác nhận xưởng đã hoàn tất gia công sản phẩm theo đúng bản vẽ kỹ thuật. Chủ xưởng sẽ kiểm tra và nghiệm thu trước khi chuyển Sales giao hàng.
            </p>

            <form onSubmit={handleSubmitInspection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Ghi chú hoàn thiện / Kết quả tự kiểm tra tại xưởng:
                </label>
                <textarea
                  rows="3"
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                  placeholder="VD: Đã hoàn thiện sơn PU 3 lớp, phụ kiện Hafele lắp khít, test chịu lực đạt yêu cầu."
                  className="w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-purple-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectionModalOpen(false)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Đang gửi...' : 'Xác nhận nộp nghiệm thu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CẬP NHẬT TIẾN ĐỘ ── */}
      {progressModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900 mb-2">
              Cập nhật tiến độ gia công #{selectedOrder.orderCode}
            </h3>
            <form onSubmit={handleUpdateProgressSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Nhật ký tiến độ gia công:
                </label>
                <textarea
                  rows="3"
                  required
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="VD: Đã hoàn thành pha gỗ và dựng mộc, chuẩn bị chuyển sang công đoạn chà nhám và sơn lót."
                  className="w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-amber-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  className="rounded-lg bg-amber-800 px-5 py-2 font-bold text-white hover:bg-amber-900 disabled:opacity-50"
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu tiến độ'}
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
