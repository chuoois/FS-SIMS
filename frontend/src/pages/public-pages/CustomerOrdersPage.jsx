import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PackageOpen,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { getMyOrders } from '../../services/customerOrderService';
import { CustomerOrderStatusBadge } from '../../components/common/StatusBadge';
import { formatVND, formatDateVN } from '../../utils/formatters';
import {
  STATUS_TABS,
  formatDate,
  formatVnd,
  statusClasses,
  statusNames,
} from '../../constants/orderStatus';

/* =====================================================================
 * Cấu hình
 * ===================================================================== */
const PAGE_SIZE = 10;
const MAX_PREVIEW_ITEMS = 2;

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

/* Trả về dãy số trang kèm dấu '…' */
const getPages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
};

/* ---------- Thành phần nhỏ ---------- */
const StatusBadge = ({ status }) => <CustomerOrderStatusBadge status={status} size="sm" />;
const Thumb = ({ src, alt }) =>
  src ? (
    <img src={src} alt={alt} className="size-16 shrink-0 bg-stone-100 object-cover sm:size-20" />
  ) : (
    <div
      className="grid size-16 shrink-0 place-items-center bg-stone-100 text-stone-300 sm:size-20"
      role="img"
      aria-label={alt}
    >
      <PackageOpen className="size-6" aria-hidden="true" />
    </div>
  );

const SkeletonList = () => (
  <ul className="grid gap-4" aria-busy="true">
    {Array.from({ length: 3 }).map((_, i) => (
      <li key={i} className="animate-pulse border border-stone-200 bg-white">
        <div className="flex justify-between border-b border-stone-100 px-5 py-3">
          <div className="h-3 w-1/4 bg-stone-100" />
          <div className="h-3 w-16 bg-stone-100" />
        </div>
        <div className="flex gap-4 p-5">
          <div className="size-20 bg-stone-100" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-1/2 bg-stone-100" />
            <div className="h-3 w-1/4 bg-stone-100" />
          </div>
        </div>
        <div className="h-14 border-t border-stone-100 bg-stone-50" />
      </li>
    ))}
  </ul>
);

const OrderCard = ({ order }) => {
  const isRequest = order.orderId == null;
  const items = order.items || [];
  const itemCount = items.reduce((count, item) => count + Number(item.quantity || 0), 0);
  const preview = items.slice(0, MAX_PREVIEW_ITEMS);
  const hiddenCount = items.length - preview.length;
  const detailLink = isRequest
    ? `/my-orders/requests/${order.requestId}`
    : `/my-orders/${order.orderId}`;
  const code = isRequest ? order.requestCode : order.orderCode;

  const priceLabel = isRequest ? 'Giá sale báo' : 'Tổng giá trị';
  const priceValue = isRequest
    ? order.quotedPrice != null
      ? formatVnd(order.quotedPrice)
      : 'Chưa có báo giá'
    : formatVnd(order.totalAmount);

  const metaLines = [
    order.expectedDate && `${isRequest ? 'Mong muốn nhận' : 'Dự kiến giao'}: ${formatDate(order.expectedDate)}`,
    order.contractCode && `Hợp đồng: ${order.contractCode}`,
    isRequest && order.budgetMax != null && `Ngân sách tối đa: ${formatVnd(order.budgetMax)}`,
  ].filter(Boolean);

  return (
    <li className="border border-stone-200 bg-white transition-colors hover:border-stone-400">
      {/* Đầu thẻ: mã + loại + trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stone-100 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[13px] font-semibold text-stone-900">{code}</span>
          <span className="bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
            {isRequest ? 'Yêu cầu' : order.orderType === 'READY' ? 'Có sẵn' : 'Đặt làm'}
          </span>
          <span className="text-[11px] text-stone-500">
            {isRequest ? 'Gửi' : 'Đặt'} {formatDate(order.createdAt)}
          </span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Thân thẻ: bấm vào để xem chi tiết */}
      <Link
        to={detailLink}
        className={`flex gap-4 px-4 py-4 hover:bg-stone-50 sm:px-5 ${focusRing}`}
        aria-label={`Xem chi tiết ${code}`}
      >
        {preview.length > 0 ? (
          <div className="flex shrink-0 gap-2">
            {preview.map((item, index) => (
              <Thumb
                key={item.orderItemId ?? item.requestItemId ?? index}
                src={item.imageUrl}
                alt={item.productName || item.itemName || 'Sản phẩm'}
              />
            ))}
          </div>
        ) : (
          <Thumb alt="Chưa có sản phẩm" />
        )}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-stone-900">
            {isRequest
              ? order.title || 'Yêu cầu đặt làm'
              : preview[0]?.productName || 'Đơn hàng'}
            {!isRequest && hiddenCount > 0 && (
              <span className="font-normal text-stone-500"> và {hiddenCount} sản phẩm khác</span>
            )}
          </p>
          <p className="mt-1 text-xs text-stone-500">{itemCount} sản phẩm</p>
          {metaLines.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-stone-500">
              {metaLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>

        <ChevronRight className="hidden size-5 shrink-0 self-center text-stone-300 sm:block" aria-hidden="true" />
      </Link>

      {/* Chân thẻ: tiền + nút */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/60 px-4 py-3 sm:px-5">
        <p className="text-xs text-stone-500">
          {priceLabel}:{' '}
          <span className="text-base font-bold text-stone-900">{priceValue}</span>
        </p>
        <Link
          to={detailLink}
          className={`inline-flex h-10 items-center justify-center bg-stone-900 px-5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-orange-700 ${focusRing}`}
        >
          {isRequest ? 'Xem yêu cầu' : 'Xem chi tiết'}
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
    <nav aria-label="Phân trang" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
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
  const [activeTab, setActiveTab] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const topRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getMyOrders({ page, limit: PAGE_SIZE })
      .then((response) => {
        if (cancelled) return;
        setOrders(Array.isArray(response.data) ? response.data : []);
        if (response.meta) {
          setPagination({
            totalItems: response.meta.total,
            totalPages: response.meta.totalPages,
            currentPage: response.meta.page,
            itemsPerPage: response.meta.limit,
          });
        }
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error('[CustomerOrdersPage] Không thể tải đơn hàng:', requestError);
        setError(requestError.response?.data?.detail || 'Không thể tải đơn hàng. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  /* Lọc theo tab + từ khóa (trên dữ liệu của trang hiện tại) */
  const visibleOrders = useMemo(() => {
    const tab = STATUS_TABS.find((t) => t.key === activeTab);
    const q = keyword.trim().toLowerCase();

    return orders.filter((order) => {
      if (tab?.statuses && !tab.statuses.includes(order.status)) return false;
      if (!q) return true;

      const haystack = [
        order.orderCode,
        order.requestCode,
        order.title,
        order.contractCode,
        ...(order.items || []).map((item) => item.productName || item.itemName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, activeTab, keyword]);

  const isFiltering = activeTab !== 'ALL' || keyword.trim() !== '';

  const goTo = (p) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reload = () => setReloadKey((key) => key + 1);

  const clearFilters = () => {
    setActiveTab('ALL');
    setKeyword('');
  };

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:py-12 lg:px-8">
      {/* Tiêu đề gọn */}
      <header className="border border-stone-200 bg-white">
        <div className="px-5 py-6 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-500">
            <Link to="/home" className="hover:text-stone-900 hover:underline">
              Trang chủ
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-bold text-stone-900">
              Đơn hàng của tôi
            </span>
          </nav>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-stone-900">Đơn hàng của tôi</h1>
              <p className="mt-1 text-sm text-stone-500" aria-live="polite">
                {loading
                  ? 'Đang tải...'
                  : error
                    ? 'Không tải được dữ liệu'
                    : `${pagination.totalItems} đơn hàng và yêu cầu`}
              </p>
            </div>
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className={`inline-flex h-10 items-center gap-2 border border-stone-300 px-4 text-xs font-bold uppercase tracking-widest text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:opacity-50 ${focusRing}`}
            >
              <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Tab trạng thái */}
        <div className="border-t border-stone-200 px-2 sm:px-4">
          <div
            role="tablist"
            aria-label="Lọc theo trạng thái"
            className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {STATUS_TABS.map((tab) => {
              const selected = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${focusRing} ${
                    selected
                      ? 'border-orange-700 font-bold text-orange-700'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <section
        className="pt-6"
        aria-label="Danh sách đơn hàng"
      >
        <div ref={topRef} className="scroll-mt-4">
          {/* Ô tìm kiếm */}
          <div className="relative mb-5">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo mã đơn, mã yêu cầu, tên sản phẩm..."
              aria-label="Tìm đơn hàng"
              className={`h-12 w-full border border-stone-200 bg-white pl-11 pr-11 text-sm text-stone-900 placeholder:text-stone-400 ${focusRing}`}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                aria-label="Xóa từ khóa"
                className={`absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-stone-500 hover:text-stone-900 ${focusRing}`}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {isFiltering && !loading && !error && orders.length > 0 && (
            <p className="mb-4 text-xs text-stone-500">
              Đang lọc trong trang {pagination.currentPage || page}: {visibleOrders.length}/{orders.length} kết quả
            </p>
          )}

          {/* Đang tải */}
          {loading && <SkeletonList />}

          {/* Lỗi */}
          {!loading && error && (
            <div className="border border-stone-200 bg-white py-20 text-center" role="alert">
              <p className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={reload} className={`mt-4 ${primaryBtn}`}>
                Thử lại
              </button>
            </div>
          )}

          {/* Chưa có đơn nào */}
          {!loading && !error && orders.length === 0 && (
            <div className="border border-stone-200 bg-white px-5 py-20 text-center">
              <ClipboardList className="mx-auto size-9 text-stone-300" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-light tracking-tight text-stone-900">
                Bạn chưa có đơn hàng hoặc yêu cầu nào
              </h2>
              <p className="mt-3 text-sm text-stone-600">
                Đơn hàng và yêu cầu gửi cho sale từ tài khoản sẽ hiển thị tại đây.
              </p>
              <Link to="/products" className={`mt-6 ${primaryBtn}`}>
                Khám phá sản phẩm
              </Link>
            </div>
          )}

          {/* Có đơn nhưng bộ lọc không khớp */}
          {!loading && !error && orders.length > 0 && visibleOrders.length === 0 && (
            <div className="border border-stone-200 bg-white px-5 py-16 text-center">
              <Search className="mx-auto size-8 text-stone-300" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-stone-900">Không có đơn nào phù hợp</h2>
              <p className="mt-2 text-sm text-stone-600">
                Thử đổi trạng thái hoặc từ khóa khác
                {pagination.totalPages > 1 ? ', hoặc chuyển sang trang khác.' : '.'}
              </p>
              <button type="button" onClick={clearFilters} className={`mt-5 ${primaryBtn}`}>
                Xóa bộ lọc
              </button>
            </div>
          )}

          {/* Danh sách */}
          {!loading && !error && visibleOrders.length > 0 && (
            <ul className="grid gap-4">
              {visibleOrders.map((order) => (
                <OrderCard key={order.orderId ?? `request-${order.requestId}`} order={order} />
              ))}
            </ul>
          )}

          {!loading && !error && orders.length > 0 && (
            <Pagination
              page={pagination.currentPage || page}
              total={pagination.totalPages}
              onChange={goTo}
            />
          )}
        </div>
      </section>
    </div>
  );
};