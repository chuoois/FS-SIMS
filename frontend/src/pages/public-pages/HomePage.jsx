import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { getProducts } from '../../services/productService';

const IN_STORE_PARAMS = { page: 1, limit: 8 };
const NEW_ARRIVAL_PARAMS = { page: 1, limit: 4, is_new: true, sort_by: 'newest' };

const HERO_SLIDES = [
  {
    eyebrow: 'BỘ SƯU TẬP PHÒNG KHÁCH',
    title: 'Tinh Hoa',
    accent: 'Gỗ Tự Nhiên',
    text: 'Không gian phòng khách sang trọng, ấm cúng với sofa gỗ, bàn trà chế tác tinh xảo từ gỗ sồi và óc chó tuyển chọn.',
    href: '/products',
    image: '/assets/slide_phong_khach.jpg',
  },
  {
    eyebrow: 'KHÔNG GIAN PHÒNG ĂN',
    title: 'Bữa Cơm',
    accent: 'Sum Vầy',
    text: 'Bàn ghế ăn gỗ nguyên khối bền chắc cùng năm tháng, kết nối những khoảnh khắc yêu thương của gia đình.',
    href: '/products',
    image: '/assets/slide_ban_an.png',
  },
  {
    eyebrow: 'NỘI THẤT PHÒNG NGỦ',
    title: 'Chốn Về',
    accent: 'Bình Yên',
    text: 'Giường ngủ, tủ áo và táp đầu giường từ gỗ cao cấp – kiến tạo không gian thư thái cho giấc ngủ an lành.',
    href: '/products',
    image: '/assets/slide_phong_ngu.png',
  },
];

const STORY = {
  title: 'Mỗi góc nhà đều có câu chuyện riêng',
  text: 'Góc Nhà chọn từng món đồ nội thất và trang trí từ các nhà thiết kế, xưởng thủ công mà chúng tôi tin tưởng. Khám phá từng bộ sưu tập để tìm món đồ hợp với căn nhà của bạn.',
  cta: 'Khám phá sản phẩm',
  href: '/products',
  image: '',
};

/* ---------- Tiện ích ---------- */
const formatVnd = (n) => {
  const num = Number(n);
  if (n === null || n === undefined || Number.isNaN(num)) return 'Liên hệ';
  return `${num.toLocaleString('vi-VN')} ₫`;
};

/* Chuẩn hoá sản phẩm từ API (hỗ trợ camelCase & snake_case) */
const normalizeProduct = (p) => {
  const stock = p.stockQuantity ?? p.stock_quantity;
  return {
    id: p.productId ?? p.product_id ?? p.id,
    name: p.productName ?? p.product_name ?? p.name ?? 'Sản phẩm',
    image: p.imageUrl ?? p.image_url ?? p.image ?? '',
    price: p.price,
    oldPrice: p.oldPrice ?? p.old_price ?? null,
    isNew: Boolean(p.isNew ?? p.is_new),
    outOfStock: stock !== undefined && stock !== null && Number(stock) <= 0,
  };
};

/* Hook tải danh sách sản phẩm theo tham số (params nên là hằng số bên ngoài component) */
const useProductList = (params) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getProducts(params)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setItems(list.map(normalizeProduct));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[HomePage] Lỗi lấy sản phẩm:', err);
        setError('Không thể tải sản phẩm. Vui lòng thử lại.');
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [params, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  return { items, loading, error, retry };
};

/* ---------- Thành phần nhỏ ---------- */
const Photo = ({ src, alt, tone = 'bg-stone-200', className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return src && !failed ? (
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />
  ) : (
    <div
      className={`grid place-items-center text-[11px] uppercase tracking-widest text-stone-400 ${tone} ${className}`}
      role="img"
      aria-label={alt}
    >
      Chưa có ảnh
    </div>
  );
};

const SectionHeading = ({ id, eyebrow, children, href = '/products', linkText = 'Xem tất cả' }) => (
  <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
    <div>
      {eyebrow && (
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">{eyebrow}</p>
      )}
      <h2 id={id} className="mt-1 text-2xl font-light tracking-tight text-stone-900 md:text-3xl">
        {children}
      </h2>
    </div>
    {href && (
      <a
        href={href}
        className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-stone-900 hover:text-orange-700"
      >
        {linkText} <ChevronRight className="size-3.5" aria-hidden="true" />
      </a>
    )}
  </div>
);

const ProductCard = ({ product, liked, onToggle }) => (
  <article className="group relative flex flex-col">
    <div className="relative overflow-hidden bg-stone-100">
      <a href={`/products/${product.id}`} aria-label={product.name} className="block">
        <Photo
          src={product.image}
          alt={product.name}
          tone="bg-stone-100"
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105"
        />
      </a>

      <div className="pointer-events-none absolute left-2 top-2 flex gap-1.5">
        {product.isNew && (
          <span className="bg-stone-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Mới
          </span>
        )}
        {product.outOfStock && (
          <span className="bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Hết hàng
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onToggle(product.id)}
        aria-pressed={liked}
        aria-label={`Yêu thích ${product.name}`}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-stone-600 shadow-sm transition hover:bg-white hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
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

    <a href={`/products/${product.id}`} className="mt-4 flex flex-col">
      <h3 className="line-clamp-2 text-[14px] font-semibold text-stone-900 group-hover:underline">{product.name}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-[13px] font-bold text-stone-900">{formatVnd(product.price)}</p>
        {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
          <p className="text-[11px] text-stone-400 line-through">{formatVnd(product.oldPrice)}</p>
        )}
      </div>
    </a>
  </article>
);

const SkeletonGrid = ({ count, cols }) => (
  <div className={`mt-8 grid grid-cols-2 gap-x-6 gap-y-10 ${cols}`} aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="aspect-[4/3] w-full bg-stone-100" />
        <div className="mt-4 h-4 w-3/4 bg-stone-100" />
        <div className="mt-3 h-3 w-1/3 bg-stone-100" />
      </div>
    ))}
  </div>
);

/* ---------- Hero ---------- */
const Hero = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = HERO_SLIDES.length;
  const go = (i) => setIndex((i + count) % count);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduce) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [paused, count]);

  const arrow =
    'absolute top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center border border-white/70 text-white transition-colors hover:bg-white hover:text-[#323139] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:grid';

  return (
    <section
      className="relative isolate min-h-[460px] overflow-hidden bg-stone-700 md:min-h-[640px]"
      aria-roledescription="carousel"
      aria-label="Banner nổi bật"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {HERO_SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} / ${count}`}
          aria-hidden={i !== index}
          className={`absolute inset-0 flex items-end transition-opacity duration-700 ${i === index ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'
            }`}
        >
          {slide.image ? (
            <img src={slide.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
          ) : (
            <div className={`absolute inset-0 -z-20 ${i % 2 ? 'bg-stone-600' : 'bg-stone-700'}`} aria-hidden="true" />
          )}
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/20"
            aria-hidden="true"
          />

          <div className="w-full px-5 pb-20 text-white md:pb-28 lg:px-[4vw]">
            <div className="max-w-[640px]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 sm:text-sm">{slide.eyebrow}</p>
              <h2 className="mt-3 text-4xl font-light italic tracking-tight sm:text-5xl md:mt-4 md:text-7xl">
                {slide.title} <span className="text-amber-400">{slide.accent}</span>
              </h2>
              <p className="mt-4 max-w-[480px] text-sm leading-relaxed text-stone-100 sm:text-base md:mt-6 md:text-lg">
                {slide.text}
              </p>
              <a
                href={slide.href}
                tabIndex={i === index ? 0 : -1}
                className="mt-7 inline-flex h-11 items-center gap-2 bg-white px-6 text-xs font-bold uppercase tracking-widest text-stone-900 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Khám phá ngay
                <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      ))}

      <button type="button" aria-label="Ảnh trước" onClick={() => go(index - 1)} className={`${arrow} left-4`}>
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Ảnh sau" onClick={() => go(index + 1)} className={`${arrow} right-4`}>
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>

      <div className="absolute bottom-7 left-5 z-20 flex items-center gap-2 lg:left-[4vw]">
        {HERO_SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Xem ảnh ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`h-1.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${i === index ? 'w-10 bg-amber-400' : 'w-5 bg-white/50 hover:bg-white/80'
              }`}
          />
        ))}
      </div>
    </section>
  );
};

/* ---------- Mục sản phẩm (dùng cho cả 2 nhóm) ---------- */
const ProductSection = ({ id, anchor, eyebrow, title, params, count, cols, liked, onToggle, emptyText }) => {
  const { items, loading, error, retry } = useProductList(params);

  return (
    <section aria-labelledby={id} id={anchor}>
      <SectionHeading id={id} eyebrow={eyebrow}>
        {title}
      </SectionHeading>

      {loading && <SkeletonGrid count={count} cols={cols} />}

      {!loading && error && (
        <div className="mt-8 border border-stone-200 py-14 text-center">
          <p className="text-sm text-stone-600">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 h-10 bg-stone-900 px-6 text-[12px] font-bold uppercase tracking-widest text-white hover:bg-black"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-8 border border-stone-200 py-14 text-center text-sm text-stone-500">{emptyText}</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className={`mt-8 grid grid-cols-2 gap-x-6 gap-y-10 ${cols}`}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} liked={liked.has(p.id)} onToggle={onToggle} />
          ))}
        </div>
      )}
    </section>
  );
};

/* ---------- Banner xen giữa ---------- */
const Story = () => (
  <section aria-labelledby="cau-chuyen" className="grid overflow-hidden bg-stone-100 md:grid-cols-2">
    <Photo
      src={STORY.image}
      alt="Không gian phòng khách tại Góc Nhà"
      tone="bg-stone-300"
      className="min-h-[280px] w-full md:min-h-[440px]"
    />
    <div className="flex flex-col justify-center px-6 py-12 md:px-16">
      <h2 id="cau-chuyen" className="text-3xl font-light italic tracking-tight text-stone-900 md:text-4xl">
        {STORY.title}
      </h2>
      <p className="mt-5 max-w-[440px] text-[14px] leading-relaxed text-stone-700">{STORY.text}</p>
      <div className="mt-8">
        <a
          href={STORY.href}
          className="inline-flex h-11 items-center border border-[#323139] px-6 text-xs font-bold uppercase tracking-widest text-[#323139] transition-colors hover:bg-[#323139] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#323139]"
        >
          {STORY.cta}
        </a>
      </div>
    </div>
  </section>
);

/* ---------- Trang Home ---------- */
export const HomePage = () => {
  const [liked, setLiked] = useState(() => new Set());
  const toggleLike = useCallback((id) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <>
      <Hero />
      <div className="mx-auto max-w-[1500px] space-y-16 px-5 py-14 lg:space-y-24 lg:px-[4vw]">
        <ProductSection
          id="dang-ban"
          anchor="products"
          eyebrow="Tại cửa hàng"
          title="Sản phẩm đang bán"
          params={IN_STORE_PARAMS}
          count={IN_STORE_PARAMS.limit}
          cols="md:grid-cols-3 xl:grid-cols-4"
          liked={liked}
          onToggle={toggleLike}
          emptyText="Hiện chưa có sản phẩm nào đang bán."
        />

        <Story />

        <ProductSection
          id="hang-moi"
          eyebrow="Mới cập nhật"
          title="Sản phẩm mới về"
          params={NEW_ARRIVAL_PARAMS}
          count={NEW_ARRIVAL_PARAMS.limit}
          cols="md:grid-cols-4"
          liked={liked}
          onToggle={toggleLike}
          emptyText="Chưa có sản phẩm mới về."
        />
      </div>
    </>
  );
};