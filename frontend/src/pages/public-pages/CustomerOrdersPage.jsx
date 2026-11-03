import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, RotateCw } from 'lucide-react';
import { getMyOrders } from '../../services/customerOrderService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN').format(date);
};

const statusNames = {
  NEW: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  IN_PRODUCTION: 'Đang sản xuất',
  READY_TO_DELIVER: 'Sẵn sàng giao',
  DELIVERING: 'Đang giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const statusClasses = {
  NEW: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  IN_PRODUCTION: 'bg-blue-100 text-blue-800',
  READY_TO_DELIVER: 'bg-violet-100 text-violet-800',
  DELIVERING: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status] || 'bg-stone-100 text-stone-700'}`}>
    {statusNames[status] || status}
  </span>
);

export const CustomerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getMyOrders({ page, limit: 10 })
      .then((response) => {
        if (cancelled) return;
        setOrders(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) setPagination(response.pagination);
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error('[CustomerOrdersPage] Không thể tải đơn hàng:', requestError);
        setError(requestError.response?.data?.message || 'Không thể tải đơn hàng. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  return (
    <>
      <section className="bg-stone-900 px-5 py-12 text-white md:py-16">
        <div className="mx-auto max-w-[1305px]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Tài khoản của bạn</p>
          <h1 className="mt-2 text-3xl font-light md:text-4xl">Đơn hàng của tôi</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">
            Theo dõi trạng thái, lịch giao dự kiến và thông tin các đơn hàng bạn đã đặt.
          </p>
          <nav aria-label="Breadcrumb" className="mt-5 flex items-center gap-2 text-xs text-stone-300">
            <Link to="/home" className="hover:text-white hover:underline">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-white">Đơn hàng của tôi</span>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-[1305px] px-5 py-10 lg:px-8" aria-label="Danh sách đơn hàng">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">Lịch sử mua hàng</p>
            <h2 className="mt-1 text-xl font-medium text-stone-900">
              {loading ? 'Đang tải đơn hàng...' : `${pagination.totalItems} đơn hàng`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 border border-stone-300 px-4 text-xs font-bold text-stone-700 hover:border-stone-900 disabled:opacity-50"
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4" aria-busy="true">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse border border-stone-200 bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 px-5 py-12 text-center" role="alert">
            <p className="text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-4 text-xs font-bold uppercase tracking-wider text-red-900 underline"
            >
              Thử lại
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="border border-stone-200 bg-white px-5 py-16 text-center">
            <ClipboardList className="mx-auto size-9 text-stone-300" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-medium text-stone-900">Bạn chưa có đơn hàng nào</h3>
            <p className="mt-2 text-sm text-stone-600">Các đơn hàng được tạo từ tài khoản sẽ hiển thị tại đây.</p>
            <Link
              to="/products"
              className="mt-6 inline-flex h-11 items-center bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-orange-700"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid gap-4">
              {orders.map((order) => {
                const itemCount = (order.items || []).reduce((count, item) => count + Number(item.quantity || 0), 0);
                return (
                  <li key={order.orderId} className="border border-stone-200 bg-white p-5 transition-shadow hover:shadow-sm sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-mono text-sm font-bold text-stone-900">{order.orderCode}</h3>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="mt-2 text-xs text-stone-500">
                          Đặt ngày {formatDate(order.createdAt)}
                          <span className="mx-2" aria-hidden="true">·</span>
                          {order.orderType === 'READY' ? 'Hàng có sẵn' : 'Đặt làm theo yêu cầu'}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs text-stone-500">Tổng giá trị</p>
                        <p className="mt-1 text-base font-bold text-stone-900">{formatVnd(order.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-4">
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-600">
                        <span>{itemCount} sản phẩm</span>
                        {order.expectedDate && <span>Dự kiến giao: {formatDate(order.expectedDate)}</span>}
                        {order.contractCode && <span>Mã hợp đồng: {order.contractCode}</span>}
                      </div>
                      <Link
                        to={`/my-orders/${order.orderId}`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900 hover:text-orange-700"
                      >
                        Xem chi tiết
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>

            {pagination.totalPages > 1 && (
              <div className="mt-5 border border-stone-200">
                <TablePagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  currentCount={orders.length}
                  itemsPerPage={pagination.itemsPerPage}
                  onPageChange={setPage}
                  itemLabel="đơn hàng"
                  loading={loading}
                />
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};
