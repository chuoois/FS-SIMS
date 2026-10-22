import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';

/* ---------- Dữ liệu mẫu (thay bằng API / dữ liệu thật) ---------- */
const bestSellers = [
  { id: 1, name: 'Thảm Delicate 08', price: 21900000, image: '' },
  { id: 2, name: 'Thảm Delicate 06', price: 21900000, image: '' },
  { id: 3, name: 'Thảm Ultimate 04', price: 21900000, image: '' },
  { id: 4, name: 'Gương Specchi', price: 59900000, image: '' },
  { id: 5, name: 'Sofa da Nova 2 chỗ', price: 38500000, image: '' },
  { id: 6, name: 'Ghế ăn Tania', price: 7200000, image: '' },
  { id: 7, name: 'Đèn thả Pirce', price: 12800000, image: '' },
  { id: 8, name: 'Bàn trà Nami', price: 9600000, image: '' },
];

const newArrivals = [
  { id: 11, name: 'Nến thơm Côte Noire', price: 1250000, image: '' },
  { id: 12, name: 'Bình hoa gốm Aria', price: 3400000, image: '' },
  { id: 13, name: 'Gối tựa Lino', price: 1850000, image: '' },
  { id: 14, name: 'Đèn bàn Orbit', price: 6900000, image: '' },
];

const categories = [
  { name: 'Sofa & Ghế', href: '#san-pham', tone: 'bg-stone-300', image: '' },
  { name: 'Thảm', href: '#san-pham', tone: 'bg-amber-100', image: '' },
  { name: 'Đèn', href: '#san-pham', tone: 'bg-stone-200', image: '' },
  { name: 'Gương', href: '#san-pham', tone: 'bg-orange-100', image: '' },
  { name: 'Bàn', href: '#san-pham', tone: 'bg-stone-300', image: '' },
  { name: 'Hoa & Hương thơm', href: '#san-pham', tone: 'bg-amber-100', image: '' },
];

const heroSlides = [
  {
    eyebrow: 'BỘ SƯU TẬP PHÒNG KHÁCH',
    title: 'Tinh Hoa',
    accent: 'Gỗ Tự Nhiên',
    text: 'Không gian phòng khách sang trọng, ấm cúng với sofa gỗ, bàn trà chế tác tinh xảo từ gỗ sồi và óc chó tuyển chọn.',
    href: '#san-pham',
    image: '/assets/slide_phong_khach.jpg',
  },
  {
    eyebrow: 'KHÔNG GIAN PHÒNG ĂN',
    title: 'Bữa Cơm',
    accent: 'Sum Vầy',
    text: 'Bàn ghế ăn gỗ nguyên khối bền chắc cùng năm tháng, kết nối những khoảnh khắc yêu thương của gia đình.',
    href: '#san-pham',
    image: '/assets/slide_ban_an.png',
  },
  {
    eyebrow: 'NỘI THẤT PHÒNG NGỦ',
    title: 'Chốn Về',
    accent: 'Bình Yên',
    text: 'Giường ngủ, tủ áo và táp đầu giường từ gỗ cao cấp – kiến tạo không gian thư thái cho giấc ngủ an lành.',
    href: '#san-pham',
    image: '/assets/slide_phong_ngu.png',
  },
];

const formatVnd = (n) => `${n.toLocaleString('en-US')} VND`;

/* ---------- Thành phần nhỏ ---------- */
const Photo = ({ src, alt, tone, className = '' }) =>
  src ? (
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  ) : (
    <div className={`${tone ?? 'bg-stone-200'} ${className}`} role="img" aria-label={alt} />
  );

const SectionHeading = ({ id, children, href = '#san-pham', linkText = 'xem tất cả' }) => (
  <div className="flex items-baseline gap-5 border-b border-stone-200 pb-2">
    <h2 id={id} className="border-b border-orange-700 pb-2 text-[15px] font-medium uppercase text-stone-900">
      {children}
    </h2>
    {href && (
      <a href={href} className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-900 hover:text-orange-700">
        {linkText} <ChevronRight className="size-3" aria-hidden="true" />
      </a>
    )}
  </div>
);

const ProductCard = ({ product, liked, onToggle }) => (
  <article className="group relative flex flex-col">
    <button
      type="button"
      onClick={() => onToggle(product.id)}
      aria-pressed={liked}
      aria-label={`Yêu thích ${product.name}`}
      className="absolute right-2 top-2 z-10 text-stone-600 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
    >
      <Heart className="size-4" strokeWidth={1.6} fill={liked ? '#dc2626' : 'none'} stroke={liked ? '#dc2626' : 'currentColor'} aria-hidden="true" />
    </button>
    <a href={`#san-pham-${product.id}`} className="flex flex-col">
      <Photo
        src={product.image}
        alt={product.name}
        tone="bg-stone-100"
        className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <h3 className="mt-5 text-[13px] font-bold text-stone-900">{product.name}</h3>
      <p className="mt-4 text-[11px] font-bold text-stone-800">{formatVnd(product.price)}</p>
    </a>
  </article>
);

const Hero = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = heroSlides.length;
  const go = (i) => setIndex((i + count) % count);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduce) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [paused, count]);

  const arrow =
    'absolute top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center border border-white/70 text-white transition-colors hover:bg-white hover:text-[#323139] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  return (
    <section
      className="relative isolate min-h-[420px] overflow-hidden bg-stone-700 md:min-h-[640px]"
      aria-roledescription="carousel"
      aria-label="Banner nổi bật"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {heroSlides.map((slide, i) => (
        <div
          key={slide.title}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} / ${count}`}
          aria-hidden={i !== index}
          className={`absolute inset-0 flex items-end transition-opacity duration-700 ${i === index ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          {slide.image ? (
            <img src={slide.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
          ) : (
            <div className={`absolute inset-0 -z-20 ${i % 2 ? 'bg-stone-600' : 'bg-stone-700'}`} aria-hidden="true" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/25" aria-hidden="true" />

          <div className="w-full px-5 pb-16 text-white md:pb-24 lg:px-[4vw]">
            <div className="max-w-[640px]">
              <p className="text-xs font-bold tracking-wider text-amber-400 uppercase sm:text-sm">{slide.eyebrow}</p>
              <h2 className="mt-3 text-4xl font-light italic tracking-tight sm:text-5xl md:mt-4 md:text-7xl">
                {slide.title} <span className="text-amber-400">{slide.accent}</span>
              </h2>
              <p className="mt-4 max-w-[480px] text-sm font-medium leading-relaxed text-stone-100 sm:text-base md:mt-6 md:text-lg">{slide.text}</p>
              <a
                href={slide.href}
                tabIndex={i === index ? 0 : -1}
                className="mt-6 inline-flex h-9 items-center gap-2 border border-white px-5 text-xs font-bold transition-colors hover:bg-white hover:text-[#323139] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {heroSlides.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Xem ảnh ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`h-1.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${i === index ? 'w-8 bg-white' : 'w-4 bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </section>
  );
};

/* ---------- Mới: danh mục ---------- */
const Categories = () => (
  <section aria-labelledby="danh-muc">
    <SectionHeading id="danh-muc" href={null}>Mua theo danh mục</SectionHeading>
    <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {categories.map((c) => (
        <li key={c.name}>
          <a href={c.href} className="group relative block overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">
            <Photo src={c.image} alt={c.name} tone={c.tone} className="aspect-[3/4] w-full transition-transform duration-500 group-hover:scale-[1.04]" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 pb-3 pt-10 text-[13px] font-bold text-white">
              {c.name}
            </span>
          </a>
        </li>
      ))}
    </ul>
  </section>
);

/* ---------- Danh sách sản phẩm dùng lại cho nhiều mục ---------- */
const ProductSection = ({ id, anchor, title, products, cols = 'md:grid-cols-3 xl:grid-cols-4' }) => {
  const [liked, setLiked] = useState(() => new Set());
  const toggle = (pid) =>
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });

  return (
    <section aria-labelledby={id} id={anchor}>
      <SectionHeading id={id}>{title}</SectionHeading>
      <div className={`mt-8 grid grid-cols-2 gap-x-6 gap-y-10 ${cols}`}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} liked={liked.has(p.id)} onToggle={toggle} />
        ))}
      </div>
    </section>
  );
};

/* ---------- Mới: banner xen giữa (ảnh + chữ chia đôi) ---------- */
const Story = () => (
  <section aria-labelledby="cau-chuyen" className="grid overflow-hidden bg-stone-100 md:grid-cols-2">
    <Photo src="" alt="Không gian phòng khách tại Góc Nhà" tone="bg-stone-300" className="min-h-[280px] w-full md:min-h-[420px]" />
    <div className="flex flex-col justify-center px-6 py-10 md:px-14">
      <h2 id="cau-chuyen" className="text-3xl font-light italic tracking-tight text-stone-900 md:text-4xl">
        Mỗi góc nhà đều có câu chuyện riêng
      </h2>
      <p className="mt-5 max-w-[440px] text-[14px] leading-relaxed text-stone-700">
        Góc Nhà chọn từng món đồ nội thất và trang trí từ các nhà thiết kế, xưởng thủ công mà chúng tôi tin tưởng. Khám phá từng bộ sưu tập để tìm món đồ hợp với căn nhà của bạn.
      </p>
      <div className="mt-7">
        <a
          href="#san-pham"
          className="inline-flex h-9 items-center border border-[#323139] px-5 text-xs font-bold text-[#323139] transition-colors hover:bg-[#323139] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#323139]"
        >
          Khám phá sản phẩm
        </a>
      </div>
    </div>
  </section>
);

/* ---------- Trang Home (đặt làm route index trong HomeLayout) ---------- */
export const HomePage = () => (
  <>
    <Hero />
    <div className="mx-auto max-w-[1500px] space-y-16 px-5 py-12 lg:space-y-20 lg:px-[4vw]">
      <Categories />
      <ProductSection id="ban-chay" anchor="san-pham" title="Bán chạy nhất" products={bestSellers} />
      <Story />
      <ProductSection id="hang-moi" title="Hàng mới về" products={newArrivals} cols="md:grid-cols-4" />
    </div>
  </>
);