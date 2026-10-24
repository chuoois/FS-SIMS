import { useEffect, useMemo, useState } from 'react';
import { getProducts } from '../../services/productService';
import { ChevronDown, ChevronRight, Heart, Search, X } from 'lucide-react';

/* ---------- Dữ liệu mẫu (thay bằng API; image: URL ảnh sản phẩm) ---------- */
const banner = { title: 'Sản phẩm', image: '/images/product-banner.jpg' };
const PAGE_SIZE = 8;

const sortOptions = [
  { value: 'asc', label: 'Theo giá: Thấp đến cao' },
  { value: 'desc', label: 'Theo giá: Cao đến thấp' }
];

const filterGroups = [
  { key: 'category', label: 'Danh mục' },
  { key: 'room', label: 'Không gian' },
  { key: 'material', label: 'Chất liệu' },
  { key: 'color', label: 'Màu sắc' },
];

const formatVnd = (n) => `${n.toLocaleString('en-US')} VND`;

/* Trả về dãy số trang kèm dấu '…' (vd: 1 2 3 4 … 16 17 18) */
const getPages = (current, total) => {
  if (total <= 8) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, '…', total - 2, total - 1, total];
  if (current >= total - 3) return [1, 2, 3, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
};

/* ---------- Thành phần ---------- */
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
  <section className="relative isolate flex min-h-[220px] items-end overflow-hidden bg-stone-400 md:h-[25.5vw] md:max-h-[520px]" aria-labelledby="sp-title">
    {banner.image && <img src={banner.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />}
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
    <div className="px-5 pb-10 text-white lg:px-[4vw]">
      <h1 id="sp-title" className="text-3xl font-light md:text-4xl">{banner.title}</h1>
      <nav aria-label="Breadcrumb" className="mt-4 flex items-center gap-2 text-xs">
        <a href="/" className="hover:underline">Trang chủ</a>
        <span aria-hidden="true" className="text-white/70">/</span>
        <span aria-current="page" className="font-bold">Sản phẩm</span>
      </nav>
    </div>
  </section>
);

const SearchBar = ({ value, onChange }) => (
  <div className="mx-auto max-w-[1710px] px-5 pt-10 lg:px-[4vw]">
    <label htmlFor="product-search" className="mb-2 block text-sm font-medium text-stone-700">Tìm sản phẩm</label>
    <div className="relative max-w-xl">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" aria-hidden="true" />
      <input id="product-search" type="search" value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Nhập tên, mã hoặc mô tả sản phẩm"
        className="w-full border border-stone-300 bg-white py-3 pl-10 pr-10 text-sm text-stone-900 outline-none focus:border-stone-700" />
      {value && <button type="button" onClick={() => onChange('')} aria-label="Xóa nội dung tìm kiếm" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"><X className="size-4" /></button>}
    </div>
  </div>
);

const FilterSidebar = ({ products, selected, onToggle, onClear }) => (
  <aside className="self-start border border-stone-200 bg-white p-5" aria-label="Bộ lọc sản phẩm">
    <div className="mb-5 flex items-center justify-between border-b border-stone-200 pb-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-stone-900">Bộ lọc</h2>
      <button type="button" onClick={onClear} className="text-xs text-stone-600 underline hover:text-black">Xóa lọc</button>
    </div>
    {filterGroups.map(({ key, label }) => {
      const options = [...new Set(products.map((product) => product[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
      return (
        <fieldset key={key} className="mb-5 last:mb-0">
          <legend className="mb-3 text-sm font-semibold text-stone-800">{label}</legend>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {options.map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={selected[key].includes(option)} onChange={() => onToggle(key, option)} className="size-4 accent-stone-900" />
                <span>{option}</span>
              </label>
            ))}
            {options.length === 0 && <p className="text-xs text-stone-500">Đang tải lựa chọn...</p>}
          </div>
        </fieldset>
      );
    })}
  </aside>
);

const FilterBar = ({ value, onChange, onApply }) => (
  <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
    <div className="w-full max-w-[265px]">
      <label htmlFor="sort-price" className="block text-[13px] text-stone-700">Giá</label>
      <div className="relative mt-2 border-b border-stone-700">
        <select
          id="sort-price"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent py-2 pr-6 text-[13px] text-stone-900 focus:outline-none"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-stone-800" aria-hidden="true" />
      </div>
    </div>

    <button
      type="button"
      onClick={onApply}
      className="h-10 bg-[#232226] px-5 text-sm font-medium uppercase text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#232226]"
    >
      Áp dụng
    </button>
  </div>
);

const ProductCard = ({ product, liked, onToggle }) => (
  <article className="group relative flex flex-col">
    <div className="absolute right-2 top-2 z-10 flex items-start gap-2">
      {product.isNew && <NewBadge />}
      <button
        type="button"
        onClick={() => onToggle(product.id)}
        aria-pressed={liked}
        aria-label={`Yêu thích ${product.name}`}
        className="text-stone-600 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
      >
        <Heart className="size-4" strokeWidth={1.6} fill={liked ? '#dc2626' : 'none'} stroke={liked ? '#dc2626' : 'currentColor'} aria-hidden="true" />
      </button>
    </div>
    <a href={`/san-pham/${product.id}`} className="flex flex-col">
      <Photo
        src={product.image}
        alt={product.name}
        className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <h2 className="mt-5 text-[13px] font-bold text-stone-900">{product.name}</h2>
      <p className="mt-4 text-[11px] font-bold text-stone-800">{formatVnd(product.price)}</p>
    </a>
  </article>
);

const boxCls =
  'grid size-[38px] place-items-center border border-stone-800 text-[15px] font-bold text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  return (
    <nav aria-label="Phân trang" className="mt-14 flex flex-wrap items-center justify-center gap-1.5">
      {getPages(page, total).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} aria-hidden="true" className="grid size-[38px] place-items-center rounded-full border border-stone-800 text-xs font-bold">…</span>
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
      {page < total && (
        <button type="button" onClick={() => onChange(page + 1)} aria-label="Trang sau" className={boxCls}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </nav>
  );
};

/* ---------- Trang Sản phẩm (route con của HomeLayout) ---------- */
export const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sortDraft, setSortDraft] = useState('asc');
  const [sort, setSort] = useState('asc');
  const [page, setPage] = useState(1);
  const [liked, setLiked] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({ category: [], room: [], material: [], color: [] });

  useEffect(() => {
    let active = true;
    getProducts()
      .then((items) => { if (active) setProducts(Array.isArray(items) ? items : []); })
      .catch((error) => {
        console.error('[ProductPage] Không tải được sản phẩm:', error);
        if (active) setLoadError('Không thể tải sản phẩm. Vui lòng thử lại sau.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    const list = products.filter((product) => {
      const matchesSearch = !query || [product.name, product.code, product.description]
        .some((value) => String(value ?? '').toLocaleLowerCase('vi').includes(query));
      const matchesFilters = filterGroups.every(({ key }) =>
        selectedFilters[key].length === 0 || selectedFilters[key].includes(product[key]),
      );
      return matchesSearch && matchesFilters;
    });
    if (sort === 'asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, sort, search, selectedFilters]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const visible = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleLike = (id) =>
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const apply = () => {
    setSort(sortDraft);
    setPage(1);
  };

  const toggleFilter = (key, value) => {
    setSelectedFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedFilters({ category: [], room: [], material: [], color: [] });
    setPage(1);
  };

  const goTo = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Banner />
      <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1); }} />

      <section className="mx-auto max-w-[1710px] px-5 pb-20 pt-12 lg:px-[4vw]" aria-label="Danh sách sản phẩm">
        <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <FilterSidebar products={products} selected={selectedFilters} onToggle={toggleFilter} onClear={clearFilters} />
          <div className="min-w-0">
            <FilterBar value={sortDraft} onChange={setSortDraft} onApply={apply} />
            <p className="my-4 text-sm text-stone-600" aria-live="polite">
              {loading ? 'Đang tải sản phẩm...' : `${filteredProducts.length} sản phẩm`}
            </p>
            {loadError && <p className="mb-6 text-center text-red-700">{loadError}</p>}
            {!loading && !loadError && filteredProducts.length === 0 && <p className="mb-6 py-10 text-center text-stone-600">Không tìm thấy sản phẩm phù hợp.</p>}
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} liked={liked.has(p.id)} onToggle={toggleLike} />
              ))}
            </div>
            <Pagination page={page} total={totalPages} onChange={goTo} />
          </div>
        </div>
      </section>
    </>
  );
};
