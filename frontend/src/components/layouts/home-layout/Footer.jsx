import { ChevronRight } from 'lucide-react';

const brandLinks = [
  { label: 'Giới thiệu', href: '#gioi-thieu' },
  { label: 'Chuyện Góc Nhà', href: '#chuyen-nha-xinh' },
  { label: 'Đổi trả hàng', href: '#doi-tra-hang' },
];

const inspirationLinks = [
  { label: 'Sản phẩm', href: '#san-pham' },
  { label: 'Ý tưởng và cảm hứng', href: '#y-tuong-cam-hung' },
];

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Youtube', href: '#' },
  { label: 'Facebook', href: '#' },
];

const ColumnTitle = ({ children }) => (
  <div className="mb-5">
    <h3 className="text-[14px] font-bold uppercase tracking-wide text-white">{children}</h3>
    <span className="mt-3 block h-px w-6 bg-stone-500" aria-hidden="true" />
  </div>
);

const LinkList = ({ links }) => (
  <ul className="grid gap-[9px]">
    {links.map((link) => (
      <li key={link.label}>
        <a className="text-xs font-medium text-white transition-colors hover:text-stone-300" href={link.href}>
          {link.label}
        </a>
      </li>
    ))}
  </ul>
);

export const Footer = () => {
  return (
    <footer id="lien-he" className="relative text-white">
      {/* Kêu gọi hành động  */}
      <section className="flex min-h-[461px] flex-col items-center justify-end bg-[#232226] px-5 pb-[37px] text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Xem, chạm và cảm nhận</h2>
        <a
          href="#cua-hang"
          className="mt-8 inline-flex h-[33px] items-center gap-2 border border-white px-4 text-xs font-bold transition-colors hover:bg-white hover:text-[#232226] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Tìm sản phẩm tại cửa hàng
          <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        </a>
      </section>

      {/* Chân trang */}
      <div className="bg-[#323139] px-5 pt-8 sm:px-8">
        <div className="mx-auto grid max-w-[1305px] gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="flex flex-col">
            <ColumnTitle>Kết nối với Góc Nhà</ColumnTitle>
            <div className="mt-auto lg:mt-[76px]">
              <p className="text-xs font-medium">FOLLOW US</p>
              <p className="mt-3 flex flex-wrap text-xs font-medium">
                {socialLinks.map((item, index) => (
                  <span key={item.label}>
                    <a className="transition-colors hover:text-stone-300" href={item.href}>
                      {item.label}
                    </a>
                    {index < socialLinks.length - 1 && '—'}
                  </span>
                ))}
              </p>
              <a
                href="#he-thong-cua-hang"
                className="mt-4 inline-flex h-[27px] items-center border border-white px-4 text-xs font-medium uppercase transition-colors hover:bg-white hover:text-[#323139]"
              >
                Cửa hàng
              </a>
            </div>
          </div>

          <div>
            <ColumnTitle>Góc Nhà</ColumnTitle>
            <LinkList links={brandLinks} />
          </div>

          <div>
            <ColumnTitle>Cảm hứng #GocNha</ColumnTitle>
            <LinkList links={inspirationLinks} />
          </div>

          <div>
            <ColumnTitle>Newsletter</ColumnTitle>
            <p className="max-w-[290px] text-[11px] font-medium leading-[17px]">
              Hãy để lại email của bạn để nhận được những ý tưởng trang trí mới và những thông tin, ưu đãi từ Góc Nhà
            </p>
            <p className="mt-4 text-[11px] font-medium">Email: gocnhacare@akacompany.com.vn</p>
            <p className="mt-3.5 text-[11px] font-medium">
              Hotline: <strong className="font-bold">0969011078</strong>
            </p>
            <form className="mt-4 flex max-w-[283px]" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="Nhập email của bạn"
                aria-label="Email của bạn"
                className="h-[27px] min-w-0 flex-1 bg-[#57565c] px-2 text-[11px] font-medium text-white placeholder:text-stone-200 focus:outline-2 focus:outline-white"
              />
              <button
                type="submit"
                className="h-[27px] bg-black px-3.5 text-[11px] font-bold uppercase transition-colors hover:bg-stone-800"
              >
                Đăng ký
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto max-w-[1305px]">
          <div className="h-[82px] border-t border-stone-500/60" aria-hidden="true" />
          <div className="border-t border-stone-500/60 py-5 text-[11px] font-medium leading-[17px] text-stone-400">
            <p>© 2021 – Bản quyền của Góc Nhà – thương hiệu thuộc AKA Furniture</p>
            <p>Từ năm 1999 – thương hiệu đăng ký số 284074 Cục sở hữu trí tuệ</p>
          </div>
        </div>
      </div>

    </footer>
  );
}