// =========================================================
// OrdersPage.jsx
// Quản lý danh sách đơn hàng dành cho nhân viên kinh doanh / chủ xưởng
// Hỗ trợ tìm kiếm theo Tên khách hàng, Mã đơn hàng, Số điện thoại
// Bộ lọc đa tiêu chí: Trạng thái (Tabs), Loại đơn, Sắp xếp
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất)
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
  User,
  Phone,
  MapPin,
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
import { CustomerOrderStatusBadge } from '../../components/common/StatusBadge';

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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
      {images.map((img, idx) => {
        const url = typeof img === 'string' ? img : img?.imageUrl;
        if (!url) return null;
        return isPdfUrl(url) ? (
          <a
            key={img.imageId || img.requestImageId || idx}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`group relative flex flex-col items-center justify-center rounded-lg border bg-white aspect-square p-2 text-center shadow-xs transition hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${borderClass}`}
          >
            <FileText className="h-6 w-6 text-rose-600" />
            <span className="mt-1 text-[11px] font-semibold text-stone-700">Mở file PDF</span>
            <span className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${badgeClass}`}>
              {badgeText}
            </span>
          </a>
        ) : (
          <div
            key={img.imageId || img.requestImageId || idx}
            className={`group relative overflow-hidden rounded-lg border bg-white aspect-square shadow-xs transition ${borderClass}`}
          >
            <img
              src={url}
              alt={`${badgeText} ${idx + 1}`}
              className="h-full w-full cursor-pointer object-cover transition duration-150 group-hover:scale-105"
              onClick={() => onPreview(url)}
            />
            <span className={`absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${badgeClass}`}>
              {badgeText}
            </span>
            <button
              type="button"
              onClick={() => onPreview(url)}
              className="absolute inset-0 flex items-center justify-center bg-stone-900/50 opacity-0 group-hover:opacity-100 text-white text-xs font-medium gap-1.5 transition focus-visible:opacity-100 focus-visible:outline-none"
              title="Phóng to hình ảnh"
            >
              <Maximize2 className="h-4 w-4" /> Xem lớn
            </button>
          </div>
        );
      })}
    </div>
  );
}

const SEARCH_BY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả tiêu chí' },
  { value: 'CUSTOMER_NAME', label: 'Tên khách hàng' },
  { value: 'ORDER_CODE', label: 'Mã đơn hàng' },
  { value: 'PHONE', label: 'Số điện thoại' },
];

export const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── State Bộ tìm kiếm & Lọc ──────────────────────────────────
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [deliveryActionLoading, setDeliveryActionLoading] = useState(false);

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
  const [previewImg, setPreviewImg] = useState(null);

  // ── Thống kê tổng quan cho Tabs trạng thái ───────────────────
  const stats = useMemo(() => {
    const total = pagination.totalItems || orders.length;
    const confirmed = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'NEW').length;
    const inProduction = orders.filter((o) =>
      ['IN_PRODUCTION', 'UNDER_INSPECTION'].includes(o.status)
    ).length;
    const readyToDeliver = orders.filter((o) => o.status === 'READY_TO_DELIVER').length;
    const delivering = orders.filter((o) => o.status === 'DELIVERING').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
    return { total, confirmed, inProduction, readyToDeliver, delivering, completed, cancelled };
  }, [pagination.totalItems, orders]);

  // ── Đếm số lượng bộ lọc phụ đang kích hoạt ──────────────────
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

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (orderTypeFilter !== 'ALL') {
        params.order_type = orderTypeFilter;
      }

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

  // Phím tắt ESC đóng Modal / Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewImg) {
          setPreviewImg(null);
        } else if (modalOpen) {
          setModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImg, modalOpen]);

  // ── Mở modal xem chi tiết đơn hàng ──────────────────────────
  const handleViewDetail = async (order) => {
    try {
      setModalOpen(true);
      setSelectedOrder(order);
      const res = await getOrderById(order.orderId);
      if (res.data) setSelectedOrder(res.data);
    } catch (err) {
      console.error('Lỗi lấy chi tiết đơn hàng:', err);
      toast.error('Không thể tải chi tiết đơn hàng');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    if (!window.confirm('Xác nhận khách hàng đã nhận đủ sản phẩm gỗ và hoàn tất thanh toán (COMPLETED)?')) return;
    try {
      setDeliveryActionLoading(true);
      await completeOrderDelivery(orderId);
      toast.success('Đã hoàn tất đơn hàng thành công!');
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
    <div className="space-y-6 text-stone-900">
      {/* ── 1. TIÊU ĐỀ TRANG ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Tra cứu, theo dõi tiến độ sản xuất và trạng thái giao hàng các đơn hàng đồ gỗ nội thất tại xưởng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchOrdersList()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/create-order')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo đơn tại quầy</span>
          </button>
        </div>
      </div>

      {/* ── 2. BỘ LỌC & TÌM KIẾM ─────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-4">
        {/* Tabs trạng thái đơn hàng kèm số lượng */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả đơn', count: stats.total },
            { key: 'CONFIRMED', label: 'Đã xác nhận', count: stats.confirmed },
            { key: 'IN_PRODUCTION', label: 'Đang sản xuất', count: stats.inProduction },
            { key: 'READY_TO_DELIVER', label: 'Sẵn sàng giao', count: stats.readyToDeliver },
            { key: 'DELIVERING', label: 'Đang giao', count: stats.delivering },
            { key: 'COMPLETED', label: 'Hoàn thành', count: stats.completed },
            { key: 'CANCELLED', label: 'Đã hủy', count: stats.cancelled },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${isActive
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono font-medium ${isActive ? 'bg-stone-700 text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thanh tìm kiếm & bộ lọc phụ */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Dropdown tiêu chí */}
          <div className="w-full lg:w-44 shrink-0">
            <select
              aria-label="Tiêu chí tìm kiếm"
              value={searchBy}
              onChange={(e) => {
                setSearchBy(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              {SEARCH_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ô nhập tìm kiếm */}
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
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus-visible:outline-none"
                title="Xóa từ khóa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc loại đơn & sắp xếp */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lọc loại đơn hàng"
              value={orderTypeFilter}
              onChange={(e) => {
                setOrderTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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
              className="rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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
                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                <X className="h-3.5 w-3.5" />
                <span>Đặt lại ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông tin tóm tắt kết quả */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs text-stone-500">
          <span>
            Hiển thị <strong className="font-semibold text-stone-800">{orders.length}</strong> trên tổng số{' '}
            <strong className="font-semibold text-stone-800">{pagination.totalItems}</strong> đơn hàng
            {search.trim() && (
              <span> với từ khóa &ldquo;<strong className="text-stone-900">{search.trim()}</strong>&rdquo;</span>
            )}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
          )}
        </div>
      </section>

      {/* ── 3. BẢNG DANH SÁCH ĐƠN HÀNG ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3 pl-4 pr-3 sm:pl-6">Mã đơn</th>
                <th className="px-3 py-3">Mã HĐ</th>
                <th className="px-3 py-3">Khách hàng</th>
                <th className="px-3 py-3">Số điện thoại</th>
                <th className="px-3 py-3">Sản phẩm</th>
                <th className="px-3 py-3">Loại đơn</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="px-3 py-3 text-right">Tổng tiền</th>
                <th className="px-3 py-3 text-center pr-4 sm:pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-stone-400" />
                    <p className="mt-2 text-xs">Đang tải danh sách đơn hàng...</p>
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
                        ? 'Thử thay đổi từ khóa hoặc nhấn "Đặt lại" để xem toàn bộ danh sách.'
                        : 'Hiện chưa có đơn hàng nào trong hệ thống.'}
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-stone-50 transition">
                    <td className="py-3.5 pl-4 pr-3 sm:pl-6 font-mono font-bold text-amber-900">
                      {o.orderCode}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-stone-600">
                      {o.contractCode || '—'}
                    </td>
                    <td className="px-3 py-3.5 font-medium text-stone-900">
                      {o.contactName}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-stone-600">
                      {o.contactPhone || '—'}
                    </td>
                    <td className="px-3 py-3.5 font-medium text-stone-900">
                      {o.items?.map((item) => item.productName).join(", ")}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 border border-stone-200">
                        {o.orderType === 'READY' ? 'Hàng có sẵn' : 'Hàng thiết kế'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CustomerOrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="font-mono font-semibold text-stone-900">
                        {formatVND(o.totalAmount)}
                      </div>

                      {o.remainingAmount > 0 ? (
                        <div className="mt-1 text-[11px] font-medium text-rose-600">
                          Còn lại: {formatVND(o.remainingAmount)}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] font-medium text-emerald-600">
                          Đã thanh toán đủ
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center pr-4 sm:pr-6">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        {o.status === 'READY_TO_DELIVER' && (
                          <button
                            type="button"
                            disabled={deliveryActionLoading}
                            onClick={() => handleCompleteOrder(o.orderId)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700"
                            title="Xác nhận hoàn tất đơn hàng"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Hoàn tất</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleViewDetail(o)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye className="h-3.5 w-3.5 text-stone-500" />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {!loading && orders.length > 0 && (
          <div className="p-3 border-t border-stone-200 bg-stone-50/50">
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
        )}
      </div>

      {/* ── 4. MODAL CHI TIẾT ĐƠN HÀNG ───────────────────────── */}
      {modalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-xl border border-stone-200 my-8 overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Chi tiết đơn hàng {selectedOrder.orderCode}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                  <span>Loại: {selectedOrder.orderType === 'CUSTOM' ? 'Hàng thiết kế' : 'Hàng có sẵn'}</span>
                  {selectedOrder.contractCode && <span>• Hợp đồng: <strong className="font-mono text-stone-700">{selectedOrder.contractCode}</strong></span>}
                  {selectedOrder.requestCode && <span>• Yêu cầu: <strong className="font-mono text-stone-700">{selectedOrder.requestCode}</strong></span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                aria-label="Đóng cửa sổ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-5 text-xs text-stone-800">
              {/* Trạng thái & Tiến trình */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-50 p-4 border border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700">Trạng thái:</span>
                  <CustomerOrderStatusBadge status={selectedOrder.status} />
                </div>
                <div className="flex items-center gap-3 text-stone-500">
                  {selectedOrder.createdAt && (
                    <span>Ngày tạo: <span className="font-mono text-stone-700">{formatDateTimeVN(selectedOrder.createdAt)}</span></span>
                  )}
                  {selectedOrder.expectedDate && (
                    <span>
                      • Giao dự kiến: <strong className="font-medium text-stone-800">{formatDateVN(selectedOrder.expectedDate)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin Khách hàng & Phụ trách */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thông tin người nhận */}
                <div className="rounded-lg border border-stone-200 p-4 space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-stone-600" />
                    Thông tin người nhận
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-stone-900 text-sm">{selectedOrder.contactName || '—'}</p>
                    <p className="text-stone-600 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      <span className="font-mono">{selectedOrder.contactPhone || '—'}</span>
                    </p>
                    <p className="text-stone-600 flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <span>{selectedOrder.deliveryAddress || 'Nhận trực tiếp tại xưởng'}</span>
                    </p>
                  </div>
                </div>

                {/* Phụ trách & Tiến độ */}
                <div className="rounded-lg border border-stone-200 p-4 space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-stone-600" />
                    Tiến độ & Giao nhận
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Nhân viên phụ trách:</span>
                      <span className="font-medium text-stone-800">{selectedOrder.staffName || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Ngày giao dự kiến:</span>
                      <span className="font-medium text-stone-800">{formatDateVN(selectedOrder.expectedDate)}</span>
                    </div>
                    {selectedOrder.deliveredDate && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Ngày giao thực tế:</span>
                        <span className="font-medium text-emerald-700">{formatDateVN(selectedOrder.deliveredDate)}</span>
                      </div>
                    )}
                    {selectedOrder.requestCode && (
                      <div className="flex justify-between pt-1 border-t border-stone-100">
                        <span className="text-stone-500">Mã yêu cầu gốc:</span>
                        <span className="font-mono text-stone-800">{selectedOrder.requestCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tình trạng thanh toán */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-stone-600" />
                  Tình trạng thanh toán
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Tổng giá trị đơn</span>
                    <span className="text-sm font-bold text-stone-900 font-mono mt-0.5 block">{formatVND(selectedOrder.totalAmount)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Tiền đặt cọc</span>
                    <span className="text-sm font-semibold text-stone-800 font-mono mt-0.5 block">{formatVND(selectedOrder.depositAmount)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Đã thanh toán</span>
                    <span className="text-sm font-semibold text-emerald-700 font-mono mt-0.5 block">{formatVND(selectedOrder.paidAmount)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Còn lại cần thu</span>
                    <span className="text-sm font-bold text-rose-600 font-mono mt-0.5 block">{formatVND(selectedOrder.remainingAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Ghi chú & Ảnh nghiệm thu */}
              {(() => {
                const { textLines, inspectionImages } = parseOrderNote(selectedOrder.note);
                if (textLines.length === 0 && inspectionImages.length === 0 && !selectedOrder.requestDescription) return null;
                return (
                  <div className="rounded-lg border border-stone-200 p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-stone-600" />
                      Ghi chú đơn hàng & Nghiệm thu xuất xưởng
                    </h3>
                    {selectedOrder.requestDescription && (
                      <div className="text-xs text-stone-700 bg-stone-50 rounded-lg p-3 border border-stone-200">
                        <span className="font-semibold text-stone-800 block mb-1">Mô tả yêu cầu từ khách:</span>
                        <p className="whitespace-pre-line">{selectedOrder.requestDescription}</p>
                      </div>
                    )}
                    {textLines.length > 0 && (
                      <div className="text-xs text-stone-700 bg-stone-50 rounded-lg p-3 border border-stone-200 space-y-1">
                        <span className="font-semibold text-stone-800 block mb-1">Ghi chú sản xuất:</span>
                        {textLines.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}
                    {inspectionImages.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-stone-700 block mb-2">Ảnh nghiệm thu từ xưởng:</span>
                        <div className="flex flex-wrap gap-2.5">
                          {inspectionImages.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImg(url)}
                              className="group relative h-20 w-24 overflow-hidden rounded-lg border border-stone-200 bg-stone-100 shadow-2xs hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
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

              {/* Danh sách sản phẩm trong đơn */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-200 pb-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-stone-600" />
                    Sản phẩm trong đơn ({(selectedOrder.items || []).length})
                  </h3>
                  {(() => {
                    const totalOwnerDesigns =
                      (selectedOrder.items || []).reduce(
                        (s, it) => s + (it.images || []).filter(isOwnerDesignImg).length,
                        0
                      ) + (selectedOrder.images || []).filter(isOwnerDesignImg).length;
                    return totalOwnerDesigns > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                        Đã có {totalOwnerDesigns} bản vẽ xưởng
                      </span>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-3">
                  {(selectedOrder.items || []).map((it, idx) => {
                    const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' × ');
                    const itemImages = Array.isArray(it.images) ? it.images : [];
                    const directCustomerImgs = itemImages.filter((img) => !isOwnerDesignImg(img));
                    const generalCustomerImgs = (selectedOrder.images || []).filter((img) => !isOwnerDesignImg(img));
                    const customerImgs = directCustomerImgs.length > 0 ? directCustomerImgs : generalCustomerImgs;
                    const ownerImgs = itemImages.filter(isOwnerDesignImg);
                    const isCustomOrder = selectedOrder.orderType === 'CUSTOM' || itemImages.length > 0;

                    return (
                      <div key={it.orderItemId || idx} className="rounded-lg border border-stone-200 bg-white p-3.5 space-y-2.5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-stone-100">
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-stone-100 font-mono text-xs font-semibold text-stone-700">
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-stone-900 text-xs">
                                {it.productName}
                                {it.productCode && (
                                  <span className="ml-1.5 font-mono text-[11px] font-normal text-stone-500">
                                    ({it.productCode})
                                  </span>
                                )}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-stone-500 mt-0.5">
                                <span>
                                  Kích thước:{' '}
                                  <strong className="text-stone-700 font-mono">
                                    {dim ? `${dim} cm` : 'Theo thiết kế'}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Số lượng: <strong className="text-stone-700 font-mono">{it.quantity}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Đơn giá: <strong className="text-stone-700 font-mono">{formatVND(it.unitPrice)}</strong>
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
                                      Màu:
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
                            <span className="text-[10px] text-stone-400 block">Thành tiền</span>
                            <span className="text-xs font-bold text-amber-900 font-mono">
                              {formatVND(it.totalPrice)}
                            </span>
                          </div>
                        </div>

                        {it.description && (
                          <div className="rounded-md bg-stone-50 border border-stone-200 p-2 text-xs text-stone-700">
                            <span className="font-semibold text-stone-800 block mb-0.5">Mô tả quy cách:</span>
                            <p className="whitespace-pre-line">{it.description}</p>
                          </div>
                        )}

                        {isCustomOrder ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-2.5 space-y-2">
                              <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                                <div className="flex items-center gap-1.5">
                                  <ImageIcon className="h-3.5 w-3.5 text-stone-600" />
                                  <h4 className="text-[11px] font-semibold text-stone-800 uppercase tracking-wide">
                                    Ảnh mẫu khách gửi
                                  </h4>
                                </div>
                                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                                  {customerImgs.length} ảnh
                                </span>
                              </div>
                              <OrderDesignGallery
                                images={customerImgs}
                                badgeText={directCustomerImgs.length === 0 && customerImgs.length > 0 ? 'Khách gửi (Chung)' : 'Khách gửi'}
                                badgeClass="bg-stone-800/90"
                                borderClass="border-stone-200 hover:border-stone-400"
                                emptyText="Không có ảnh mẫu tham khảo."
                                emptyClass="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-3 text-center text-[11px] text-stone-500"
                                onPreview={setPreviewImg}
                              />
                            </div>

                            <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-2.5 space-y-2">
                              <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                                <div className="flex items-center gap-1.5">
                                  <FileUp className="h-3.5 w-3.5 text-amber-800" />
                                  <h4 className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
                                    Bản vẽ thiết kế của xưởng
                                  </h4>
                                </div>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                  {ownerImgs.length} bản vẽ
                                </span>
                              </div>
                              <OrderDesignGallery
                                images={ownerImgs}
                                badgeText="Bản vẽ xưởng"
                                badgeClass="bg-amber-900/90"
                                borderClass="border-amber-200 hover:border-amber-400"
                                emptyText="Chưa có bản vẽ kỹ thuật từ xưởng."
                                emptyClass="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-3 text-center text-[11px] text-amber-700"
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
                                className="group relative h-12 w-12 overflow-hidden rounded-lg border border-stone-200 bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                                title="Xem ảnh sản phẩm"
                              >
                                <img
                                  src={it.imageUrl}
                                  alt={it.productName}
                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                />
                              </button>
                              <span className="text-xs text-stone-500">Hình ảnh sản phẩm tiêu chuẩn niêm yết</span>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bản vẽ thiết kế chung ở cấp yêu cầu */}
                {(() => {
                  const generalOwnerImgs = (selectedOrder.images || []).filter(isOwnerDesignImg);
                  if (generalOwnerImgs.length === 0) return null;
                  return (
                    <div className="rounded-lg border border-amber-200 bg-white p-3 space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-amber-950 flex items-center gap-1.5">
                        <FileUp className="h-4 w-4 text-amber-800" />
                        Bản vẽ kỹ thuật chung từ xưởng ({generalOwnerImgs.length})
                      </h4>
                      <OrderDesignGallery
                        images={generalOwnerImgs}
                        badgeText="Bản vẽ xưởng"
                        badgeClass="bg-amber-900/90"
                        borderClass="border-amber-200 hover:border-amber-400"
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-6 py-3.5 bg-stone-50">
              <div>
                {(selectedOrder.status === 'READY_TO_DELIVER' || selectedOrder.status === 'DELIVERING') && (
                  <button
                    type="button"
                    disabled={deliveryActionLoading}
                    onClick={() => handleCompleteOrder(selectedOrder.orderId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Hoàn tất đơn hàng</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
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
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImg}
              alt="Phóng to hình ảnh"
              className="max-h-[85vh] rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              aria-label="Đóng ảnh phóng to"
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-stone-800 shadow-xl hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
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
