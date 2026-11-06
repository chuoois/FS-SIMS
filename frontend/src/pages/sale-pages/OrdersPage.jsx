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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrders, getOrderById, confirmOrderDelivery, completeOrderDelivery } from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVND = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);

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
      fetchOrders();
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
      fetchOrders();
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

      {/* ── Modal Chi tiết Đơn hàng ──────────────────────────── */}
      {modalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-800" />
                <h3 className="text-base font-bold text-stone-900">
                  Chi tiết đơn hàng #{selectedOrder.orderCode}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 text-xs text-stone-800">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                <div>
                  <span className="text-stone-500">Khách hàng:</span>
                  <p className="font-semibold text-stone-900">{selectedOrder.contactName}</p>
                </div>
                <div>
                  <span className="text-stone-500">Số điện thoại:</span>
                  <p className="font-semibold text-stone-900">{selectedOrder.contactPhone}</p>
                </div>
                <div>
                  <span className="text-stone-500">Hợp đồng liên kết:</span>
                  <p className="font-mono font-semibold text-amber-800">
                    {selectedOrder.contractCode || '---'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">Trạng thái:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-stone-500">Địa chỉ giao:</span>
                  <p className="font-semibold text-stone-900">
                    {selectedOrder.deliveryAddress || 'Nhận tại quầy'}
                  </p>
                </div>
                {selectedOrder.staffName && (
                  <div className="col-span-2">
                    <span className="text-stone-500">Nhân viên phụ trách:</span>
                    <p className="font-semibold text-stone-900">{selectedOrder.staffName}</p>
                  </div>
                )}
              </div>

              <h4 className="mt-4 mb-2 font-bold text-stone-900">Sản phẩm trong đơn:</h4>
              <div className="rounded-lg border border-stone-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="px-3 py-2">Sản phẩm</th>
                      <th className="px-3 py-2 text-center">SL</th>
                      <th className="px-3 py-2 text-right">Đơn giá</th>
                      <th className="px-3 py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(selectedOrder.items || []).map((it, idx) => (
                      <tr key={it.orderItemId || idx}>
                        <td className="px-3 py-2 font-semibold text-stone-900">
                          {it.productName}
                          {it.productCode && (
                            <span className="ml-1 text-[10px] font-mono text-stone-500">
                              ({it.productCode})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-bold">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatVND(it.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-900">
                          {formatVND(it.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-stone-200 bg-stone-50/70 font-semibold">
                    <tr>
                      <td colSpan="3" className="px-3 py-2 text-right">Tổng tiền:</td>
                      <td className="px-3 py-2 text-right font-extrabold text-amber-900">
                        {formatVND(selectedOrder.totalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-3 py-2 text-right text-stone-600">Đã cọc:</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-800">
                        {formatVND(selectedOrder.depositAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-3 py-2 text-right text-stone-900">Còn lại:</td>
                      <td className="px-3 py-2 text-right font-extrabold text-stone-900">
                        {formatVND(selectedOrder.remainingAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
