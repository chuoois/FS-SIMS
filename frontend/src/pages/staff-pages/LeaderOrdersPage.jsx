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

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { formatVND, formatDateVN } from '../../utils/formatters';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả đơn' },
  { key: 'CONFIRMED', label: 'Chờ tiếp nhận' },
  { key: 'IN_PRODUCTION', label: 'Đang gia công' },
  { key: 'UNDER_INSPECTION', label: 'Chờ nghiệm thu' },
  { key: 'READY_TO_DELIVER', label: 'Nghiệm thu đạt' },
  { key: 'COMPLETED', label: 'Hoàn tất' },
];

const getStatusBadge = (status, rejectReason) => {
  // Nếu IN_PRODUCTION có rejectReason => hiển thị đặc biệt
  if (status === 'IN_PRODUCTION' && rejectReason) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
        <AlertCircle className="h-3 w-3 shrink-0" />
        Làm lại (Nghiệm thu chưa đạt)
      </span>
    );
  }
  switch (status) {
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <Clock className="h-3 w-3 shrink-0" />
          Chờ tiếp nhận
        </span>
      );
    case 'IN_PRODUCTION':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          <Hammer className="h-3 w-3 shrink-0" />
          Đang gia công
        </span>
      );
    case 'UNDER_INSPECTION':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
          <Clock className="h-3 w-3 shrink-0" />
          Chờ Owner nghiệm thu
        </span>
      );
    case 'READY_TO_DELIVER':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Nghiệm thu đạt (Chờ giao)
        </span>
      );
    case 'DELIVERING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
          <Truck className="h-3 w-3 shrink-0" />
          Đang giao hàng
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Hoàn tất đơn
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
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
      const list = Array.isArray(res?.data) ? res.data : (res?.orders ?? []);
      setOrders(list);

      if (res?.meta) {
        setPagination({
          totalItems: res.meta.total ?? list.length,
          totalPages: res.meta.totalPages ?? 1,
          currentPage: res.meta.page ?? page,
          itemsPerPage: res.meta.limit ?? limit,
        });
      } else if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng của Tổ trưởng:', err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Không thể tải danh sách đơn hàng được phân công.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search, searchBy]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Phím tắt Esc đóng Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (detailModalOpen) setDetailModalOpen(false);
        if (progressModalOpen) setProgressModalOpen(false);
        if (inspectionModalOpen) setInspectionModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailModalOpen, progressModalOpen, inspectionModalOpen]);

  // Thống kê nhanh 4 chỉ số KPI tổng quan
  const stats = useMemo(() => {
    const total = pagination.totalItems || orders.length;
    const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length;
    const inProduction = orders.filter((o) => o.status === 'IN_PRODUCTION').length;
    const underInspection = orders.filter((o) => o.status === 'UNDER_INSPECTION').length;
    const readyToDeliver = orders.filter((o) => o.status === 'READY_TO_DELIVER').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    return {
      total,
      confirmed,
      inProduction,
      underInspection,
      readyToDeliver,
      completed,
    };
  }, [orders, pagination.totalItems]);

  const handleOpenDetail = async (order) => {
    try {
      setSelectedOrder(order);
      setDetailModalOpen(true);
      setLoadingDetail(true);
      const res = await getLeaderOrderDetail(order.orderId);
      const detail = res?.data ?? res?.order ?? null;
      if (detail) setSelectedOrder(detail);
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết đơn:', err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // 1. Tiếp nhận sản xuất
  const handleAcceptOrder = async (orderId) => {
    if (!window.confirm('Xác nhận tiếp nhận đơn hàng này vào dây chuyền sản xuất của xưởng?')) return;
    try {
      setActionLoading(true);
      const res = await leaderAcceptOrder(orderId);
      toast.success(res?.message || 'Đã tiếp nhận sản xuất! Đơn chuyển sang trạng thái Đang gia công.');
      fetchOrders();
      if (selectedOrder && selectedOrder.orderId === orderId) {
        const updatedOrder = res?.data ?? res?.order;
        setSelectedOrder((prev) => updatedOrder || { ...prev, status: 'IN_PRODUCTION' });
      }
    } catch (err) {
      console.error('Lỗi khi tiếp nhận đơn:', err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Không thể tiếp nhận đơn hàng.');
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
      const res = await leaderUpdateProgress(selectedOrder.orderId, {
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
        const updatedOrder = res?.data ?? res?.order;
        setSelectedOrder((prev) => updatedOrder || { ...prev, isProductionCompleted: progressIsCompleted });
      }
    } catch (err) {
      console.error('Lỗi cập nhật tiến độ:', err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Không thể cập nhật tiến độ.');
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
        const urls = Array.isArray(uploadRes?.data)
          ? uploadRes.data
          : (uploadRes?.data?.urls || uploadRes?.data?.images || uploadRes?.urls || uploadRes?.images || []);
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
      const res = await leaderSubmitInspection(selectedOrder.orderId, {
        note: inspectionNote.trim(),
        images: inspectionImages,
      });
      toast.success('Đã gửi yêu cầu nghiệm thu kèm hình ảnh lên Chủ xưởng thành công!');
      setInspectionModalOpen(false);
      setInspectionNote('');
      setInspectionImages([]);
      fetchOrders();
      if (selectedOrder) {
        const updatedOrder = res?.data ?? res?.order;
        setSelectedOrder((prev) => updatedOrder || { ...prev, status: 'UNDER_INSPECTION' });
      }
    } catch (err) {
      console.error('Lỗi khi gửi nghiệm thu:', err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Không thể gửi yêu cầu nghiệm thu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Đếm đơn bị reject cần xử lý
  const rejectedCount = orders.filter((o) => o.status === 'IN_PRODUCTION' && o.rejectReason).length;

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER & HÀNH ĐỘNG CHÍNH ──────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Hammer className="h-6 w-6 text-amber-900" />
            <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
              Quản Lý Sản Xuất Đơn Hàng
            </h1>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              Tổ Trưởng Xưởng
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Tiếp nhận đơn hàng được Chủ xưởng giao, bám sát bản vẽ kỹ thuật đã chốt, gia công và gửi nghiệm thu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 disabled:opacity-50 ${focusRing}`}
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 2. THỐNG KÊ TỔNG QUAN (4 CARDS) ───────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số đơn */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Tổng đơn được giao</span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-stone-900 sm:text-2xl">
            {stats.total}
            <span className="ml-1.5 text-xs font-sans font-normal text-stone-400">đơn</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Toàn bộ đơn hàng tổ trưởng phụ trách
          </div>
        </div>

        {/* Chờ tiếp nhận */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs transition hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Chờ tiếp nhận</span>
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-amber-900 sm:text-2xl">
            {stats.confirmed}
            <span className="ml-1.5 text-xs font-sans font-normal text-amber-700/70">đơn</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700/80">
            Chờ đưa vào dây chuyền sản xuất
          </div>
        </div>

        {/* Đang gia công */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 shadow-xs transition hover:border-amber-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Đang gia công</span>
            <div className="rounded-lg bg-amber-200/60 p-1.5 text-amber-900">
              <Hammer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-amber-950 sm:text-2xl">
            {stats.inProduction}
            <span className="ml-1.5 text-xs font-sans font-normal text-amber-800">trong xưởng</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-800">
            {rejectedCount > 0 ? `${rejectedCount} đơn cần khắc phục làm lại` : 'Đang chế tác tại xưởng mộc'}
          </div>
        </div>

        {/* Hoàn thành / Nghiệm thu */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Thành phẩm hoàn tất</span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-emerald-900 sm:text-2xl">
            {stats.completed}
            <span className="ml-1.5 text-xs font-sans font-normal text-emerald-700/70">thành phẩm</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700/80">
            Đã nghiệm thu / hoàn tất
          </div>
        </div>
      </section>

      {/* ── Cảnh báo toàn trang nếu có đơn bị reject ── */}
      {rejectedCount > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-rose-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-900">
              {rejectedCount} đơn hàng nghiệm thu CHƯA ĐẠT — cần khắc phục và gửi lại
            </p>
            <p className="text-xs text-rose-700 mt-0.5">
              Chủ xưởng đã từ chối nghiệm thu. Vui lòng xem chi tiết lý do, khắc phục và gửi lại yêu cầu nghiệm thu.
            </p>
          </div>
        </div>
      )}

      {/* ── 3. TABS TRẠNG THÁI (PILL TABS CÓ COUNT) ───────────── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-3">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          let count = stats.total;
          if (tab.key === 'CONFIRMED') count = stats.confirmed;
          if (tab.key === 'IN_PRODUCTION') count = stats.inProduction;
          if (tab.key === 'UNDER_INSPECTION') count = stats.underInspection;
          if (tab.key === 'READY_TO_DELIVER') count = stats.readyToDeliver;
          if (tab.key === 'COMPLETED') count = stats.completed;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${focusRing} ${isActive
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${isActive
                    ? 'bg-stone-800 text-stone-200'
                    : 'bg-stone-100 text-stone-600'
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. THANH TÌM KIẾM & BỘ LỌC ────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
            <div className="w-full sm:w-48">
              <select
                aria-label="Tiêu chí tìm kiếm"
                value={searchBy}
                onChange={(e) => { setSearchBy(e.target.value); setPage(1); }}
                className={`w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-3 pr-8 text-xs font-semibold text-stone-800 transition focus:border-stone-900 focus:bg-white focus:outline-none ${focusRing}`}
              >
                <option value="ALL">Tất cả tiêu chí</option>
                <option value="CUSTOMER_NAME">Tên khách hàng</option>
                <option value="ORDER_CODE">Mã đơn hàng</option>
                <option value="PHONE">Số điện thoại</option>
              </select>
            </div>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={
                  searchBy === 'ORDER_CODE' ? 'Nhập mã đơn hàng (ví dụ: ORD-20261114-0001)...' :
                    searchBy === 'CUSTOMER_NAME' ? 'Nhập họ tên khách hàng...' :
                      searchBy === 'PHONE' ? 'Nhập số điện thoại khách...' :
                        'Tìm theo mã đơn hàng, tên khách, số điện thoại...'
                }
                className={`w-full rounded-lg border border-stone-200 py-2 pl-9 pr-8 text-xs text-stone-900 placeholder-stone-400 transition focus:border-stone-900 focus:outline-none ${focusRing}`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {(search || statusFilter !== 'ALL' || searchBy !== 'ALL') && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchBy('ALL'); setStatusFilter('ALL'); setPage(1); }}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-rose-600 transition"
            >
              <X className="h-3.5 w-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
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
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
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
                          className={`inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 shadow-2xs transition hover:bg-stone-50 active:bg-stone-100 ${focusRing}`}
                        >
                          <Eye className="h-3 w-3 text-stone-500" />
                          Xem chi tiết
                        </button>

                        {/* Tiếp nhận */}
                        {o.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleAcceptOrder(o.orderId)}
                            disabled={actionLoading}
                            className={`inline-flex items-center gap-1 rounded-lg bg-amber-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-amber-950 active:bg-amber-950 disabled:opacity-50 ${focusRing}`}
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
                              className={`inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:bg-stone-100 ${focusRing}`}
                            >
                              {o.isProductionCompleted ? <CheckSquare className="h-3 w-3 text-emerald-700" /> : <Square className="h-3 w-3 text-stone-400" />}
                              Tiến độ
                            </button>
                            <button
                              onClick={() => handleOpenInspectionModal(o)}
                              className={`inline-flex items-center gap-1 rounded-lg bg-amber-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-amber-950 active:bg-amber-950 ${focusRing}`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl my-8">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Hammer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 sm:text-lg">
                    Bản vẽ kỹ thuật & Thông số gia công #{selectedOrder.orderCode}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                    <span>Khách hàng: <strong className="text-stone-700">{selectedOrder.contactName}</strong></span>
                    {selectedOrder.contractCode && <span>• Hợp đồng: <strong className="font-mono text-amber-900">{selectedOrder.contractCode}</strong></span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className={`rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition ${focusRing}`}
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <RotateCw className="h-6 w-6 animate-spin text-amber-900" />
              </div>
            ) : (
              <div className="overflow-y-auto p-6 text-xs text-stone-800 space-y-4">
                {/* Banner cảnh báo nghiệm thu thất bại */}
                {selectedOrder.rejectReason && selectedOrder.status === 'IN_PRODUCTION' && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 flex items-start gap-2.5 shadow-2xs">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-700 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900">⚠️ Nghiệm thu KHÔNG ĐẠT — Cần khắc phục và gửi lại</p>
                      <p className="mt-1 text-rose-800">
                        <span className="font-semibold">Lý do từ Chủ xưởng:</span> {selectedOrder.rejectReason}
                      </p>
                      <p className="mt-1 text-rose-700">
                        Vui lòng khắc phục theo yêu cầu, sau đó nhấn "Gửi lại nghiệm thu" để nộp lại cho Chủ xưởng kiểm tra.
                      </p>
                    </div>
                  </div>
                )}

                {/* Banner bản vẽ đã khóa */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-center gap-2 text-amber-900 shadow-2xs">
                  <FileCheck className="h-5 w-5 shrink-0 text-amber-900" />
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
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
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
                  <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                    <p className="font-semibold text-stone-900">📐 Yêu cầu thiết kế: {selectedOrder.requestTitle}</p>
                    {selectedOrder.requestDescription && (
                      <p className="mt-1 text-stone-700">{selectedOrder.requestDescription}</p>
                    )}
                  </div>
                )}

                {/* Bảng sản phẩm kỹ thuật */}
                <div>
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-900" /> Chi tiết từng sản phẩm cần gia công
                  </h4>
                  <div className="rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left">
                      <thead className="bg-stone-50 text-stone-700 font-semibold border-b border-stone-200">
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
                                    <span className="ml-1 rounded bg-stone-100 px-1 py-0.5 text-[10px] text-stone-700">{it.roomName}</span>
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
                                <td className="px-3 py-2 font-mono text-stone-900 font-bold">
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
            <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50/80 px-6 py-4">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className={`rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:bg-stone-100 ${focusRing}`}
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {selectedOrder.status === 'CONFIRMED' && (
                  <button
                    type="button"
                    onClick={() => handleAcceptOrder(selectedOrder.orderId)}
                    disabled={actionLoading}
                    className={`inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-5 py-2 font-bold text-white shadow-2xs transition hover:bg-amber-950 active:bg-amber-950 disabled:opacity-50 ${focusRing}`}
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
                      className={`rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:bg-stone-100 ${focusRing}`}
                    >
                      {selectedOrder.isProductionCompleted ? '✅ Cập nhật tiến độ' : '📋 Cập nhật tiến độ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDetailModalOpen(false); handleOpenInspectionModal(selectedOrder); }}
                      className={`inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-5 py-2 font-bold text-white shadow-2xs transition hover:bg-amber-950 active:bg-amber-950 ${focusRing}`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Cập nhật tiến độ gia công #{selectedOrder.orderCode}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Đánh dấu hoàn tất chế tác gỗ hoặc cập nhật ghi chú xưởng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProgressModalOpen(false)}
                className={`rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition ${focusRing}`}
                aria-label="Đóng"
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
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold transition ${!progressIsCompleted
                        ? 'border-amber-800 bg-amber-50 text-amber-900 shadow-2xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      } ${focusRing}`}
                  >
                    <Square className={`h-4 w-4 ${!progressIsCompleted ? 'text-amber-800' : 'text-stone-400'}`} />
                    Chưa hoàn thành
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressIsCompleted(true)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold transition ${progressIsCompleted
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      } ${focusRing}`}
                  >
                    <CheckSquare className={`h-4 w-4 ${progressIsCompleted ? 'text-emerald-700' : 'text-stone-400'}`} />
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
                  className={`w-full rounded-lg border border-stone-200 p-2.5 text-xs text-stone-900 placeholder-stone-400 transition focus:border-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-800 ${focusRing}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className={`rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:bg-stone-100 ${focusRing}`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`rounded-lg px-5 py-2 font-bold text-white shadow-2xs transition disabled:opacity-50 ${progressIsCompleted
                      ? 'bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-900'
                      : 'bg-amber-900 hover:bg-amber-950 active:bg-amber-950'
                    } ${focusRing}`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {selectedOrder.rejectReason ? 'Gửi lại nghiệm thu' : 'Nộp nghiệm thu sản phẩm'} #{selectedOrder.orderCode}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Đính kèm hình ảnh thành phẩm thực tế để Chủ xưởng nghiệm thu chất lượng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectionModalOpen(false)}
                className={`rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition ${focusRing}`}
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Banner lý do reject nếu có */}
            {selectedOrder.rejectReason && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 flex items-start gap-2.5 text-xs shadow-2xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-700 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-900">Lý do nghiệm thu KHÔNG ĐẠT lần trước:</p>
                  <p className="text-rose-800 mt-0.5">{selectedOrder.rejectReason}</p>
                  <p className="text-rose-700 mt-1 italic">Vui lòng khắc phục và ghi rõ những cải thiện đã thực hiện trong ghi chú bên dưới.</p>
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
                  className={`w-full rounded-lg border border-stone-200 p-2.5 text-xs text-stone-900 placeholder-stone-400 transition focus:border-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-800 ${focusRing}`}
                />
              </div>

              {/* Khu vực Upload Ảnh Thành Phẩm */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  📸 Tải ảnh thành phẩm thực tế để Chủ xưởng thẩm định:
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <label className={`inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-2 font-semibold text-stone-800 transition hover:bg-stone-100 hover:border-amber-800 shadow-2xs ${focusRing}`}>
                    <Package className="h-4 w-4 text-amber-900" />
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
                    <span className="flex items-center gap-1 text-amber-900 text-xs">
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
                    className={`flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 transition focus:border-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-800 ${focusRing}`}
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    className={`rounded-lg border border-stone-200 bg-stone-100 px-3 py-1.5 font-semibold text-stone-700 transition hover:bg-stone-200 active:bg-stone-300 ${focusRing}`}
                  >
                    Thêm link
                  </button>
                </div>

                {/* Danh sách ảnh đã đính kèm */}
                {inspectionImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 max-h-40 overflow-y-auto">
                    {inspectionImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-stone-200 aspect-video bg-white shadow-2xs">
                        <img
                          src={img}
                          alt={`Thành phẩm ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 rounded-full bg-rose-700 p-1 text-white shadow-xs opacity-85 hover:opacity-100 transition"
                          title="Xóa ảnh này"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-center text-xs text-stone-400">
                    Chưa có ảnh nào được đính kèm. Khuyến khích chụp 1-3 góc để Chủ xưởng thẩm định nhanh chóng.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setInspectionModalOpen(false)}
                  className={`rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:bg-stone-100 ${focusRing}`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || uploadingPhotos}
                  className={`rounded-lg bg-amber-900 px-5 py-2 font-bold text-white shadow-2xs transition hover:bg-amber-950 active:bg-amber-950 disabled:opacity-50 ${focusRing}`}
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
