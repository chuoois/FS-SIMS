import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { getProducts, getProductMetadata } from '../../services/productService';

/* =====================================================================
 * Cấu hình mặc định (chỉ dùng làm fallback khi API chưa trả dữ liệu).
 * Mọi nội dung hiển thị chính (banner, danh mục, không gian, sắp xếp,
 * sản phẩm, tổng số, phân trang) đều ưu tiên lấy từ API.
 * ===================================================================== */
const PAGE_SIZE = 9;
const SEARCH_DEBOUNCE_MS = 400;

const DEFAULT_BANNER = { title: 'Sản phẩm', image: '' };
const DEFAULT_SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: 'asc', label: 'Giá: Thấp đến cao' },
  { value: 'desc', label: 'Giá: Cao đến thấp' },
];

/* ---------- Tiện ích ---------- */
const formatVnd = (n) => {
  const num = Number(n);
  if (n === null || n === undefined || Number.isNaN(num)) return 'Liên hệ';
  return `${num.toLocaleString('vi-VN')} ₫`;
};

/* Chuẩn hoá 1 sản phẩm từ API -> object dùng thống nhất trong UI */
const normalizeProduct = (p) => {
  const stock = p.stockQuantity ?? p.stock_quantity;
  return {
    id: p.productId ?? p.product_id ?? p.id,
    name: p.productName ?? p.product_name ?? p.name ?? 'Sản phẩm',
    image: p.imageUrl ?? p.image_url ?? p.image ?? '',
    price: p.price,
    oldPrice: p.oldPrice ?? p.old_price ?? p.originalPrice ?? null,
    categoryName: p.categoryName ?? p.category_name ?? p.category?.category_name ?? '',
    roomName: p.roomName ?? p.room_name ?? p.room?.room_name ?? '',
    isNew: Boolean(p.isNew ?? p.is_new),
    outOfStock: stock !== undefined && stock !== null && Number(stock) <= 0,
  };
};

/* Trả về dãy số trang kèm dấu '…' */
const getPages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
};

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

/* ---------- Thành phần nhỏ ---------- */
const Photo = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  ) : (
    <div
      className={`grid place-items-center bg-stone-100 text-[11px] uppercase tracking-widest text-stone-400 ${className}`}
      role="img"
      aria-label={alt}
    >
      Chưa có ảnh
    </div>
  );
};

const NewBadge = () => (
  <span className="bg-stone-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
    Mới
  </span>
);

const Banner = ({ banner, total }) => (
  <section
    className="relative isolate flex min-h-[360px] items-end overflow-hidden bg-stone-700 md:min-h-[460px]"
    aria-labelledby="sp-title"
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
          id="sp-title"
          className="mt-3 text-4xl font-light italic tracking-tight sm:text-5xl md:mt-4 md:text-6xl"
        >
          {banner.title}
        </h1>
        {banner.subtitle && (
          <p className="mt-4 max-w-[480px] text-sm leading-relaxed text-stone-100 sm:text-base">
            {banner.subtitle}
          </p>
        )}
        {typeof total === 'number' && total > 0 && (
          <p className="mt-4 text-[13px] text-stone-200">{total} sản phẩm</p>
        )}
        <nav aria-label="Breadcrumb" className="mt-6 flex items-center gap-2 text-xs text-white/80">
          <a href="/" className="hover:text-white hover:underline">
            Trang chủ
          </a>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-bold text-white">
            {banner.title}
          </span>
        </nav>
      </div>
    </div>
  </section>
);

const ProductCard = ({ product, liked, onToggle }) => (
  <article className="group relative flex flex-col">
    <div className="relative overflow-hidden bg-stone-100">
      <a href={`/san-pham/${product.id}`} aria-label={product.name} className="block">
        <Photo
          src={product.image}
          alt={product.name}
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105"
        />
      </a>

      {/* Badge góc trái */}
      <div className="pointer-events-none absolute left-2 top-2 flex gap-1.5">
        {product.isNew && <NewBadge />}
        {product.outOfStock && (
          <span className="bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Hết hàng
          </span>
        )}
      </div>

      {/* Nút yêu thích */}
      <button
        type="button"
        onClick={() => onToggle(product.id)}
        aria-pressed={liked}
        aria-label={`Yêu thích ${product.name}`}
        className={`absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-stone-600 shadow-sm transition hover:bg-white hover:text-red-600 ${focusRing}`}
      >
        <Heart
          className="size-4"
          strokeWidth={1.6}
          fill={liked ? '#dc2626' : 'none'}
          stroke={liked ? '#dc2626' : 'currentColor'}
          aria-hidden="true"
        />
      </button>
    </div>

    <a href={`/san-pham/${product.id}`} className="mt-4 flex flex-col">
      {(product.categoryName || product.roomName) && (
        <span className="text-[11px] text-stone-500">
          {[product.categoryName, product.roomName].filter(Boolean).join(' · ')}
        </span>
      )}
      <h2 className="mt-1 line-clamp-2 text-[14px] font-semibold text-stone-900 group-hover:underline">
        {product.name}
      </h2>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-[13px] font-bold text-stone-900">{formatVnd(product.price)}</p>
        {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
          <p className="text-[11px] text-stone-400 line-through">{formatVnd(product.oldPrice)}</p>
        )}
      </div>
    </a>
  </article>
);

const SkeletonGrid = () => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-10 xl:grid-cols-3" aria-busy="true">
    {Array.from({ length: PAGE_SIZE }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="aspect-[4/3] w-full bg-stone-100" />
        <div className="mt-4 h-3 w-1/3 bg-stone-100" />
        <div className="mt-3 h-4 w-3/4 bg-stone-100" />
        <div className="mt-3 h-3 w-1/4 bg-stone-100" />
      </div>
    ))}
  </div>
);

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
            className={`${pageBtn} ${p === page
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

/* ---------- Bộ lọc ---------- */
const FilterGroup = ({ title, children }) => (
  <fieldset className="border-b border-stone-200 pb-5">
    <legend className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-900">
      {title}
    </legend>
    <div className="space-y-0.5">{children}</div>
  </fieldset>
);

const OptionRow = ({ name, checked, onChange, label }) => (
  <label
    className={`flex cursor-pointer items-center justify-between px-2 py-1.5 text-[14px] transition-colors hover:text-orange-700 ${checked ? 'font-semibold text-stone-900' : 'text-stone-600'
      }`}
  >
    <span className="flex items-center gap-2.5">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-3.5 accent-stone-900"
      />
      {label}
    </span>
  </label>
);

const FilterPanel = ({
  idPrefix,
  searchInput,
  onSearchInput,
  categories,
  rooms,
  category,
  room,
  onCategory,
  onRoom,
  hasActiveFilters,
  onReset,
  metaLoading,
}) => (
  <div className="space-y-6">
    {/* Tìm kiếm */}
    <div>
      <label htmlFor={`${idPrefix}-search`} className="sr-only">
        Tìm kiếm sản phẩm
      </label>
      <div className="relative">
        <input
          id={`${idPrefix}-search`}
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)}
          placeholder="Tìm tên sản phẩm..."
          className="h-11 w-full border border-stone-300 bg-white pl-3 pr-10 text-[14px] text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
        />
        <Search
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-stone-500"
          aria-hidden="true"
        />
      </div>
    </div>

    {metaLoading ? (
      <div className="animate-pulse space-y-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-2/3 bg-stone-100" />
        ))}
      </div>
    ) : (
      <>
        {categories.length > 0 && (
          <FilterGroup title="Danh mục">
            <OptionRow
              name={`${idPrefix}-category`}
              checked={category === 'ALL'}
              onChange={() => onCategory('ALL')}
              label="Tất cả danh mục"
            />
            {categories.map((c) => (
              <OptionRow
                key={c.category_id}
                name={`${idPrefix}-category`}
                checked={String(category) === String(c.category_id)}
                onChange={() => onCategory(String(c.category_id))}
                label={c.category_name}
              />
            ))}
          </FilterGroup>
        )}

        {rooms.length > 0 && (
          <FilterGroup title="Không gian phòng">
            <OptionRow
              name={`${idPrefix}-room`}
              checked={room === 'ALL'}
              onChange={() => onRoom('ALL')}
              label="Tất cả không gian"
            />
            {rooms.map((r) => (
              <OptionRow
                key={r.room_id}
                name={`${idPrefix}-room`}
                checked={String(room) === String(r.room_id)}
                onChange={() => onRoom(String(r.room_id))}
                label={r.room_name}
              />
            ))}
          </FilterGroup>
        )}
      </>
    )}

    {hasActiveFilters && (
      <button
        type="button"
        onClick={onReset}
        className={`h-11 w-full border border-[#323139] text-xs font-bold uppercase tracking-widest text-[#323139] transition-colors hover:bg-[#323139] hover:text-white ${focusRing}`}
      >
        Xóa toàn bộ bộ lọc
      </button>
    )}
  </div>
);

const Chip = ({ label, onRemove }) => (
  <button
    type="button"
    onClick={onRemove}
    className={`inline-flex items-center gap-1.5 border border-stone-300 bg-white px-3 py-1.5 text-[12px] text-stone-800 transition-colors hover:border-stone-900 ${focusRing}`}
    aria-label={`Bỏ lọc ${label}`}
  >
    {label}
    <X className="size-3" aria-hidden="true" />
  </button>
);

/* =====================================================================
 * Trang Sản phẩm
 * ===================================================================== */
export const ProductPage = () => {
  /* --- Metadata từ API --- */
  const [metaLoading, setMetaLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [banner, setBanner] = useState(DEFAULT_BANNER);
  const [sortOptions, setSortOptions] = useState(DEFAULT_SORT_OPTIONS);

  /* --- Bộ lọc (áp dụng ngay khi thay đổi, riêng search có debounce) --- */
  const [category, setCategory] = useState('ALL');
  const [room, setRoom] = useState('ALL');
  const [sort, setSort] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  /* --- Dữ liệu sản phẩm --- */
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(null);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [liked, setLiked] = useState(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const gridTopRef = useRef(null);

  /* --- Lấy metadata (danh mục, không gian, banner, sắp xếp) --- */
  useEffect(() => {
    let cancelled = false;
    getProductMetadata()
      .then((res) => {
        if (cancelled) return;
        const meta = res?.data || {};
        setCategories(Array.isArray(meta.categories) ? meta.categories : []);
        setRooms(Array.isArray(meta.rooms) ? meta.rooms : []);

        // Banner & sắp xếp: dùng dữ liệu API nếu có, không thì fallback
        if (meta.banner && typeof meta.banner === 'object') {
          setBanner({
            ...DEFAULT_BANNER,
            ...meta.banner,
            image: meta.banner.image ?? meta.banner.imageUrl ?? meta.banner.image_url ?? '',
          });
        }
        if (Array.isArray(meta.sortOptions) && meta.sortOptions.length > 0) {
          setSortOptions(meta.sortOptions);
        }
      })
      .catch((err) => console.error('[ProductPage] Lỗi lấy metadata sản phẩm:', err))
      .finally(() => !cancelled && setMetaLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  /* --- Debounce ô tìm kiếm --- */
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      setSearch((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* --- Gọi API sản phẩm (hủy kết quả cũ nếu bộ lọc đổi nhanh) --- */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, limit: PAGE_SIZE };
        if (category !== 'ALL') params.category_id = category;
        if (room !== 'ALL') params.room_id = room;
        if (sort) params.sort = sort;
        if (search) params.search = search;

        const res = await getProducts(params);
        if (cancelled) return;

        const list = Array.isArray(res?.data) ? res.data : [];
        setProducts(list.map(normalizeProduct));

        const pg = res?.pagination || {};
        setTotalPages(Math.max(1, Number(pg.totalPages) || 1));
        const total = pg.total ?? pg.totalItems ?? pg.totalProducts;
        setTotalItems(total !== undefined && total !== null ? Number(total) : null);
      } catch (err) {
        if (cancelled) return;
        console.error('[ProductPage] Lỗi lấy danh sách sản phẩm:', err);
        setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [page, category, room, sort, search, reloadKey]);

  /* --- Handlers --- */
  const changeCategory = (v) => {
    setCategory(v);
    setPage(1);
  };
  const changeRoom = (v) => {
    setRoom(v);
    setPage(1);
  };
  const changeSort = (v) => {
    setSort(v);
    setPage(1);
  };

  const handleReset = () => {
    setCategory('ALL');
    setRoom('ALL');
    setSort('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const goTo = (p) => {
    setPage(p);
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleLike = useCallback((id) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hasActiveFilters = category !== 'ALL' || room !== 'ALL' || Boolean(search);
  const activeCategoryName = useMemo(
    () => categories.find((c) => String(c.category_id) === String(category))?.category_name,
    [categories, category]
  );
  const activeRoomName = useMemo(
    () => rooms.find((r) => String(r.room_id) === String(room))?.room_name,
    [rooms, room]
  );

  // Khoá cuộn nền khi mở drawer lọc trên mobile
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const filterProps = {
    searchInput,
    onSearchInput: setSearchInput,
    categories,
    rooms,
    category,
    room,
    onCategory: changeCategory,
    onRoom: changeRoom,
    hasActiveFilters,
    onReset: handleReset,
    metaLoading,
  };

  return (
    <>
      <Banner banner={banner} total={totalItems} />

      <section
        className="mx-auto max-w-[1500px] px-5 pb-24 pt-12 lg:px-[4vw]"
        aria-label="Danh sách sản phẩm"
      >
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
          {/* ── SIDEBAR (desktop) ── */}
          <aside
            className="hidden w-[270px] shrink-0 lg:sticky lg:top-6 lg:block"
            aria-label="Bộ lọc và tìm kiếm"
          >
            <div className="mb-6 border-b border-stone-200 pb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">
                Tìm nhanh
              </p>
              <h2 className="mt-1 text-2xl font-light tracking-tight text-stone-900">Bộ lọc</h2>
            </div>
            <FilterPanel idPrefix="desktop" {...filterProps} />
          </aside>

          {/* ── KHU VỰC CHÍNH ── */}
          <div className="min-w-0 flex-1" ref={gridTopRef}>
            {/* Thanh công cụ */}
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className={`inline-flex h-11 items-center gap-2 border border-[#323139] px-5 text-xs font-bold uppercase tracking-widest text-[#323139] transition-colors hover:bg-[#323139] hover:text-white lg:hidden ${focusRing}`}
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Bộ lọc
                </button>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">
                    Tất cả sản phẩm
                  </p>
                  <p className="mt-1 text-2xl font-light tracking-tight text-stone-900" aria-live="polite">
                    {loading
                      ? 'Đang tải...'
                      : totalItems !== null
                        ? `${totalItems} sản phẩm`
                        : `${products.length} sản phẩm`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="sort-price" className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
                  Sắp xếp
                </label>
                <div className="relative">
                  <select
                    id="sort-price"
                    value={sort}
                    onChange={(e) => changeSort(e.target.value)}
                    className="h-11 appearance-none border border-stone-300 bg-white pl-3 pr-9 text-[14px] text-stone-900 focus:border-stone-900 focus:outline-none"
                  >
                    {sortOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-stone-700"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            {/* Chip bộ lọc đang áp dụng */}
            {hasActiveFilters && (
              <div className="mb-8 flex flex-wrap items-center gap-2">
                {activeCategoryName && (
                  <Chip label={activeCategoryName} onRemove={() => changeCategory('ALL')} />
                )}
                {activeRoomName && <Chip label={activeRoomName} onRemove={() => changeRoom('ALL')} />}
                {search && (
                  <Chip
                    label={`“${search}”`}
                    onRemove={() => {
                      setSearchInput('');
                      setSearch('');
                      setPage(1);
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className={`ml-1 text-[12px] font-semibold text-stone-500 underline hover:text-orange-700 ${focusRing}`}
                >
                  Xóa tất cả
                </button>
              </div>
            )}

            {/* Đang tải */}
            {loading && <SkeletonGrid />}

            {/* Lỗi */}
            {!loading && error && (
              <div className="border border-stone-200 py-20 text-center">
                <p className="text-sm text-stone-600">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className={`mt-4 h-11 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-orange-700 ${focusRing}`}
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Rỗng */}
            {!loading && !error && products.length === 0 && (
              <div className="border border-stone-200 px-5 py-20 text-center">
                <h3 className="text-2xl font-light tracking-tight text-stone-900">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="mt-3 text-[14px] text-stone-600">
                  Hãy thử chọn danh mục khác hoặc xóa bộ lọc tìm kiếm.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className={`mt-6 h-11 border border-[#323139] px-6 text-xs font-bold uppercase tracking-widest text-[#323139] transition-colors hover:bg-[#323139] hover:text-white ${focusRing}`}
                  >
                    Xóa toàn bộ bộ lọc
                  </button>
                )}
              </div>
            )}

            {/* Danh sách */}
            {!loading && !error && products.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 xl:grid-cols-3">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} liked={liked.has(p.id)} onToggle={toggleLike} />
                  ))}
                </div>
                <Pagination page={page} total={totalPages} onChange={goTo} />
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── DRAWER BỘ LỌC (mobile) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Bộ lọc">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Đóng bộ lọc"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h2 className="text-2xl font-light tracking-tight text-stone-900">Bộ lọc</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Đóng"
                className={`grid size-9 place-items-center hover:bg-stone-100 ${focusRing}`}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <FilterPanel idPrefix="mobile" {...filterProps} />
            </div>
            <div className="border-t border-stone-200 p-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className={`h-11 w-full bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-orange-700 ${focusRing}`}
              >
                Xem {totalItems !== null ? totalItems : products.length} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};