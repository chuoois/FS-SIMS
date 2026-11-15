import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  MapPin,
  PackageCheck,
  Phone,
  UserRound,
} from 'lucide-react';
import { getMyOrderById, getMyOrderRequestById } from '../../services/customerOrderService';
import {
  formatDate,
  formatVnd,
  getProgress,
  statusClasses,
  statusHints,
  statusNames,
} from './orderStatus';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

/* ---------- Thành phần nhỏ ---------- */
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex gap-3">
    <Icon className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" />
    <div className="min-w-0">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-stone-900">{value || '—'}</dd>
    </div>
  </div>
);

const Card = ({ title, icon: Icon, children }) => (
  <section className="border border-stone-200 bg-white">
    {title && (
      <div className="flex items-center gap-2 border-b border-stone-200 px-5 py-4">
        {Icon && <Icon className="size-5 text-stone-600" aria-hidden="true" />}
        <h2 className="font-semibold text-stone-900">{title}</h2>
      </div>
    )}
    {children}
  </section>
);

/* Thanh tiến trình các bước */
const ProgressStepper = ({ status, isRequest }) => {
  const progress = getProgress(status, isRequest);
  if (!progress) return null;
  const { steps, current, allDone } = progress;

  return (
    <ol className="flex items-start" aria-label="Tiến trình">
      {steps.map((label, index) => {
        const done = allDone || index < current;
        const active = !allDone && index === current;
        return (
          <li
            key={label}
            className="relative flex flex-1 flex-col items-center text-center"
            aria-current={active ? 'step' : undefined}
          >
            {index > 0 && (
              <span
                className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                  done || active ? 'bg-emerald-500' : 'bg-stone-200'
                }`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-bold ${
                done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : active
                    ? 'border-orange-600 bg-white text-orange-600'
                    : 'border-stone-200 bg-white text-stone-400'
              }`}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={`mt-2 px-1 text-[11px] leading-tight sm:text-xs ${
                active ? 'font-bold text-stone-900' : done ? 'text-stone-700' : 'text-stone-400'
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const CopyCodeButton = ({ code }) => {
  const [copied, setCopied] = useState(false);
  if (!code) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Trình duyệt không cho phép copy: bỏ qua */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-stone-300 hover:text-white ${focusRing}`}
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? 'Đã sao chép' : 'Sao chép mã'}
    </button>
  );
};

/* Khung trạng thái: tiến trình + lời nhắn */
const StatusPanel = ({ status, isRequest }) => {
  const failed = status === 'CANCELLED' || status === 'REJECTED';
  return (
    <section
      className="border border-stone-200 bg-white p-5"
      aria-label="Trạng thái hiện tại"
    >
      {failed ? (
        <div className="flex items-start gap-3 text-red-700">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{statusHints[status]}</p>
        </div>
      ) : (
        <>
          <ProgressStepper status={status} isRequest={isRequest} />
          {statusHints[status] && (
            <p className="mt-5 bg-stone-50 px-4 py-3 text-sm text-stone-700">{statusHints[status]}</p>
          )}
        </>
      )}
    </section>
  );
};

/* ---------- Trang chi tiết ---------- */
export const CustomerOrderDetailPage = () => {
  const { id, requestId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setOrder(null);

    (requestId ? getMyOrderRequestById(requestId) : getMyOrderById(id))
      .then((response) => {
        if (!cancelled) setOrder(response.data || null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error('[CustomerOrderDetailPage] Không thể tải chi tiết đơn hàng:', requestError);
        setError(
          requestError.response?.status === 404
            ? requestId
              ? 'Không tìm thấy yêu cầu hoặc bạn không có quyền xem yêu cầu này.'
              : 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này.'
            : requestError.response?.data?.message || 'Không thể tải chi tiết đơn hàng.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, requestId, reloadKey]);

  const isRequest = Boolean(requestId) || order?.orderId == null;
  const code = order ? (isRequest ? order.requestCode : order.orderCode) : '';

  return (
    <>
      {/* Đầu trang */}
      <section className="mx-auto max-w-[1100px] px-5 pt-8 md:pt-12 lg:px-8">
        <div className="bg-stone-900 px-5 py-6 text-white sm:px-8 md:py-10">
          <Link
            to="/my-orders"
            className={`inline-flex items-center gap-2 text-xs font-semibold text-stone-300 hover:text-white ${focusRing}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại đơn hàng
          </Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            {requestId ? 'Theo dõi yêu cầu' : 'Theo dõi đơn hàng'}
          </p>
          <h1 className="mt-2 break-all font-mono text-2xl font-light md:text-4xl">
            {loading ? 'Đang tải...' : code || (requestId ? 'Chi tiết yêu cầu' : 'Chi tiết đơn hàng')}
          </h1>
          {order && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  statusClasses[order.status] || 'bg-stone-700 text-white'
                }`}
              >
                {statusNames[order.status] || order.status}
              </span>
              <span className="text-xs text-stone-300">
                {isRequest ? 'Gửi ngày' : 'Đặt ngày'} {formatDate(order.createdAt)}
              </span>
              <CopyCodeButton code={code} />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-6 md:pb-16 lg:px-8">
        {loading ? (
          <div className="grid gap-5" aria-busy="true">
            <div className="h-32 animate-pulse bg-stone-100" />
            <div className="h-40 animate-pulse bg-stone-100" />
            <div className="h-64 animate-pulse bg-stone-100" />
          </div>
        ) : error || !order ? (
          <section className="border border-stone-200 px-5 py-16 text-center" role="alert">
            <p className="text-sm text-stone-700">
              {error || (requestId ? 'Không tìm thấy yêu cầu.' : 'Không tìm thấy đơn hàng.')}
            </p>
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
              <Link
                to="/my-orders"
                className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-orange-700"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Quay lại danh sách đơn hàng
              </Link>
            </div>
          </section>
        ) : isRequest ? (
          /* ======================= YÊU CẦU ======================= */
          <div className="grid gap-5">
            <StatusPanel status={order.status} isRequest />

            {order.rejectReason && (
              <p className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
                <span className="font-semibold">Lý do từ chối:</span> {order.rejectReason}
              </p>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <div className="grid gap-5">
                <Card title="Sản phẩm yêu cầu" icon={PackageCheck}>
                  {order.items?.length ? (
                    <ul className="divide-y divide-stone-100 px-5">
                      {order.items.map((item) => (
                        <li key={item.requestItemId} className="py-4">
                          <div className="flex flex-wrap justify-between gap-3">
                            <h3 className="text-sm font-semibold text-stone-900">{item.itemName}</h3>
                            <span className="text-xs text-stone-500">Số lượng: {item.quantity}</span>
                          </div>
                          {item.description && (
                            <p className="mt-2 text-xs leading-5 text-stone-600">{item.description}</p>
                          )}
                          {(item.lengthCm || item.widthCm || item.heightCm) && (
                            <p className="mt-2 text-xs text-stone-500">
                              Kích thước (D × R × C): {item.lengthCm || '—'} × {item.widthCm || '—'} ×{' '}
                              {item.heightCm || '—'} cm
                            </p>
                          )}
                          {item.unitPrice != null && (
                            <p className="mt-2 text-xs text-stone-500">
                              {formatVnd(item.unitPrice)} × {item.quantity}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 py-8 text-sm text-stone-500">Yêu cầu chưa có thông tin sản phẩm.</p>
                  )}
                </Card>

                {(order.title || order.description) && (
                  <Card title={order.title || 'Mô tả yêu cầu'}>
                    {order.description ? (
                      <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-6 text-stone-600">
                        {order.description}
                      </p>
                    ) : (
                      <p className="px-5 py-4 text-sm text-stone-500">Không có mô tả.</p>
                    )}
                  </Card>
                )}
              </div>

              <aside className="grid gap-5 lg:sticky lg:top-4">
                <Card title="Thông tin nhận hàng">
                  <dl className="grid gap-4 p-5">
                    <InfoRow icon={UserRound} label="Người liên hệ" value={order.contactName} />
                    <InfoRow icon={Phone} label="Số điện thoại" value={order.contactPhone} />
                    <InfoRow icon={MapPin} label="Địa chỉ giao hàng" value={order.deliveryAddress} />
                    <InfoRow icon={CalendarDays} label="Ngày có thể nhận" value={formatDate(order.expectedDate)} />
                  </dl>
                </Card>

                <Card title="Giá & ngân sách">
                  <dl className="grid gap-3 p-5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-600">Ngân sách dự kiến</dt>
                      <dd className="text-right font-medium text-stone-900">
                        {order.budgetMin != null
                          ? `${formatVnd(order.budgetMin)}${order.budgetMax != null ? ` – ${formatVnd(order.budgetMax)}` : ''}`
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-stone-200 pt-3">
                      <dt className="font-bold text-stone-900">Giá sale báo</dt>
                      <dd className="font-bold text-stone-900">
                        {order.quotedPrice != null ? formatVnd(order.quotedPrice) : 'Chưa có'}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </aside>
            </div>
          </div>
        ) : (
          /* ======================= ĐƠN HÀNG ======================= */
          <div className="grid gap-5">
            <StatusPanel status={order.status} isRequest={false} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <Card title="Sản phẩm trong đơn hàng" icon={PackageCheck}>
                {order.items?.length ? (
                  <ul className="divide-y divide-stone-100 px-5">
                    {order.items.map((item) => (
                      <li
                        key={item.orderItemId}
                        className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-4 py-4 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="aspect-square w-full bg-stone-100 object-cover"
                          />
                        ) : (
                          <div
                            className="grid aspect-square w-full place-items-center bg-stone-100 text-[9px] text-stone-400"
                            role="img"
                            aria-label={item.productName}
                          >
                            Chưa có ảnh
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-stone-900">{item.productName}</h3>
                          {item.productCode && (
                            <p className="mt-1 text-xs text-stone-500">Mã: {item.productCode}</p>
                          )}
                          {item.description && (
                            <p className="mt-1 text-xs leading-5 text-stone-600">{item.description}</p>
                          )}
                          <p className="mt-2 text-xs text-stone-500">
                            {formatVnd(item.unitPrice)} × {item.quantity}
                          </p>
                          <p className="mt-2 text-sm font-bold text-stone-900 sm:hidden">
                            {formatVnd(item.totalPrice)}
                          </p>
                        </div>
                        <p className="hidden text-right text-sm font-bold text-stone-900 sm:block">
                          {formatVnd(item.totalPrice)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-8 text-sm text-stone-500">Đơn hàng chưa có thông tin sản phẩm.</p>
                )}
              </Card>

              <aside className="grid gap-5 lg:sticky lg:top-4">
                <Card title="Thông tin nhận hàng">
                  <dl className="grid gap-4 p-5">
                    <InfoRow icon={UserRound} label="Người nhận" value={order.contactName} />
                    <InfoRow icon={Phone} label="Số điện thoại" value={order.contactPhone} />
                    <InfoRow
                      icon={MapPin}
                      label="Địa chỉ giao hàng"
                      value={order.deliveryAddress || 'Nhận tại cửa hàng'}
                    />
                    <InfoRow icon={CalendarDays} label="Dự kiến giao" value={formatDate(order.expectedDate)} />
                  </dl>
                </Card>

                <section className="border border-stone-200 bg-stone-50 p-5" aria-label="Tổng kết thanh toán">
                  <h2 className="font-semibold text-stone-900">Tổng kết đơn hàng</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-600">Tổng giá trị</dt>
                      <dd className="font-semibold text-stone-900">{formatVnd(order.totalAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-600">Đã thanh toán</dt>
                      <dd className="font-semibold text-emerald-700">{formatVnd(order.paidAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-stone-200 pt-3">
                      <dt className="font-bold text-stone-900">Còn lại</dt>
                      <dd className="text-base font-bold text-orange-700">{formatVnd(order.remainingAmount)}</dd>
                    </div>
                  </dl>
                  {order.contractCode && (
                    <p className="mt-4 border-t border-stone-200 pt-3 text-xs text-stone-600">
                      <span className="font-semibold text-stone-800">Mã hợp đồng:</span> {order.contractCode}
                    </p>
                  )}
                  {order.note && (
                    <p className="mt-4 border-t border-stone-200 pt-3 text-xs leading-5 text-stone-600">
                      <span className="font-semibold text-stone-800">Ghi chú:</span> {order.note}
                    </p>
                  )}
                </section>
              </aside>
            </div>
          </div>
        )}
      </div>
    </>
  );
};