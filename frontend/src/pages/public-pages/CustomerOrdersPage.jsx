import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardList, RotateCw } from 'lucide-react';
import { getMyOrders } from '../../services/customerOrderService';
import bannerImg from '../../../public/images/product-banner.jpg';

/* =====================================================================
 * Cấu hình & tiện ích (đồng bộ với trang Sản phẩm)
 * ===================================================================== */
const PAGE_SIZE = 10;
const DEFAULT_BANNER = { title: 'Đơn hàng của tôi', image: bannerImg };

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

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

/* Trả về dãy số trang kèm dấu '…' */
const getPages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
};

/* ---------- Thành phần nhỏ ---------- */
const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
      statusClasses[status] || 'bg-stone-100 text-stone-700'
    }`}
  >
    {statusNames[status] || status}
  </span>
);

const Banner = ({ banner, total }) => (
  <section
    className="relative isolate flex min-h-[360px] items-end overflow-hidden bg-stone-700 md:min-h-[460px]"
    aria-labelledby="orders-title"
  >
    {banner.image ? (
      <img src={banner.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
    ) : (
      <div className="absolute inset-0 -z-20 bg-stone-700" aria-hidden="true" />
    )}
    <div
      className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/20"
      aria-hidden="true"
    />
    <div className="w-full px-5 pb-14 text-white md:pb-20 lg:px-[4vw]">
      <div className="max-w-[640px]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 sm:text-sm">
          Góc Nhà
        </p>
        <h1
          id="orders-title"
          className="mt-3 text-4xl font-light italic tracking-tight sm:text-5xl md:mt-4 md:text-6xl"
        >
          {banner.title}
        </h1>
        <p className="mt-4 max-w-[480px] text-sm leading-relaxed text-stone-100 sm:text-base">
          Theo dõi trạng thái, lịch giao dự kiến và thông tin các đơn hàng bạn đã đặt.
        </p>
        {typeof total === 'number' && total > 0 && (
          <p className="mt-4 text-[13px] text-stone-200">{total} đơn hàng</p>
        )}
        <nav aria-label="Breadcrumb" className="mt-6 flex items-center gap-2 text-xs text-white/80">
          <Link to="/home" className="hover:text-white hover:underline">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-bold text-white">
            {banner.title}
          </span>
        </nav>
      </div>
    </div>
  </section>
);

const SkeletonList = () => (
  <ul className="grid gap-4" aria-busy="true">
    {Array.from({ length: 3 }).map((_, i) => (
      <li key={i} className="animate-pulse border border-stone-200 p-6">
        <div className="h-3 w-1/4 bg-stone-100" />
        <div className="mt-3 h-4 w-1/2 bg-stone-100" />
        <div className="mt-6 h-3 w-1/3 bg-stone-100" />
      </li>
    ))}
  </ul>
);

const OrderCard = ({ order }) => {
  const itemCount = (order.items || []).reduce((count, item) => count + Number(item.quantity || 0), 0);

  return (
    <li className="group border border-stone-200 bg-white p-5 transition-colors hover:border-stone-900 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-[14px] font-semibold text-stone-900">{order.orderCode}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-2 text-[11px] text-stone-500">
            Đặt ngày {formatDate(order.createdAt)}
            <span className="mx-2" aria-hidden="true">·</span>
            {order.orderType === 'READY' ? 'Hàng có sẵn' : 'Đặt làm theo yêu cầu'}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] text-stone-500">Tổng giá trị</p>
          <p className="mt-1 text-[13px] font-bold text-stone-900">{formatVnd(order.totalAmount)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-stone-600">
          <span>{itemCount} sản phẩm</span>
          {order.expectedDate && <span>Dự kiến giao: {formatDate(order.expectedDate)}</span>}
          {order.contractCode && <span>Mã hợp đồng: {order.contractCode}</span>}
        </div>
        <Link
          to={`/my-orders/${order.orderId}`}
          className={`inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-stone-900 hover:text-orange-700 ${focusRing}`}
        >
          Xem chi tiết
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
};

/* ---------- Phân trang ---------- */
const pageBtn = `grid size-10 place-items-center border text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${focusRing}`;

const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  return (
    <nav aria-label="Phân trang" className="mt-16 flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
        className={`${pageBtn} border-stone-300 hover:border-stone-900`}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      {getPages(page, total).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} aria-hidden="true" className="grid size-10 place-items-center text-stone-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Trang ${p}`}
            className={`${pageBtn} ${
              p === page
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-300 text-stone-800 hover:border-stone-900'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= total}
        aria-label="Trang sau"
        className={`${pageBtn} border-stone-300 hover:border-stone-900`}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

const primaryBtn = `inline-flex h-11 items-center justify-center gap-2 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

/* =====================================================================
 * Trang Đơn hàng của tôi
 * ===================================================================== */
export const CustomerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const gridTopRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getMyOrders({ page, limit: PAGE_SIZE })
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

  const goTo = (p) => {
    setPage(p);
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reload = () => setReloadKey((key) => key + 1);

  return (
    <>
      <Banner banner={DEFAULT_BANNER} total={loading || error ? null : pagination.totalItems} />

      <section
        className="mx-auto max-w-[1500px] px-5 pb-24 pt-12 lg:px-[4vw]"
        aria-label="Danh sách đơn hàng"
      >
        <div className="min-w-0" ref={gridTopRef}>
          {/* Thanh công cụ */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">
                Lịch sử mua hàng
              </p>
              <p
                className="mt-1 text-2xl font-light tracking-tight text-stone-900"
                aria-live="polite"
              >
                {loading ? 'Đang tải...' : `${pagination.totalItems} đơn hàng`}
              </p>
            </div>
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className={`inline-flex h-11 items-center gap-2 border border-[#323139] px-5 text-xs font-bold uppercase tracking-widest text-[#323139] transition-colors hover:bg-[#323139] hover:text-white disabled:opacity-50 ${focusRing}`}
            >
              <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Làm mới
            </button>
          </div>

          {/* Đang tải */}
          {loading && <SkeletonList />}

          {/* Lỗi */}
          {!loading && error && (
            <div className="border border-stone-200 py-20 text-center" role="alert">
              <p className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={reload} className={`mt-4 ${primaryBtn}`}>
                Thử lại
              </button>
            </div>
          )}

          {/* Rỗng */}
          {!loading && !error && orders.length === 0 && (
            <div className="border border-stone-200 px-5 py-20 text-center">
              <ClipboardList className="mx-auto size-9 text-stone-300" aria-hidden="true" />
              <h3 className="mt-4 text-2xl font-light tracking-tight text-stone-900">
                Bạn chưa có đơn hàng nào
              </h3>
              <p className="mt-3 text-[14px] text-stone-600">
                Các đơn hàng được tạo từ tài khoản sẽ hiển thị tại đây.
              </p>
              <Link to="/products" className={`mt-6 ${primaryBtn}`}>
                Khám phá sản phẩm
              </Link>
            </div>
          )}

          {/* Danh sách */}
          {!loading && !error && orders.length > 0 && (
            <>
              <ul className="grid gap-4">
                {orders.map((order) => (
                  <OrderCard key={order.orderId} order={order} />
                ))}
              </ul>
              <Pagination
                page={pagination.currentPage || page}
                total={pagination.totalPages}
                onChange={goTo}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
};