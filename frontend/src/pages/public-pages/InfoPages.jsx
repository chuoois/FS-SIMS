import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Mail, MapPin, Phone } from 'lucide-react';

/* ---------- Dữ liệu (thay bằng nội dung thật) ---------- */
const aboutStats = [
  { value: '2020', label: 'Năm thành lập' },
  { value: '6', label: 'Năm hoạt động' },
];

const aboutValues = [
  { title: 'Làm trực tiếp tại xưởng', text: 'Từng sản phẩm được gia công ngay tại xưởng của gia đình, kiểm tra kỹ trước khi giao đến tay bạn.' },
  { title: 'Đặt làm theo nhu cầu', text: 'Kích thước, vật liệu và màu sắc có thể điều chỉnh để phù hợp với không gian của từng nhà.' },
  { title: 'Tư vấn tận tâm', text: 'Trao đổi trực tiếp với người làm ra sản phẩm, rõ ràng về giá cả và thời gian hoàn thiện.' },
];

const contact = {
  name: 'Góc Nhà Showroom',
  // TODO: điền địa chỉ và giờ mở cửa thật của Góc Nhà
  address: ['Địa chỉ showroom', 'Thành phố, Việt Nam'],
  mapUrl: '', // dán link Google Maps; để trống thì địa chỉ hiển thị dạng chữ thường
  phone: { label: '096 9011 078', tel: '0969011078' },
  email: 'gocnhacare@akacompany.com.vn',
  hours: ['Thứ hai — Chủ nhật', '09h — 21h'],
};

/* ---------- Thành phần dùng chung (cùng phong cách trang chủ) ---------- */
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

const SectionHeading = ({ id, eyebrow, children }) => (
  <div className="border-b border-stone-200 pb-4">
    {eyebrow && (
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">{eyebrow}</p>
    )}
    <h2 id={id} className="mt-1 text-2xl font-light tracking-tight text-stone-900 md:text-3xl">
      {children}
    </h2>
  </div>
);

const PageBanner = ({ eyebrow, title, accent, text, image = '' }) => (
  <section
    className="relative isolate flex min-h-[360px] items-end overflow-hidden bg-stone-700 md:min-h-[460px]"
    aria-labelledby="page-title"
  >
    {image ? (
      <img src={image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
    ) : (
      <div className="absolute inset-0 -z-20 bg-stone-700" aria-hidden="true" />
    )}
    <div
      className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/20"
      aria-hidden="true"
    />

    <div className="w-full px-5 pb-14 text-white md:pb-20 lg:px-[4vw]">
      <div className="max-w-[640px]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 sm:text-sm">{eyebrow}</p>
        <h1 id="page-title" className="mt-3 text-4xl font-light italic tracking-tight sm:text-5xl md:mt-4 md:text-6xl">
          {title} <span className="text-amber-400">{accent}</span>
        </h1>
        {text && (
          <p className="mt-4 max-w-[480px] text-sm leading-relaxed text-stone-100 sm:text-base md:mt-6">{text}</p>
        )}
        <nav aria-label="Breadcrumb" className="mt-6 flex items-center gap-2 text-xs">
          <Link to="/" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Trang chủ
          </Link>
          <span aria-hidden="true" className="text-white/70">/</span>
          <span aria-current="page" className="font-bold">{eyebrow.charAt(0) + eyebrow.slice(1).toLowerCase()}</span>
        </nav>
      </div>
    </div>
  </section>
);

const PrimaryLink = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex h-11 items-center gap-2 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900"
  >
    {children}
    <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
  </Link>
);

const OutlineLink = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex h-11 items-center border border-[#323139] px-6 text-xs font-bold uppercase tracking-widest text-[#323139] transition-colors hover:bg-[#323139] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#323139]"
  >
    {children}
  </Link>
);

const containerCls = 'mx-auto max-w-[1500px] px-5 lg:px-[4vw]';

/* ================= VỀ CHÚNG TÔI ================= */
export const AboutPage = () => (
  <>
    <PageBanner
      eyebrow="VỀ CHÚNG TÔI"
      title="Xưởng Nhà"
      accent="Làm Bằng Tâm"
      text="Góc Nhà là xưởng nội thất do gia đình vận hành, làm việc trực tiếp với từng khách hàng."
    />

    <div className="space-y-16 py-14 lg:space-y-24">
      {/* Giới thiệu: chia đôi, giống khối câu chuyện ở trang chủ */}
      <div className={containerCls}>
        <section aria-labelledby="ve-goc-nha" className="grid overflow-hidden bg-stone-100 md:grid-cols-2">
          <Photo
            src=""
            alt="Không gian Góc Nhà"
            tone="bg-stone-300"
            className="min-h-[280px] w-full md:min-h-[440px]"
          />
          <div className="flex flex-col justify-center px-6 py-12 md:px-16">
            <h2 id="ve-goc-nha" className="text-3xl font-light italic tracking-tight text-stone-900 md:text-4xl">
              Về Góc Nhà
            </h2>
            <p className="mt-5 max-w-[440px] text-[14px] leading-relaxed text-stone-700">
              Góc Nhà là xưởng nội thất do gia đình vận hành, bắt đầu hoạt động từ năm 2020. Chúng tôi là một cơ sở kinh
              doanh nhỏ, làm việc trực tiếp với từng khách hàng và chú trọng sự chỉn chu trong từng sản phẩm, từ thiết
              kế, gia công đến lắp đặt.
            </p>
            <div className="mt-8">
              <OutlineLink to="/products">Khám phá sản phẩm</OutlineLink>
            </div>
          </div>
        </section>
      </div>

      {/* Con số */}
      <div className={containerCls}>
        <section aria-labelledby="con-so">
          <SectionHeading id="con-so" eyebrow="Góc Nhà">
            Qua các con số
          </SectionHeading>
          <dl className="mt-8 grid max-w-[640px] gap-x-6 gap-y-10 sm:grid-cols-2">
            {aboutStats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dd className="order-1 text-5xl font-light tracking-tight text-stone-900">{s.value}</dd>
                <dt className="order-2 mt-2 text-[13px] font-semibold text-stone-600">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  </>
);

/* ================= LIÊN HỆ ================= */
const linkCls =
  'transition-colors hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

const InfoBlock = ({ icon: Icon, title, children }) => (
  <div className="flex gap-4 border-t border-stone-200 pt-6">
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-700">
      <Icon className="size-4" strokeWidth={1.6} aria-hidden="true" />
    </span>
    <div>
      <h3 className="text-[14px] font-semibold text-stone-900">{title}</h3>
      <div className="mt-2 grid gap-1 text-[14px] leading-6 text-stone-700">{children}</div>
    </div>
  </div>
);

export const ContactPage = () => {
  const addressLines = contact.address.map((line) => (
    <span key={line} className="block">
      {line}
    </span>
  ));

  return (
    <>
      <PageBanner
        eyebrow="LIÊN HỆ"
        title="Ghé Thăm"
        accent="Góc Nhà"
        text="Gọi điện, gửi email hoặc đến showroom để xem sản phẩm và trao đổi trực tiếp."
      />

      <div className={`${containerCls} py-14 lg:py-20`}>
        <section aria-labelledby="thong-tin-lien-he" className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading id="thong-tin-lien-he" eyebrow={contact.name}>
              Thông tin liên hệ
            </SectionHeading>

            <div className="mt-8 grid gap-6">
              <InfoBlock icon={MapPin} title="Địa chỉ">
                {contact.mapUrl ? (
                  <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
                    {addressLines}
                  </a>
                ) : (
                  <p>{addressLines}</p>
                )}
              </InfoBlock>

              <InfoBlock icon={Phone} title="Điện thoại">
                <a href={`tel:${contact.phone.tel}`} className={linkCls}>
                  {contact.phone.label}
                </a>
              </InfoBlock>

              <InfoBlock icon={Mail} title="Email">
                <a href={`mailto:${contact.email}`} className={`${linkCls} break-all`}>
                  {contact.email}
                </a>
              </InfoBlock>

              <InfoBlock icon={Clock} title="Giờ mở cửa">
                {contact.hours.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </InfoBlock>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={`tel:${contact.phone.tel}`}
                className="inline-flex h-11 items-center gap-2 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900"
              >
                Gọi ngay
                <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              </a>
              <OutlineLink to="/products">Xem sản phẩm</OutlineLink>
            </div>
          </div>

          <Photo
            src=""
            alt="Showroom Góc Nhà"
            tone="bg-stone-300"
            className="min-h-[280px] w-full md:min-h-[440px] lg:h-full"
          />
        </section>
      </div>
    </>
  );
};