// =========================================================
// OrdersPage.jsx
// Quản lý danh sách đơn hàng dành cho nhân viên kinh doanh / chủ xưởng
// Hỗ trợ tìm kiếm theo Tên khách hàng, Mã đơn hàng, Số điện thoại
// Bộ lọc đa tiêu chí: Trạng thái, Loại đơn, Sắp xếp
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
  ArrowUpDown,
  User,
  Hash,
  Phone,
  SlidersHorizontal,
  MapPin,
  Layers,
  CreditCard,
  Image as ImageIcon,
  FileUp,
  Maximize2,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrders, getOrderById, confirmOrderDelivery, completeOrderDelivery } from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVND = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);

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
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          Đã xác nhận
        </span>
      );
    case 'IN_PRODUCTION':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          <Clock className="h-3 w-3" />
          Đang sản xuất
        </span>
      );
    case 'READY_TO_DELIVER':
    case 'DELIVERING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
          <Truck className="h-3 w-3" />
          Đang giao hàng
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          Hoàn thành
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          <XCircle className="h-3 w-3" />
          Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-800">
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
    <div className="flex flex-col gap-5">
      {/* ── Header trang Quản lý Đơn Hàng ────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Quản Lý Đơn Hàng</h1>
            <p className="text-xs text-stone-500">
              Tra cứu, lọc và theo dõi tiến độ các đơn hàng bán lẻ tại quầy và trực tuyến
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrdersList()}
            title="Tải lại danh sách"
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Làm mới
          </button>
          <button
            onClick={() => navigate('/sale/create-order')}
            className="flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-900 transition"
          >
            <Plus className="h-4 w-4" />
            Tạo đơn mới (POS)
          </button>
        </div>
      </div>

      {/* ── Khu vực Tìm kiếm & Bộ lọc (Search & Filters) ────────── */}
      <div className="flex flex-col gap-3.5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        {/* Hàng 1: Thanh Tìm kiếm với Dropdown chọn tiêu chí */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Dropdown chọn tiêu chí tìm kiếm: Tên khách hàng, Mã đơn, Tất cả... */}
          <div className="w-full sm:w-52">
            <div className="relative">
              <select
                aria-label="Tiêu chí tìm kiếm"
                value={searchBy}
                onChange={(e) => {
                  setSearchBy(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-3 pr-8 text-xs font-semibold text-stone-800 focus:border-amber-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">🔍 Tất cả tiêu chí</option>
                <option value="CUSTOMER_NAME">👤 Tên khách hàng</option>
                <option value="ORDER_CODE">🏷️ Mã đơn hàng</option>
                <option value="PHONE">📞 Số điện thoại</option>
              </select>
            </div>
          </div>

          {/* Ô nhập từ khóa tìm kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-8 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Các Dropdown lọc trạng thái, loại đơn, sắp xếp và nút Đặt lại */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 mr-1">
              <Filter className="h-3.5 w-3.5 text-amber-700" />
              <span>Bộ lọc:</span>
            </div>

            {/* Lọc Trạng thái */}
            <select
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-200 py-1.5 px-3 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="IN_PRODUCTION">Đang sản xuất</option>
              <option value="DELIVERING">Đang giao hàng</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            {/* Lọc Loại đơn hàng */}
            <select
              aria-label="Lọc loại đơn hàng"
              value={orderTypeFilter}
              onChange={(e) => {
                setOrderTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-200 py-1.5 px-3 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">Tất cả loại đơn</option>
              <option value="READY">Hàng có sẵn</option>
              <option value="CUSTOM">Đặt làm theo thiết kế</option>
            </select>

            {/* Sắp xếp */}
            <select
              aria-label="Sắp xếp danh sách"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-200 py-1.5 px-3 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="NEWEST">Đơn mới nhất trước</option>
              <option value="OLDEST">Đơn cũ nhất trước</option>
              <option value="AMOUNT_DESC">Giá trị cao nhất</option>
              <option value="AMOUNT_ASC">Giá trị thấp nhất</option>
            </select>
          </div>

          {/* Nút Đặt lại bộ lọc (chỉ hiện hoặc nhấn được khi có bộ lọc hoạt động) */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
            >
              <X className="h-3.5 w-3.5 text-stone-500" />
              <span>Đặt lại bộ lọc</span>
              <span className="ml-1 rounded-full bg-amber-800 px-1.5 py-0.2 text-[10px] text-white">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>

        {/* Thông tin tóm tắt kết quả lọc */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
          <span>
            Tìm thấy <strong className="font-bold text-stone-900">{pagination.totalItems}</strong> đơn hàng
            {search.trim() && (
              <span>
                {' '}cho từ khóa &ldquo;<strong className="text-amber-900">{search.trim()}</strong>&rdquo;
                {searchBy === 'CUSTOMER_NAME' && ' (theo tên khách hàng)'}
                {searchBy === 'ORDER_CODE' && ' (theo mã đơn hàng)'}
                {searchBy === 'PHONE' && ' (theo số điện thoại)'}
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

      {/* ── Bảng danh sách đơn hàng ──────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="px-4 py-3">Mã đơn hàng</th>
                <th className="px-4 py-3">Hợp đồng</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Loại đơn</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                    <p className="mt-2 text-xs">Đang tìm kiếm đơn hàng...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-500">
                    <Package className="mx-auto h-10 w-10 text-stone-300" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">
                      Không tìm thấy đơn hàng nào
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {activeFilterCount > 0
                        ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm "Đặt lại bộ lọc" để xem toàn bộ danh sách.'
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
                  <tr key={o.orderId} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-amber-900">
                      {o.orderCode}
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-600">
                      {o.contractCode || '---'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900">
                      {o.contactName}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {o.contactPhone}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                        {o.orderType === 'READY' ? 'Hàng sẵn' : 'Đặt làm'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">
                      {formatVND(o.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(o.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetail(o)}
                        className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 shadow-sm hover:bg-stone-100 transition"
                      >
                        <Eye className="h-3 w-3 text-stone-500" />
                        Xem
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

      {/* ── Modal Chi tiết Đơn hàng (chuẩn UI ManageCustomerRequestsPage) ── */}
      {modalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Header sticky */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="h-5 w-5 text-amber-700" />
                <h2 className="text-lg font-bold text-stone-900">
                  Chi tiết đơn hàng #{selectedOrder.orderCode}
                </h2>
                {loadingDetail && (
                  <RotateCw className="h-4 w-4 animate-spin text-amber-700" title="Đang tải chi tiết..." />
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Mã đơn & Trạng thái */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
                <div>
                  <p className="text-xs text-stone-400">Mã đơn hàng</p>
                  <p className="font-mono text-base font-bold text-amber-800">
                    {selectedOrder.orderCode}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                      selectedOrder.orderType === 'CUSTOM'
                        ? 'bg-violet-50 text-violet-700 border-violet-200'
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    {selectedOrder.orderType === 'CUSTOM' ? 'Đặt theo yêu cầu' : 'Hàng có sẵn'}
                  </span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              {/* Thông tin khách hàng */}
              <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-amber-700" /> Thông tin khách hàng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-stone-400">Họ và tên</p>
                    <p className="font-medium text-stone-900">{selectedOrder.contactName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Số điện thoại</p>
                    <p className="font-medium text-stone-900 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      {selectedOrder.contactPhone || '—'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-stone-400">Địa chỉ giao hàng</p>
                    <p className="font-medium text-stone-900 flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <span>{selectedOrder.deliveryAddress || 'Nhận tại quầy'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Thông tin chung đơn hàng & Tiến độ */}
              <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-700" /> Thông tin chung đơn hàng & Tiến độ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-stone-400">Hợp đồng liên kết</p>
                    <p className="font-mono font-semibold text-amber-800">
                      {selectedOrder.contractCode || '—'}
                    </p>
                  </div>
                  {selectedOrder.requestCode && (
                    <div>
                      <p className="text-xs text-stone-400">Yêu cầu thiết kế gốc</p>
                      <p className="font-mono font-semibold text-stone-900">
                        {selectedOrder.requestCode}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-stone-400">Phụ trách gia công / giao</p>
                    <p className="font-medium text-stone-900">
                      {selectedOrder.staffName || 'Chưa phân công'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Ngày tạo đơn</p>
                    <p className="font-medium text-stone-900">
                      {formatDateTimeVN(selectedOrder.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Ngày hẹn giao</p>
                    <p className="font-medium text-stone-900">
                      {formatDateVN(selectedOrder.expectedDate)}
                    </p>
                  </div>
                  {selectedOrder.deliveredDate && (
                    <div>
                      <p className="text-xs text-stone-400">Ngày giao thực tế</p>
                      <p className="font-semibold text-emerald-700">
                        {formatDateVN(selectedOrder.deliveredDate)}
                      </p>
                    </div>
                  )}
                  {selectedOrder.requestTitle && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-xs text-stone-400">Tiêu đề yêu cầu thiết kế</p>
                      <p className="font-semibold text-stone-900">{selectedOrder.requestTitle}</p>
                    </div>
                  )}
                </div>

                {selectedOrder.requestDescription && (
                  <div>
                    <p className="text-xs text-stone-400 mb-1">Ghi chú yêu cầu của khách hàng</p>
                    <p className="text-sm text-stone-800 bg-stone-50 rounded-lg p-3 border border-stone-200 whitespace-pre-line">
                      {selectedOrder.requestDescription}
                    </p>
                  </div>
                )}

                {(() => {
                  const { textLines, inspectionImages } = parseOrderNote(selectedOrder.note);
                  if (textLines.length === 0 && inspectionImages.length === 0) return null;
                  return (
                    <div className="space-y-2 border-t border-stone-100 pt-3">
                      {textLines.length > 0 && (
                        <div>
                          <p className="text-xs text-stone-400 mb-1">Ghi chú đơn hàng & Sản xuất</p>
                          <div className="text-xs text-stone-800 bg-stone-50 rounded-lg p-3 border border-stone-200 space-y-1">
                            {textLines.map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {inspectionImages.length > 0 && (
                        <div>
                          <p className="text-xs text-stone-400 mb-1.5">Ảnh nghiệm thu từ xưởng</p>
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
              </div>

              {/* Tình trạng thanh toán */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-amber-950 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-700" /> Tình trạng thanh toán
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="text-xs text-stone-500 block">Tổng giá trị đơn</span>
                    <span className="mt-0.5 block text-base font-bold text-stone-900">
                      {formatVND(selectedOrder.totalAmount)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="text-xs text-stone-500 block">Tiền đặt cọc</span>
                    <span className="mt-0.5 block text-base font-semibold text-stone-800">
                      {formatVND(selectedOrder.depositAmount)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="text-xs text-stone-500 block">Đã thanh toán</span>
                    <span className="mt-0.5 block text-base font-semibold text-emerald-700">
                      {formatVND(selectedOrder.paidAmount)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="text-xs text-stone-500 block">Còn lại cần thu</span>
                    <span className="mt-0.5 block text-base font-bold text-rose-600">
                      {formatVND(selectedOrder.remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Khối sản phẩm & Hồ sơ thiết kế */}
              <div
                className={`rounded-xl p-5 space-y-4 ${
                  selectedOrder.orderType === 'CUSTOM'
                    ? 'border-2 border-amber-300 bg-amber-50/40'
                    : 'border border-stone-200 bg-stone-50/40'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-amber-700" />
                      Chi tiết sản phẩm & Thông số kỹ thuật ({(selectedOrder.items || []).length} món)
                    </h3>
                    {selectedOrder.orderType === 'CUSTOM' && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        Thông số kích thước, chất liệu, màu sắc và bản vẽ thiết kế đính kèm cho từng sản phẩm
                      </p>
                    )}
                  </div>
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

                <div className="space-y-4">
                  {(selectedOrder.items || []).map((it, idx) => {
                    const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' × ');
                    const itemImages = Array.isArray(it.images) ? it.images : [];
                    const directCustomerImgs = itemImages.filter((img) => !isOwnerDesignImg(img));
                    const generalCustomerImgs = (selectedOrder.images || []).filter((img) => !isOwnerDesignImg(img));
                    const customerImgs = directCustomerImgs.length > 0 ? directCustomerImgs : generalCustomerImgs;
                    const ownerImgs = itemImages.filter(isOwnerDesignImg);
                    const isCustomOrder = selectedOrder.orderType === 'CUSTOM' || itemImages.length > 0;

                    return (
                      <div key={it.orderItemId || idx} className="rounded-xl border border-stone-300 bg-white p-4 shadow-xs space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-stone-100">
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-bold text-xs text-amber-800">
                              #{idx + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-stone-900">
                                {it.productName}
                                {it.productCode && (
                                  <span className="ml-1.5 text-xs font-mono font-normal text-stone-500">
                                    ({it.productCode})
                                  </span>
                                )}
                              </h4>
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
                            <span className="text-sm font-extrabold text-amber-900">
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
                            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3.5 space-y-2">
                              <div className="flex items-center justify-between pb-2 border-b border-sky-100">
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

                            <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-3.5 space-y-2">
                              <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
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
                                className="group relative h-16 w-16 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
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

            {/* Footer sticky */}
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2.5 border-t border-stone-200 bg-white px-6 py-3.5">
              {selectedOrder.status === 'READY_TO_DELIVER' && (
                <button
                  type="button"
                  disabled={deliveryActionLoading}
                  onClick={() => handleDeliverOrder(selectedOrder.orderId)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 disabled:opacity-50 transition"
                >
                  <Truck className="h-4 w-4" />
                  Bắt đầu giao hàng
                </button>
              )}
              {selectedOrder.status === 'DELIVERING' && (
                <button
                  type="button"
                  disabled={deliveryActionLoading}
                  onClick={() => handleCompleteOrder(selectedOrder.orderId)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Hoàn tất đơn hàng
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
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
