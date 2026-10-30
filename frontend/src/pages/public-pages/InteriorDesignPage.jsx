import { useEffect, useId, useState } from 'react';
import { ChevronDown, ChevronUp, Phone } from 'lucide-react';

/* ---------- Dữ liệu (thay ảnh bằng URL thật ở trường image) ---------- */
const PHONE = '0969011078';

const hero = {
  eyebrow: 'DỊCH VỤ THIẾT KẾ',
  title: 'Thiết Kế',
  accent: 'Nội Thất',
  text: 'Liên hệ trực tiếp với xưởng Góc Nhà để được tư vấn giải pháp nội thất phù hợp với ngôi nhà và ngân sách của bạn.',
  image: '',
};

const reasons = [
  {
    title: 'Thực tế giống với 3D',
    heading: 'Hình dung rõ trước khi thi công',
    text: 'Bản vẽ 3D được dựng dựa trên số đo thực tế tại nhà bạn. Chúng tôi trao đổi cụ thể về vật liệu và kích thước để thành phẩm sát với bản thiết kế đã duyệt.',
    image: '',
    tone: 'bg-[#232226]',
  },
  {
    title: 'Luôn cá nhân hóa',
    heading: 'Làm theo nhu cầu',
    text: 'Bạn muốn một mẫu thiết kế dành riêng cho căn nhà của mình? Hãy cho Góc Nhà biết nhu cầu, sở thích và ngân sách, chúng tôi sẽ cùng bạn chọn phương án phù hợp với phong cách riêng của bạn.',
    image: '',
    tone: 'bg-[#323139]',
  },
  {
    title: 'Tư vấn tận tâm',
    heading: 'Làm việc trực tiếp, rõ ràng',
    text: 'Bạn trao đổi trực tiếp với người làm ra sản phẩm và được tư vấn rõ ràng về chi phí, thời gian hoàn thiện. Sau khi bàn giao, Góc Nhà hỗ trợ bảo hành và sửa chữa nếu có vấn đề phát sinh.',
    image: '',
    tone: 'bg-stone-600',
  },
];

const steps = [
  { title: 'Tiếp nhận thông tin và khảo sát', text: 'Góc Nhà lắng nghe nhu cầu, ngân sách và phong cách bạn yêu thích, sau đó đến khảo sát hiện trạng để đo đạc thực tế.' },
  { title: 'Thiết kế ý tưởng', text: 'Góc Nhà đề xuất bố trí mặt bằng, bảng vật liệu và màu sắc để bạn cùng chọn hướng đi cho không gian.' },
  { title: 'Thiết kế phối cảnh 3D', text: 'Ý tưởng được dựng thành hình ảnh 3D chi tiết, giúp bạn hình dung rõ căn nhà trước khi thi công và điều chỉnh nếu cần.' },
  { title: 'Ký hợp đồng thi công', text: 'Hai bên thống nhất hạng mục, tiến độ và chi phí, sau đó ký hợp đồng thi công.' },
  { title: 'Triển khai thi công', text: 'Thợ của xưởng thi công theo đúng bản vẽ đã duyệt và cập nhật tiến độ thường xuyên cho bạn.' },
  { title: 'Nghiệm thu bàn giao', text: 'Cùng bạn kiểm tra công trình, hoàn thiện những chi tiết cuối cùng và bàn giao kèm chế độ bảo hành.' },
].map((s, i) => ({ ...s, no: String(i + 1).padStart(2, '0') }));

const stepRows = [
  { steps: steps.slice(0, 2), image: '', tone: 'bg-stone-400', imageSide: 'right', cols: 'md:grid-cols-[24fr_76fr]', alt: 'Bếp nội thất gỗ' },
  { steps: steps.slice(2, 4), image: '', tone: 'bg-stone-300', imageSide: 'left', cols: 'md:grid-cols-[76fr_24fr]', alt: 'Phòng khách và bếp mở' },
  { steps: steps.slice(4, 6), image: '', tone: 'bg-stone-500', imageSide: 'right', cols: 'md:grid-cols-[33fr_67fr]', alt: 'Phòng ngủ' },
];

/* ---------- Thành phần dùng chung ---------- */
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

const SectionHeading = ({ id, eyebrow, children, intro }) => (
  <div className="border-b border-stone-200 pb-4">
    {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">{eyebrow}</p>}
    <h2 id={id} className="mt-1 text-2xl font-light tracking-tight text-stone-900 md:text-3xl">
      {children}
    </h2>
    {intro && <p className="mt-3 max-w-[720px] text-[14px] leading-relaxed text-stone-600">{intro}</p>}
  </div>
);

const Accordion = ({ title, children, defaultOpen = false, variant = 'plain', Icons = [ChevronDown, ChevronUp], lead }) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const Icon = open ? Icons[1] : Icons[0];
  const head =
    variant === 'bar'
      ? 'border-t-2 border-stone-900 py-4 text-[15px] font-semibold text-stone-900'
      : 'border-t border-stone-200 py-5 text-[15px] font-semibold text-stone-900';

  return (
    <div>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center gap-4 text-left transition-colors hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${head}`}
        >
          {lead && <span className="w-8 shrink-0 text-2xl font-light tracking-tight text-orange-700">{lead}</span>}
          <span className="flex-1">{title}</span>
          <Icon className="size-5 shrink-0 text-stone-500" aria-hidden="true" />
        </button>
      </h3>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </div>
  );
};

/* ---------- Các khối ---------- */
const Hero = () => (
  <section
    className="relative isolate flex min-h-[460px] items-end overflow-hidden bg-stone-700 md:min-h-[600px]"
    aria-labelledby="tknt-title"
  >
    {hero.image ? (
      <img src={hero.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
    ) : (
      <div className="absolute inset-0 -z-20 bg-stone-700" aria-hidden="true" />
    )}
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/20" aria-hidden="true" />

    <div className="w-full px-5 pb-16 text-white md:pb-24 lg:px-[4vw]">
      <div className="max-w-[640px]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 sm:text-sm">{hero.eyebrow}</p>
        <h1 id="tknt-title" className="mt-3 text-4xl font-light italic tracking-tight sm:text-5xl md:mt-4 md:text-7xl">
          {hero.title} <span className="text-amber-400">{hero.accent}</span>
        </h1>
        <p className="mt-4 max-w-[480px] text-sm leading-relaxed text-stone-100 sm:text-base md:mt-6 md:text-lg">
          {hero.text}
        </p>
        <a
          href={`tel:${PHONE}`}
          className="mt-7 inline-flex h-11 items-center gap-2 bg-white px-6 text-xs font-bold uppercase tracking-widest text-stone-900 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <Phone className="size-4" aria-hidden="true" />
          Liên hệ ngay: {PHONE}
        </a>
      </div>
    </div>
  </section>
);

const Reasons = () => (
  <section aria-labelledby="ly-do">
    <SectionHeading
      id="ly-do"
      eyebrow="Vì sao chọn chúng tôi"
      intro="Là xưởng nội thất gia đình hoạt động từ năm 2020, Góc Nhà làm việc trực tiếp với từng khách hàng, từ tư vấn, thiết kế đến thi công."
    >
      3 lý do nên chọn Góc Nhà
    </SectionHeading>

    <div className="mt-10 grid gap-x-8 gap-y-8 md:grid-cols-3">
      {reasons.map((r) => (
        <Accordion key={r.title} title={r.title} variant="bar" defaultOpen>
          <div className="relative isolate mt-5 flex min-h-[420px] items-end overflow-hidden text-white md:min-h-[520px]">
            <Photo src={r.image} alt={r.heading} tone={r.tone} className="absolute inset-0 -z-20 size-full" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden="true" />
            <div className="p-6">
              <h4 className="text-2xl font-light italic leading-snug tracking-tight">{r.heading}</h4>
              <p className="mt-4 text-[13px] leading-relaxed text-stone-100">{r.text}</p>
            </div>
          </div>
        </Accordion>
      ))}
    </div>
  </section>
);

const Process = () => (
  <section aria-labelledby="quy-trinh">
    <SectionHeading id="quy-trinh" eyebrow="Quy trình làm việc" intro="Sáu bước từ lúc tiếp nhận nhu cầu đến khi bàn giao công trình.">
      Thiết kế hoàn thiện nội thất
    </SectionHeading>

    <div className="mt-10 grid gap-12">
      {stepRows.map((row, i) => {
        const imageLeft = row.imageSide === 'left';
        return (
          <div key={i} className={`grid items-start gap-6 md:gap-10 ${row.cols}`}>
            <div className={`border-b border-stone-200 ${imageLeft ? 'md:order-2' : ''}`}>
              {row.steps.map((s) => (
                <Accordion key={s.title} title={s.title} lead={s.no} defaultOpen>
                  <p className="pb-5 pl-12 text-[14px] leading-relaxed text-stone-600">{s.text}</p>
                </Accordion>
              ))}
            </div>
            <Photo
              src={row.image}
              alt={row.alt}
              tone={row.tone}
              className={`aspect-[3/2] w-full ${imageLeft ? 'md:order-1' : ''}`}
            />
          </div>
        );
      })}
    </div>
  </section>
);

/* ---------- Trang Thiết kế nội thất (route con của HomeLayout) ---------- */
export const InteriorDesignPage = () => (
  <>
    <Hero />
    <div className="mx-auto max-w-[1500px] space-y-16 px-5 py-14 lg:space-y-24 lg:px-[4vw]">
      <Reasons />
      <Process />
    </div>
  </>
);