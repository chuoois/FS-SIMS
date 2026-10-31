// =========================================================
// OrdersPage.jsx
// Danh sách đơn hàng dành cho nhân viên kinh doanh (Role Sale)
// Sử dụng saleOrderService (Controller riêng biệt)
// =========================================================

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrders, getOrderById } from '../../services/saleOrderService';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchOrdersList = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await getOrders(params);
      setOrders(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchOrdersList();
  }, [fetchOrdersList]);

  const handleViewDetail = async (order) => {
    try {
      setModalOpen(true);
      setSelectedOrder(order);
      setLoadingDetail(true);
      const res = await getOrderById(order.orderId);
      if (res.data) setSelectedOrder(res.data);
    } catch (err) {
      console.error('Lỗi lấy chi tiết đơn hàng:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Danh Sách Đơn Hàng</h1>
            <p className="text-xs text-stone-500">
              Quản lý các đơn hàng tạo từ hợp đồng tại quầy và trực tuyến
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrdersList()}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Làm mới
          </button>
          <button
            onClick={() => navigate('/sale/create-order')}
            className="flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-900"
          >
            <Plus className="h-4 w-4" />
            Tạo đơn mới (POS)
          </button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn hàng, tên khách hàng, số điện thoại..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-stone-200 py-2 px-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="IN_PRODUCTION">Đang sản xuất</option>
            <option value="DELIVERING">Đang giao hàng</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Bảng đơn hàng */}
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
                    <p className="mt-2 text-xs">Đang tải danh sách đơn hàng...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-500">
                    <Package className="mx-auto h-8 w-8 text-stone-300" />
                    <p className="mt-2 font-medium">Chưa có đơn hàng nào</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-amber-900">{o.orderCode}</td>
                    <td className="px-4 py-3 font-mono text-stone-600">{o.contractCode || '---'}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{o.contactName}</td>
                    <td className="px-4 py-3 text-stone-600">{o.contactPhone}</td>
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
                        className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100"
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

        {pagination.totalPages > 1 && (
          <div className="border-t border-stone-200 p-3">
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              itemsPerPage={pagination.itemsPerPage}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Modal chi tiết đơn hàng */}
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
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200"
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
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-stone-900">{it.productName}</td>
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
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
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
