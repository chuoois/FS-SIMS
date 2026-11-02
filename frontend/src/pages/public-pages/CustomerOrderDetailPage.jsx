import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, PackageCheck, Phone, UserRound } from 'lucide-react';
import { getMyOrderById } from '../../services/customerOrderService';

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

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex gap-3">
    <Icon className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" />
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-stone-900">{value || '—'}</dd>
    </div>
  </div>
);

export const CustomerOrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setOrder(null);

    getMyOrderById(id)
      .then((response) => {
        if (!cancelled) setOrder(response.data || null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error('[CustomerOrderDetailPage] Không thể tải chi tiết đơn hàng:', requestError);
        setError(
          requestError.response?.status === 404
            ? 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này.'
            : requestError.response?.data?.message || 'Không thể tải chi tiết đơn hàng.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  return (
    <>
      <section className="bg-stone-900 px-5 py-10 text-white md:py-14">
        <div className="mx-auto max-w-[1100px]">
          <Link to="/my-orders" className="inline-flex items-center gap-2 text-xs font-semibold text-stone-300 hover:text-white">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại đơn hàng
          </Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Theo dõi đơn hàng</p>
          <h1 className="mt-2 text-3xl font-light md:text-4xl">
            {loading ? 'Đang tải...' : order?.orderCode || 'Chi tiết đơn hàng'}
          </h1>
          {order && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[order.status] || 'bg-stone-700 text-white'}`}>
                {statusNames[order.status] || order.status}
              </span>
              <span className="text-xs text-stone-300">Đặt ngày {formatDate(order.createdAt)}</span>
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[1100px] px-5 py-10 lg:px-8">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2" aria-busy="true">
            <div className="h-48 animate-pulse bg-stone-100" />
            <div className="h-48 animate-pulse bg-stone-100" />
            <div className="h-64 animate-pulse bg-stone-100 md:col-span-2" />
          </div>
        ) : error || !order ? (
          <section className="border border-stone-200 px-5 py-16 text-center" role="alert">
            <p className="text-sm text-stone-700">{error || 'Không tìm thấy đơn hàng.'}</p>
            {error && (
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-5 text-xs font-bold uppercase tracking-wider text-stone-900 underline"
              >
                Thử lại
              </button>
            )}
            <div>
              <Link to="/my-orders" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-orange-700">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Quay lại danh sách đơn hàng
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid gap-6">
            <section className="grid gap-5 border border-stone-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Thông tin đơn hàng">
              <InfoRow icon={UserRound} label="Người nhận" value={order.contactName} />
              <InfoRow icon={Phone} label="Số điện thoại" value={order.contactPhone} />
              <InfoRow icon={MapPin} label="Địa chỉ giao hàng" value={order.deliveryAddress || 'Nhận tại cửa hàng'} />
              <InfoRow icon={CalendarDays} label="Dự kiến giao" value={formatDate(order.expectedDate)} />
            </section>

            <section className="border border-stone-200 bg-white">
              <div className="flex items-center gap-2 border-b border-stone-200 px-5 py-4">
                <PackageCheck className="size-5 text-stone-600" aria-hidden="true" />
                <h2 className="font-semibold text-stone-900">Sản phẩm trong đơn hàng</h2>
              </div>
              {order.items?.length ? (
                <ul className="divide-y divide-stone-100 px-5">
                  {order.items.map((item) => (
                    <li key={item.orderItemId} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 py-4 sm:grid-cols-[80px_minmax(0,1fr)_auto]">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="grid aspect-square w-full place-items-center bg-stone-100 text-[9px] text-stone-400" role="img" aria-label={item.productName}>
                          Chưa có ảnh
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-stone-900">{item.productName}</h3>
                        {item.productCode && <p className="mt-1 text-xs text-stone-500">Mã: {item.productCode}</p>}
                        {item.description && <p className="mt-1 text-xs leading-5 text-stone-600">{item.description}</p>}
                        <p className="mt-2 text-xs text-stone-500">{formatVnd(item.unitPrice)} × {item.quantity}</p>
                      </div>
                      <p className="text-right text-sm font-bold text-stone-900">{formatVnd(item.totalPrice)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-sm text-stone-500">Đơn hàng chưa có thông tin sản phẩm.</p>
              )}
            </section>

            <section className="ml-auto w-full max-w-md border border-stone-200 bg-stone-50 p-5" aria-label="Tổng kết thanh toán">
              <h2 className="font-semibold text-stone-900">Tổng kết đơn hàng</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-600">Tổng giá trị</dt>
                  <dd className="font-semibold text-stone-900">{formatVnd(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-600">Đã thanh toán</dt>
                  <dd className="font-semibold text-stone-900">{formatVnd(order.paidAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-stone-200 pt-3">
                  <dt className="font-bold text-stone-900">Còn lại</dt>
                  <dd className="font-bold text-stone-900">{formatVnd(order.remainingAmount)}</dd>
                </div>
              </dl>
              {order.note && (
                <p className="mt-4 border-t border-stone-200 pt-3 text-xs leading-5 text-stone-600">
                  <span className="font-semibold text-stone-800">Ghi chú:</span> {order.note}
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
};
