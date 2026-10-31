import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Heart, Search } from 'lucide-react';
import { getProducts, getProductMetadata } from '../../services/productService';

/* ---------- Dữ liệu cấu hình & phân trang ---------- */
const banner = { title: 'Sản phẩm', image: '' };
const PAGE_SIZE = 8;

const sortOptions = [
  { value: '', label: 'Mặc định' },
  { value: 'asc', label: 'Theo giá: Thấp đến cao' },
  { value: 'desc', label: 'Theo giá: Cao đến thấp' },
];

const formatVnd = (n) => {
  if (n === null || n === undefined || isNaN(Number(n))) return '0 VND';
  return `${Number(n).toLocaleString('en-US')} VND`;
};

/* Trả về dãy số trang kèm dấu '…' (vd: 1 2 3 4 … 16 17 18) */
const getPages = (current, total) => {
  if (total <= 8) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, '…', total - 2, total - 1, total];
  if (current >= total - 3) return [1, 2, 3, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
};

/* ---------- Thành phần nhỏ (đồng bộ toàn bộ website) ---------- */
const Photo = ({ src, alt, className = '' }) =>
  src ? (
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  ) : (
    <div className={`bg-stone-100 ${className}`} role="img" aria-label={alt} />
  );

const NewBadge = () => (
  <span
    className="inline-block bg-red-600 px-1.5 pb-2 pt-1 text-[10px] font-extrabold leading-none text-white"
    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)' }}
  >
    NEW
  </span>
);

const Banner = () => (
  <section
    className="relative isolate flex min-h-[220px] items-end overflow-hidden bg-stone-400 md:h-[25.5vw] md:max-h-[520px]"
    aria-labelledby="sp-title"
  >
    {banner.image && (
      <img src={banner.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
    )}
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
    <div className="px-5 pb-10 text-white lg:px-[4vw]">
      <h1 id="sp-title" className="text-3xl font-light md:text-4xl">
        {banner.title}
      </h1>
      <nav aria-label="Breadcrumb" className="mt-4 flex items-center gap-2 text-xs">
        <a href="/" className="hover:underline">
          Trang chủ
        </a>
        <span aria-hidden="true" className="text-white/70">
          /
        </span>
        <span aria-current="page" className="font-bold">
          Sản phẩm
        </span>
      </nav>
    </div>
  </section>
);

const ProductCard = ({ product, liked, onToggle }) => {
  const pId = product.productId || product.id;
  const pName = product.productName || product.name || 'Sản phẩm';
  const pImg = product.imageUrl || product.image || '';
  const isOutOfStock = product.stockQuantity !== undefined && Number(product.stockQuantity) <= 0;

  return (
    <article className="group relative flex flex-col">
      <div className="absolute right-2 top-2 z-10 flex items-start gap-2">
        {product.isNew && <NewBadge />}
        <button
          type="button"
          onClick={() => onToggle(pId)}
          aria-pressed={liked}
          aria-label={`Yêu thích ${pName}`}
          className="text-stone-600 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
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
      <a href={`/san-pham/${pId}`} className="flex flex-col">
        <Photo
          src={pImg}
          alt={pName}
          className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <h2 className="mt-5 text-[13px] font-bold text-stone-900">{pName}</h2>
        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-[11px] font-bold text-stone-800">{formatVnd(product.price)}</p>
          {isOutOfStock && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
              Hết hàng
            </span>
          )}
        </div>
      </a>
    </article>
  );
};

const boxCls =
  'grid size-[38px] place-items-center border border-stone-800 text-[15px] font-bold text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

const Pagination = ({ page, total, onChange }) => {
  const safeTotal = Math.max(1, total || 1);
  return (
    <nav aria-label="Phân trang" className="mt-14 flex flex-wrap items-center justify-center gap-1.5">
      {getPages(page, safeTotal).map((p, i) =>
        p === '…' ? (
          <span
            key={`e${i}`}
            aria-hidden="true"
            className="grid size-[38px] place-items-center rounded-full border border-stone-800 text-xs font-bold"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Trang ${p}`}
            className={`${boxCls} ${p === page ? 'bg-[#232226] text-white hover:bg-[#232226]' : ''}`}
          >
            {p}
          </button>
        )
      )}
      {page < safeTotal && (
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
          className={boxCls}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </nav>
  );
};

/* ---------- Trang Sản phẩm (route con của HomeLayout) ---------- */
export const ProductPage = () => {
  // Metadata phục vụ bộ lọc
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Draft filters (lưu trước khi bấm Áp dụng)
  const [categoryDraft, setCategoryDraft] = useState('ALL');
  const [roomDraft, setRoomDraft] = useState('ALL');
  const [sortDraft, setSortDraft] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  // Applied filters (dùng để gọi API)
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [sort, setSort] = useState('');
  const [search, setSearch] = useState('');

  // Dữ liệu sản phẩm & phân trang từ API
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Trạng thái tải & lỗi
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Yêu thích
  const [liked, setLiked] = useState(() => new Set());

  // Lấy metadata danh mục & không gian khi mount
  useEffect(() => {
    let isMounted = true;
    getProductMetadata()
      .then((res) => {
        if (!isMounted) return;
        const meta = res?.data || {};
        setCategories(Array.isArray(meta.categories) ? meta.categories : []);
        setRooms(Array.isArray(meta.rooms) ? meta.rooms : []);
      })
      .catch((err) => {
        console.error('[ProductPage] Lỗi lấy metadata sản phẩm:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Gọi API lấy danh sách sản phẩm
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      };

      if (selectedCategory && selectedCategory !== 'ALL') {
        params.category_id = selectedCategory;
      }

      if (selectedRoom && selectedRoom !== 'ALL') {
        params.room_id = selectedRoom;
      }

      if (sort) {
        params.sort = sort;
      }

      if (search) {
        params.search = search;
      }

      const res = await getProducts(params);
      const dataList = Array.isArray(res?.data) ? res.data : [];
      setProducts(dataList);

      const paginationMeta = res?.pagination || {};
      setTotalPages(Math.max(1, paginationMeta.totalPages || 1));
    } catch (err) {
      console.error('[ProductPage] Lỗi lấy danh sách sản phẩm:', err);
      setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, selectedRoom, sort, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Áp dụng bộ lọc
  const handleApply = () => {
    setSelectedCategory(categoryDraft);
    setSelectedRoom(roomDraft);
    setSort(sortDraft);
    setSearch(searchDraft.trim());
    setPage(1);
  };

  // Đặt lại toàn bộ bộ lọc
  const handleReset = () => {
    setCategoryDraft('ALL');
    setRoomDraft('ALL');
    setSortDraft('');
    setSearchDraft('');

    setSelectedCategory('ALL');
    setSelectedRoom('ALL');
    setSort('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters =
    selectedCategory !== 'ALL' ||
    selectedRoom !== 'ALL' ||
    Boolean(sort) ||
    Boolean(search);

  const toggleLike = (id) =>
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const goTo = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Banner />

      <section
        className="mx-auto max-w-[1710px] px-5 pb-20 pt-12 lg:px-[4vw]"
        aria-label="Danh sách sản phẩm"
      >
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* ── SIDEBAR BỘ LỌC BÊN TRÁI ── */}
          <aside className="w-full lg:w-[265px] lg:shrink-0" aria-label="Bộ lọc & Tìm kiếm">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-[15px] font-medium uppercase text-stone-900">
                Bộ lọc & Tìm kiếm
              </h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-bold uppercase text-stone-500 hover:text-stone-900"
                >
                  Đặt lại
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApply();
              }}
              className="mt-6 space-y-6"
            >
              {/* 1. Tìm kiếm */}
              <div>
                <label htmlFor="search-input" className="block text-[13px] text-stone-700">
                  Tìm kiếm
                </label>
                <div className="relative mt-2 border-b border-stone-700">
                  <input
                    id="search-input"
                    type="text"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Nhập tên sản phẩm..."
                    className="w-full appearance-none bg-transparent py-2 pr-6 text-[13px] text-stone-900 placeholder:text-stone-400 focus:outline-none"
                  />
                  <Search
                    className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-stone-800"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* 2. Danh mục */}
              <div>
                <label htmlFor="category-select" className="block text-[13px] text-stone-700">
                  Danh mục
                </label>
                <div className="relative mt-2 border-b border-stone-700">
                  <select
                    id="category-select"
                    aria-label="Danh mục"
                    value={categoryDraft}
                    onChange={(e) => setCategoryDraft(e.target.value)}
                    className="w-full appearance-none bg-transparent py-2 pr-6 text-[13px] text-stone-900 focus:outline-none"
                  >
                    <option value="ALL">Tất cả danh mục</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-stone-800"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* 3. Không gian phòng */}
              <div>
                <label htmlFor="room-select" className="block text-[13px] text-stone-700">
                  Không gian phòng
                </label>
                <div className="relative mt-2 border-b border-stone-700">
                  <select
                    id="room-select"
                    aria-label="Không gian phòng"
                    value={roomDraft}
                    onChange={(e) => setRoomDraft(e.target.value)}
                    className="w-full appearance-none bg-transparent py-2 pr-6 text-[13px] text-stone-900 focus:outline-none"
                  >
                    <option value="ALL">Tất cả không gian</option>
                    {rooms.map((r) => (
                      <option key={r.room_id} value={r.room_id}>
                        {r.room_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-stone-800"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* 4. Sắp xếp giá */}
              <div>
                <label htmlFor="sort-price" className="block text-[13px] text-stone-700">
                  Giá
                </label>
                <div className="relative mt-2 border-b border-stone-700">
                  <select
                    id="sort-price"
                    value={sortDraft}
                    onChange={(e) => setSortDraft(e.target.value)}
                    className="w-full appearance-none bg-transparent py-2 pr-6 text-[13px] text-stone-900 focus:outline-none"
                  >
                    {sortOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-stone-800"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Nút thao tác */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  className="h-10 w-full bg-[#232226] px-5 text-sm font-medium uppercase text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#232226]"
                >
                  Áp dụng
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="block w-full py-1 text-center text-[12px] font-medium text-stone-600 underline hover:text-stone-900"
                  >
                    Xóa toàn bộ bộ lọc
                  </button>
                )}
              </div>
            </form>
          </aside>

          {/* ── KHU VỰC DANH SÁCH SẢN PHẨM BÊN PHẢI ── */}
          <div className="flex-1">
            {/* Đang tải */}
            {loading && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] w-full bg-stone-100" />
                    <div className="mt-5 h-4 w-3/4 bg-stone-100" />
                    <div className="mt-4 h-3 w-1/3 bg-stone-100" />
                  </div>
                ))}
              </div>
            )}

            {/* Thông báo lỗi */}
            {!loading && error && (
              <div className="py-20 text-center">
                <p className="text-sm text-stone-600">{error}</p>
                <button
                  type="button"
                  onClick={fetchProducts}
                  className="mt-4 h-10 bg-[#232226] px-5 text-sm font-medium uppercase text-white hover:bg-black"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Trạng thái rỗng */}
            {!loading && !error && products.length === 0 && (
              <div className="py-20 text-center">
                <h3 className="text-base font-semibold text-stone-900">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="mt-2 text-xs text-stone-500">
                  Hãy thử chọn danh mục khác hoặc xóa bộ lọc tìm kiếm.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-4 inline-block text-xs font-semibold uppercase underline text-stone-900"
                  >
                    Xóa toàn bộ bộ lọc
                  </button>
                )}
              </div>
            )}

            {/* Danh sách sản phẩm thực tế */}
            {!loading && !error && products.length > 0 && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => (
                  <ProductCard
                    key={p.productId || p.id}
                    product={p}
                    liked={liked.has(p.productId || p.id)}
                    onToggle={toggleLike}
                  />
                ))}
              </div>
            )}

            {/* Phân trang */}
            {!loading && !error && products.length > 0 && (
              <Pagination page={page} total={totalPages} onChange={goTo} />
            )}
          </div>
        </div>
      </section>
    </>
  );
};