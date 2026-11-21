// =========================================================
// OrdersPage.jsx
// Quản lý danh sách đơn hàng dành cho nhân viên kinh doanh / chủ xưởng
// Hỗ trợ tìm kiếm theo Tên khách hàng, Mã đơn hàng, Số điện thoại
// Bộ lọc đa tiêu chí: Trạng thái, Loại đơn, Sắp xếp
// Thiết kế đồng bộ 100% với hệ thống Dashboard Owner
// =========================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  RotateCw,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  FileText,
  Calendar,
  X,
  Filter,
  User,
  Phone,
  MapPin,
  Layers,
  CreditCard,
  Image as ImageIcon,
  FileUp,
  Maximize2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getOrders,
  getOrderById,
  confirmOrderDelivery,
  completeOrderDelivery,
} from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVND = (val) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatDateVN = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
};

const formatDateTimeVN = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
};

const isOwnerDesignImg = (img) =>
  Boolean(
    img &&
      typeof img === 'object' &&
      (img.imageType === 'OWNER_DESIGN' ||
        img.isOwnerDesign ||
        (typeof img.createdBy === 'string' && img.createdBy.toUpperCase().includes('OWNER')) ||
        (typeof img.imageUrl === 'string' && img.imageUrl.includes('design_files')))
  );

const isPdfUrl = (url = '') =>
  typeof url === 'string' &&
  (url.toLowerCase().includes('.pdf') || url.includes('/raw/upload/'));

function parseOrderNote(note = '') {
  if (!note || typeof note !== 'string') return { textLines: [], inspectionImages: [] };
  const textLines = [];
  const inspectionImages = [];
  note.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const match = trimmed.match(/^\[Ảnh nghiệm thu\]:\s*(https?:\/\/\S+)/i);
    if (match) {
      inspectionImages.push(match[1]);
    } else {
      textLines.push(trimmed);
    }
  });
  return { textLines, inspectionImages };
}

function OrderDesignGallery({ images, badgeText, badgeClass, borderClass, emptyText, emptyClass, onPreview }) {
  if (!images || images.length === 0) {
    return <div className={emptyClass}>{emptyText}</div>;
  }
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {images.map((img, idx) => {
        const url = typeof img === 'string' ? img : img?.imageUrl;
        if (!url) return null;
        return isPdfUrl(url) ? (
          <a
            key={img.imageId || img.requestImageId || idx}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`group relative flex flex-col items-center justify-center rounded-lg border bg-white aspect-square p-2 text-center shadow-2xs transition ${borderClass}`}
          >
            <FileText className="h-6 w-6 text-rose-600" />
            <span className="mt-1 text-[10px] font-semibold text-stone-700">Mở file PDF</span>
            <span className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${badgeClass}`}>
              {badgeText}
            </span>
          </a>
        ) : (
          <div
            key={img.imageId || img.requestImageId || idx}
            className={`group relative overflow-hidden rounded-lg border bg-white aspect-square shadow-2xs transition ${borderClass}`}
          >
            <img
              src={url}
              alt={`${badgeText} ${idx + 1}`}
              className="h-full w-full cursor-pointer object-cover transition group-hover:scale-105"
              onClick={() => onPreview(url)}
            />
            <span className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${badgeClass}`}>
              {badgeText}
            </span>
            <button
              type="button"
              onClick={() => onPreview(url)}
              className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 text-white text-[11px] font-medium gap-1 transition"
              title="Phóng to"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Xem lớn
            </button>
          </div>
        );
      })}
    </div>
  );
}

const getStatusBadge = (status) => {
  switch (status) {
    case 'NEW':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 border border-stone-200">
          <Clock className="h-3.5 w-3.5" />
          Mới
        </span>
      );
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Đã xác nhận
        </span>
      );
    case 'IN_PRODUCTION':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
          <RotateCw className="h-3.5 w-3.5" />
          Đang sản xuất
        </span>
      );
    case 'READY_TO_DELIVER':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-800 border border-purple-200">
          <Truck className="h-3.5 w-3.5" />
          Sẵn sàng giao
        </span>
      );
    case 'DELIVERING':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-800 border border-purple-200">
          <Truck className="h-3.5 w-3.5" />
          Đang giao hàng
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Hoàn thành
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
          <XCircle className="h-3.5 w-3.5" />
          Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 border border-stone-200">
          {status}
        </span>
      );
  }
};

export const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── State Bộ tìm kiếm & Lọc ──────────────────────────────────
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('ALL'); // 'ALL' | 'CUSTOMER_NAME' | 'ORDER_CODE' | 'PHONE'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [deliveryActionLoading, setDeliveryActionLoading] = useState(false);

  const handleDeliverOrder = async (orderId) => {
    if (!window.confirm('Xác nhận bắt đầu xuất kho và giao đơn hàng này cho khách hàng?')) return;
    try {
      setDeliveryActionLoading(true);
      await confirmOrderDelivery(orderId);
      toast.success('Đã kích hoạt giao hàng! Đơn hàng chuyển sang trạng thái Đang giao hàng.');
      fetchOrdersList();
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: 'DELIVERING' }));
      }
    } catch (err) {
      console.error('Lỗi khi giao hàng:', err);
      toast.error(err.response?.data?.message || 'Không thể kích hoạt giao hàng.');
    } finally {
      setDeliveryActionLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    if (!window.confirm('Xác nhận khách hàng đã nhận đủ sản phẩm và hoàn tất thanh toán (COMPLETED)?')) return;
    try {
      setDeliveryActionLoading(true);
      await completeOrderDelivery(orderId);
      toast.success('Đã hoàn tất đơn hàng thành công (COMPLETED)!');
      fetchOrdersList();
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: 'COMPLETED' }));
      }
    } catch (err) {
      console.error('Lỗi khi hoàn tất đơn:', err);
      toast.error(err.response?.data?.message || 'Không thể hoàn tất đơn hàng.');
    } finally {
      setDeliveryActionLoading(false);
    }
  };

  // ── Phân trang ──────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // ── Modal Chi tiết ──────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  // ── Thống kê tổng quan nhanh ────────────────────────────────
  const stats = useMemo(() => {
    const total = pagination.totalItems || orders.length;
    const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length;
    const inProgress = orders.filter((o) =>
      ['IN_PRODUCTION', 'READY_TO_DELIVER', 'DELIVERING'].includes(o.status)
    ).length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    return { total, confirmed, inProgress, completed };
  }, [pagination.totalItems, orders]);

  // ── Đếm số lượng bộ lọc đang kích hoạt ────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (statusFilter !== 'ALL') count += 1;
    if (orderTypeFilter !== 'ALL') count += 1;
    if (sortBy !== 'NEWEST') count += 1;
    return count;
  }, [search, statusFilter, orderTypeFilter, sortBy]);

  // ── Đặt lại toàn bộ bộ lọc ───────────────────────────────────
  const handleResetFilters = () => {
    setSearch('');
    setSearchBy('ALL');
    setStatusFilter('ALL');
    setOrderTypeFilter('ALL');
    setSortBy('NEWEST');
    setPage(1);
  };

  // ── Gọi API lấy danh sách đơn hàng ───────────────────────────
  const fetchOrdersList = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit };

      // Xử lý từ khóa tìm kiếm theo chế độ
      if (search.trim()) {
        const keyword = search.trim();
        if (searchBy === 'ORDER_CODE') {
          params.order_code = keyword;
        } else if (searchBy === 'CUSTOMER_NAME') {
          params.customer_name = keyword;
        } else if (searchBy === 'PHONE') {
          params.search = keyword;
          params.search_by = 'PHONE';
        } else {
          params.search = keyword;
          params.search_by = 'ALL';
        }
      }

      // Xử lý bộ lọc trạng thái
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      // Xử lý bộ lọc loại đơn
      if (orderTypeFilter !== 'ALL') {
        params.order_type = orderTypeFilter;
      }

      // Xử lý sắp xếp
      if (sortBy !== 'NEWEST') {
        params.sort = sortBy;
      }

      const res = await getOrders(params);
      setOrders(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, searchBy, statusFilter, orderTypeFilter, sortBy]);

  // Debounce gọi API khi người dùng nhập từ khóa tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrdersList();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchOrdersList]);

  // ── Mở modal xem chi tiết đơn hàng ──────────────────────────
  const handleViewDetail = async (order) => {
    try {
      setModalOpen(true);
      setSelectedOrder(order);
      setLoadingDetail(true);
      const res = await getOrderById(order.orderId);
      if (res.data) setSelectedOrder(res.data);
    } catch (err) {
      console.error('Lỗi lấy chi tiết đơn hàng:', err);
      toast.error('Không thể tải chi tiết đơn hàng');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Placeholder tìm kiếm linh hoạt theo chế độ chọn
  const searchPlaceholder = useMemo(() => {
    switch (searchBy) {
      case 'ORDER_CODE':
        return 'Nhập mã đơn hàng cần tìm (ví dụ: ORD-20261028-0001)...';
      case 'CUSTOMER_NAME':
        return 'Nhập họ tên khách hàng cần tìm (ví dụ: Nguyễn Văn A)...';
      case 'PHONE':
        return 'Nhập số điện thoại khách hàng...';
      default:
        return 'Tìm theo tên khách hàng, mã đơn hàng hoặc số điện thoại...';
    }
  }, [searchBy]);

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề & Nút thao tác ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Quản Lý Đơn Hàng
          </h1>
          <p className="text-sm text-stone-500">
            Tra cứu, lọc và theo dõi tiến độ các đơn hàng bán lẻ tại quầy và trực tuyến
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchOrdersList()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => navigate('/sale/create-order')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo đơn mới tại quầy</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (Cards) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số đơn hàng */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-500">Tổng đơn hàng</span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{stats.total}</span>
            <span className="text-xs text-stone-400">đơn</span>
          </div>
        </div>

        {/* Đã xác nhận */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">Đã xác nhận</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">{stats.confirmed}</span>
            <span className="text-xs text-amber-600">chờ xử lý</span>
          </div>
        </div>

        {/* Đang sản xuất & Giao */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Đang giao & xử lý</span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">{stats.inProgress}</span>
            <span className="text-xs text-blue-600">trong tiến trình</span>
          </div>
        </div>

        {/* Hoàn thành */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Hoàn thành</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{stats.completed}</span>
            <span className="text-xs text-emerald-600">đã giao khách</span>
          </div>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ─────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Dropdown tiêu chí + Ô tìm kiếm */}
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-48">
              <select
                aria-label="Tiêu chí tìm kiếm"
                value={searchBy}
                onChange={(e) => {
                  setSearchBy(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
              >
                <option value="ALL">🔍 Tất cả tiêu chí</option>
                <option value="CUSTOMER_NAME">👤 Tên khách hàng</option>
                <option value="ORDER_CODE">🏷️ Mã đơn hàng</option>
                <option value="PHONE">📞 Số điện thoại</option>
              </select>
            </div>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  title="Xóa từ khóa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lọc Trạng thái, Loại đơn, Sắp xếp */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="IN_PRODUCTION">Đang sản xuất</option>
              <option value="DELIVERING">Đang giao hàng</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            <select
              aria-label="Lọc loại đơn hàng"
              value={orderTypeFilter}
              onChange={(e) => {
                setOrderTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            >
              <option value="ALL">Tất cả loại đơn</option>
              <option value="READY">Hàng có sẵn</option>
              <option value="CUSTOM">Đặt theo yêu cầu</option>
            </select>

            <select
              aria-label="Sắp xếp danh sách"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            >
              <option value="NEWEST">Mới nhất trước</option>
              <option value="OLDEST">Cũ nhất trước</option>
              <option value="AMOUNT_DESC">Giá trị cao nhất</option>
              <option value="AMOUNT_ASC">Giá trị thấp nhất</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition shadow-sm"
              >
                Xóa bộ lọc ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Thông tin tóm tắt kết quả */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100 mt-3">
          <span>
            Tìm thấy <strong className="font-bold text-stone-900">{pagination.totalItems}</strong> đơn hàng
            {search.trim() && (
              <span>
                {' '}cho từ khóa &ldquo;<strong className="text-amber-900">{search.trim()}</strong>&rdquo;
              </span>
            )}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
          )}
        </div>
      </div>

      {/* ── Bảng danh sách đơn hàng ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sm:pl-6">Mã đơn</th>
                <th className="px-3 py-3.5">Hợp đồng</th>
                <th className="px-3 py-3.5">Khách hàng</th>
                <th className="px-3 py-3.5">Số điện thoại</th>
                <th className="px-3 py-3.5">Loại đơn</th>
                <th className="px-3 py-3.5 text-right">Tổng tiền</th>
                <th className="px-3 py-3.5 text-center">Trạng thái</th>
                <th className="px-3 py-3.5 text-center pr-4 sm:pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                    <p className="mt-2 text-xs">Đang tìm kiếm đơn hàng...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <Package className="mx-auto h-10 w-10 text-stone-300" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">
                      Không tìm thấy đơn hàng nào
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {activeFilterCount > 0
                        ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm "Xóa bộ lọc" để xem toàn bộ danh sách.'
                        : 'Hiện chưa có đơn hàng nào trong hệ thống.'}
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        <X className="h-3.5 w-3.5" />
                        Xóa bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-amber-50/30 transition">
                    <td className="py-3.5 pl-4 pr-3 sm:pl-6 font-mono font-bold text-amber-900">
                      {o.orderCode}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-stone-600">
                      {o.contractCode || '—'}
                    </td>
                    <td className="px-3 py-3.5 font-semibold text-stone-900">
                      {o.contactName}
                    </td>
                    <td className="px-3 py-3.5 text-stone-600">
                      {o.contactPhone}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 border border-stone-200">
                        {o.orderType === 'READY' ? 'Hàng sẵn' : 'Đặt làm'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold text-stone-900">
                      {formatVND(o.totalAmount)}
                    </td>
                    <td className="px-3 py-3.5 text-center">{getStatusBadge(o.status)}</td>
                    <td className="px-3 py-3.5 text-center pr-4 sm:pr-6">
                      <button
                        onClick={() => handleViewDetail(o)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition"
                        title="Xem chi tiết đơn hàng"
                      >
                        <Eye className="h-3.5 w-3.5 text-stone-500" />
                        <span>Chi tiết</span>
                      </button>
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
          itemLabel="đơn hàng"
          loading={loading}
        />
      </div>

      {/* ── Modal Chi tiết Đơn hàng ──────────────────────────── */}
      {modalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    Chi tiết đơn hàng — {selectedOrder.orderCode}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                    <span>Loại: {selectedOrder.orderType === 'CUSTOM' ? 'Đặt theo yêu cầu' : 'Hàng có sẵn'}</span>
                    {selectedOrder.contractCode && <span>• Hợp đồng: {selectedOrder.contractCode}</span>}
                    {selectedOrder.requestCode && <span>• Yêu cầu: {selectedOrder.requestCode}</span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-6">
              {/* Trạng thái & Tiến trình */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4 border border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-500">Trạng thái hiện tại:</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  {selectedOrder.createdAt && (
                    <span>Ngày tạo: {formatDateTimeVN(selectedOrder.createdAt)}</span>
                  )}
                  {selectedOrder.expectedDate && (
                    <span className="font-medium text-stone-700">
                      • Giao dự kiến: {formatDateVN(selectedOrder.expectedDate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin Khách hàng & Phụ trách */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thông tin khách hàng */}
                <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-amber-700" />
                    Thông tin người nhận
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-semibold text-stone-900">{selectedOrder.contactName || '—'}</p>
                    <p className="text-stone-600 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      <span>{selectedOrder.contactPhone || '—'}</span>
                    </p>
                    <p className="text-stone-600 flex items-start gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <span>{selectedOrder.deliveryAddress || 'Nhận tại quầy'}</span>
                    </p>
                  </div>
                </div>

                {/* Phụ trách & Tiến độ */}
                <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-700" />
                    Tiến độ & Giao nhận
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Nhân viên bán hàng:</span>
                      <span className="font-medium text-stone-800">{selectedOrder.staffName || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Giao dự kiến:</span>
                      <span className="text-stone-800">{formatDateVN(selectedOrder.expectedDate)}</span>
                    </div>
                    {selectedOrder.deliveredDate && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Ngày giao thực tế:</span>
                        <span className="font-medium text-emerald-700">{formatDateVN(selectedOrder.deliveredDate)}</span>
                      </div>
                    )}
                    {selectedOrder.requestCode && (
                      <div className="flex justify-between text-xs pt-1 border-t border-stone-100">
                        <span className="text-stone-500">Mã yêu cầu gốc:</span>
                        <span className="font-mono text-stone-800">{selectedOrder.requestCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tình trạng thanh toán */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-800" />
                  Tình trạng thanh toán
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-xs text-stone-500 block">Tổng giá trị đơn</span>
                    <span className="text-base font-bold text-stone-900">{formatVND(selectedOrder.totalAmount)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-xs text-stone-500 block">Tiền đặt cọc</span>
                    <span className="text-base font-semibold text-stone-800">{formatVND(selectedOrder.depositAmount)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-xs text-stone-500 block">Đã thanh toán</span>
                    <span className="text-base font-semibold text-emerald-700">{formatVND(selectedOrder.paidAmount)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-xs text-stone-500 block">Còn lại cần thu</span>
                    <span className="text-base font-bold text-rose-600">{formatVND(selectedOrder.remainingAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Ghi chú & Ảnh nghiệm thu */}
              {(() => {
                const { textLines, inspectionImages } = parseOrderNote(selectedOrder.note);
                if (textLines.length === 0 && inspectionImages.length === 0 && !selectedOrder.requestDescription) return null;
                return (
                  <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-amber-700" />
                      Ghi chú đơn hàng & Nghiệm thu
                    </h3>
                    {selectedOrder.requestDescription && (
                      <div className="text-xs text-stone-700 bg-stone-50 rounded-lg p-3 border border-stone-200">
                        <span className="font-semibold text-stone-800 block mb-0.5">Yêu cầu từ khách:</span>
                        <p className="whitespace-pre-line">{selectedOrder.requestDescription}</p>
                      </div>
                    )}
                    {textLines.length > 0 && (
                      <div className="text-xs text-stone-700 bg-stone-50 rounded-lg p-3 border border-stone-200 space-y-1">
                        <span className="font-semibold text-stone-800 block mb-0.5">Ghi chú sản xuất:</span>
                        {textLines.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}
                    {inspectionImages.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-stone-600 block mb-1.5">Ảnh nghiệm thu từ xưởng:</span>
                        <div className="flex flex-wrap gap-2">
                          {inspectionImages.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImg(url)}
                              className="group relative h-20 w-24 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 shadow-2xs"
                              title="Phóng to ảnh nghiệm thu"
                            >
                              <img
                                src={url}
                                alt={`Ảnh nghiệm thu ${idx + 1}`}
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Danh sách sản phẩm & Hồ sơ thiết kế trong đơn */}
              <div
                className={`rounded-xl p-4 space-y-4 ${
                  selectedOrder.orderType === 'CUSTOM'
                    ? 'border-2 border-amber-300 bg-amber-50/40'
                    : 'border border-stone-200 bg-stone-50/40'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-amber-700" />
                    Sản phẩm trong đơn ({(selectedOrder.items || []).length})
                  </h3>
                  {(() => {
                    const totalOwnerDesigns =
                      (selectedOrder.items || []).reduce(
                        (s, it) => s + (it.images || []).filter(isOwnerDesignImg).length,
                        0
                      ) + (selectedOrder.images || []).filter(isOwnerDesignImg).length;
                    return totalOwnerDesigns > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Đã có {totalOwnerDesigns} bản vẽ xưởng
                      </span>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-3.5">
                  {(selectedOrder.items || []).map((it, idx) => {
                    const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' × ');
                    const itemImages = Array.isArray(it.images) ? it.images : [];
                    const directCustomerImgs = itemImages.filter((img) => !isOwnerDesignImg(img));
                    const generalCustomerImgs = (selectedOrder.images || []).filter((img) => !isOwnerDesignImg(img));
                    const customerImgs = directCustomerImgs.length > 0 ? directCustomerImgs : generalCustomerImgs;
                    const ownerImgs = itemImages.filter(isOwnerDesignImg);
                    const isCustomOrder = selectedOrder.orderType === 'CUSTOM' || itemImages.length > 0;

                    return (
                      <div key={it.orderItemId || idx} className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-stone-100">
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-bold text-xs text-amber-800">
                              #{idx + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-stone-900">
                                {it.productName}
                                {it.productCode && (
                                  <span className="ml-1.5 text-xs font-mono font-normal text-stone-500">
                                    ({it.productCode})
                                  </span>
                                )}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-0.5">
                                <span>
                                  Kích thước:{' '}
                                  <strong className="text-stone-700 font-mono">
                                    {dim ? `${dim} cm` : 'Theo thiết kế'}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  SL: <strong className="text-stone-700">{it.quantity}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Đơn giá: <strong className="text-stone-700">{formatVND(it.unitPrice)}</strong>
                                </span>
                                {it.materialName && (
                                  <>
                                    <span>•</span>
                                    <span>Chất liệu: <strong className="text-stone-700">{it.materialName}</strong></span>
                                  </>
                                )}
                                {it.colorName && (
                                  <>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1">
                                      Màu sắc:
                                      {it.colorHex && (
                                        <span
                                          className="inline-block h-2.5 w-2.5 rounded-full border border-stone-300"
                                          style={{ backgroundColor: it.colorHex }}
                                        />
                                      )}
                                      <strong className="text-stone-700">{it.colorName}</strong>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] text-stone-400 block">Thành tiền</span>
                            <span className="text-sm font-bold text-amber-900">
                              {formatVND(it.totalPrice)}
                            </span>
                          </div>
                        </div>

                        {it.description && (
                          <div className="rounded-lg bg-stone-50 border border-stone-200 p-2.5 text-xs text-stone-700">
                            <span className="font-semibold text-stone-800 block mb-0.5">Mô tả kỹ thuật:</span>
                            <p className="whitespace-pre-line">{it.description}</p>
                          </div>
                        )}

                        {isCustomOrder ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-sky-100">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                                    <ImageIcon className="h-3 w-3" />
                                  </span>
                                  <h5 className="text-xs font-bold text-sky-950 uppercase tracking-wide">
                                    Ảnh mẫu khách gửi
                                  </h5>
                                </div>
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                  {customerImgs.length} ảnh
                                </span>
                              </div>
                              <OrderDesignGallery
                                images={customerImgs}
                                badgeText={directCustomerImgs.length === 0 && customerImgs.length > 0 ? 'Khách gửi (Chung)' : 'Khách gửi'}
                                badgeClass="bg-sky-700/90"
                                borderClass="border-sky-200 hover:border-sky-400"
                                emptyText="Không có ảnh mẫu tham khảo."
                                emptyClass="rounded-lg border border-dashed border-sky-200 bg-sky-50/60 p-3 text-center text-xs text-sky-600"
                                onPreview={setPreviewImg}
                              />
                            </div>

                            <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-3 space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/80">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-900">
                                    <FileUp className="h-3 w-3" />
                                  </span>
                                  <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                                    Bản vẽ thiết kế của Chủ xưởng
                                  </h5>
                                </div>
                                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                  {ownerImgs.length} bản vẽ
                                </span>
                              </div>
                              <OrderDesignGallery
                                images={ownerImgs}
                                badgeText="Bản vẽ xưởng"
                                badgeClass="bg-amber-800/90"
                                borderClass="border-amber-300 hover:border-amber-500"
                                emptyText="Chưa có bản vẽ thiết kế từ Chủ xưởng."
                                emptyClass="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-3 text-center text-xs text-amber-700"
                                onPreview={setPreviewImg}
                              />
                            </div>
                          </div>
                        ) : (
                          it.imageUrl && (
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => setPreviewImg(it.imageUrl)}
                                className="group relative h-14 w-14 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                                title="Xem ảnh sản phẩm"
                              >
                                <img
                                  src={it.imageUrl}
                                  alt={it.productName}
                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                />
                              </button>
                              <span className="text-xs text-stone-500">Hình ảnh sản phẩm mẫu niêm yết</span>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bản vẽ thiết kế chung ở cấp yêu cầu (nếu có) */}
                {(() => {
                  const generalOwnerImgs = (selectedOrder.images || []).filter(isOwnerDesignImg);
                  if (generalOwnerImgs.length === 0) return null;
                  return (
                    <div className="rounded-xl border border-amber-300 bg-white p-3.5 space-y-2">
                      <h4 className="text-xs font-bold uppercase text-amber-950 flex items-center gap-1.5">
                        <FileUp className="h-4 w-4 text-amber-700" />
                        Bản vẽ thiết kế chung từ Chủ xưởng ({generalOwnerImgs.length})
                      </h4>
                      <OrderDesignGallery
                        images={generalOwnerImgs}
                        badgeText="Bản vẽ xưởng"
                        badgeClass="bg-amber-800/90"
                        borderClass="border-amber-300 hover:border-amber-500"
                        emptyText=""
                        emptyClass=""
                        onPreview={setPreviewImg}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-6 py-4 bg-stone-50 rounded-b-2xl">
              <div>
                {selectedOrder.status === 'READY_TO_DELIVER' && (
                  <button
                    type="button"
                    disabled={deliveryActionLoading}
                    onClick={() => handleDeliverOrder(selectedOrder.orderId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 disabled:opacity-50 transition active:scale-95"
                  >
                    <Truck className="h-4 w-4" />
                    <span>Bắt đầu giao hàng</span>
                  </button>
                )}
                {selectedOrder.status === 'DELIVERING' && (
                  <button
                    type="button"
                    disabled={deliveryActionLoading}
                    onClick={() => handleCompleteOrder(selectedOrder.orderId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Hoàn tất đơn hàng</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox phóng to ảnh */}
      {previewImg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImg}
              alt="Phóng to hình ảnh"
              className="max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              aria-label="Đóng ảnh phóng to"
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-stone-800 shadow-xl hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
