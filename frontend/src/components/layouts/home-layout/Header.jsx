import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, LogOut, Menu, Phone, Search, ShoppingBag, Star, User, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const navigation = [
  { label: 'Sản phẩm', to: '/products' },
  { label: 'Về chúng tôi', to: '/about' },
  { label: 'Liên hệ', to: '/contact' },
  { label: 'Thiết kế nội thất', to: '/interior-design' },
];

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900';

/* Liên kết tiện ích ở thanh trên (Yêu thích, Giỏ hàng) */
const UtilityLink = ({ to, icon: Icon, label, count = 0 }) => (
  <Link
    to={to}
    aria-label={count > 0 ? `${label} (${count})` : label}
    className={`group flex items-center gap-1.5 text-stone-600 transition-colors hover:text-stone-900 ${focusRing}`}
  >
    <span className="relative">
      <Icon className="size-[18px] text-stone-500 transition-colors group-hover:text-stone-900" strokeWidth={1.6} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-orange-700 px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
    <span className="hidden sm:inline">{label}</span>
  </Link>
);

/* Avatar nhỏ trong Header — hiện ảnh hoặc chữ cái đầu */
const UserAvatar = ({ avatarUrl, fullName, size = 'size-7' }) => {
  const initial = (fullName?.trim().split(/\s+/).pop() || '?').charAt(0).toUpperCase();
  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt={fullName}
      className={`${size} rounded-full object-cover ring-1 ring-stone-300`}
    />
  ) : (
    <span
      className={`${size} grid place-items-center rounded-full bg-stone-800 text-[11px] font-bold text-white`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
};

/* Dropdown menu khi đã đăng nhập */
const UserMenu = ({ user, onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/home');
  };

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"
      role="menu"
      aria-label="Menu tài khoản"
    >
      {/* Thông tin user */}
      <div className="border-b border-stone-100 px-4 py-3">
        <p className="truncate text-[13px] font-bold text-stone-900">{user.fullName}</p>
        <p className="truncate text-[11px] text-stone-500">{user.email}</p>
      </div>

      {/* Các tuỳ chọn */}
      <ul className="py-1">
        <li role="none">
          <Link
            to="/profile"
            role="menuitem"
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900"
          >
            <User className="size-4 text-stone-400" strokeWidth={1.6} aria-hidden="true" />
            Hồ sơ của tôi
          </Link>
        </li>
        <li role="none">
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="size-4" strokeWidth={1.6} aria-hidden="true" />
            Đăng xuất
          </button>
        </li>
      </ul>
    </div>
  );
};

const navLinkClass = ({ isActive }) =>
  `whitespace-nowrap border-b-2 py-1 text-[15px] uppercase tracking-wide transition-colors ${focusRing} ${
    isActive
      ? 'border-orange-700 text-orange-700'
      : 'border-transparent text-stone-800 hover:text-orange-700'
  }`;

/* favoriteCount / cartCount: truyền từ store; mặc định 0 thì không hiện số */
export const Header = ({ favoriteCount = 0, cartCount = 0 }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <header className="w-full bg-white text-stone-800" id="trang-chu">
      {/* Thanh trên cùng */}
      <div className="flex h-[52px] items-center justify-between border-b border-stone-100 px-5 text-[13px] lg:px-[4vw]">
        <div className="flex items-center gap-6 sm:gap-8">
          <button type="button" className="flex items-center gap-1.5 text-stone-400" aria-label="Ngôn ngữ: Tiếng Việt">
            <span className="grid size-4 place-items-center rounded-full bg-red-600 text-yellow-300">
              <Star className="size-2.5" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            </span>
            VN
          </button>

          <a href="tel:0969011078" className={`flex items-center gap-1.5 font-bold text-black ${focusRing}`}>
            <Phone className="size-4" strokeWidth={1.8} aria-hidden="true" />
            096 9011 078
          </a>
        </div>

        <div className="flex items-center gap-4 sm:gap-5">
          <UtilityLink to="/my-favorites" icon={Heart} label="Yêu thích" count={favoriteCount} />
          <UtilityLink to="/my-cart" icon={ShoppingBag} label="Giỏ hàng" count={cartCount} />
          <span className="h-4 w-px bg-stone-200" aria-hidden="true" />

          {/* Khu vực Login / User */}
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                id="user-menu-trigger"
                type="button"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                aria-label={`Tài khoản của ${user.fullName}`}
                onClick={() => setUserMenuOpen((o) => !o)}
                className={`flex items-center gap-2 text-stone-700 transition-colors hover:text-stone-900 ${focusRing}`}
              >
                <UserAvatar avatarUrl={user.avatarUrl} fullName={user.fullName} />
                <span className="hidden max-w-[120px] truncate text-[13px] font-semibold sm:inline">
                  {user.fullName}
                </span>
              </button>

              {userMenuOpen && (
                <UserMenu user={user} onClose={() => setUserMenuOpen(false)} />
              )}
            </div>
          ) : (
            <Link
              to="/login"
              id="header-login-btn"
              aria-label="Đăng nhập"
              className={`flex items-center gap-1.5 text-stone-600 transition-colors hover:text-stone-900 ${focusRing}`}
            >
              <User className="size-[18px] text-stone-500 transition-colors group-hover:text-stone-900" strokeWidth={1.6} aria-hidden="true" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>

      {/* Thanh điều hướng chính */}
      <div className="flex h-[88px] items-center gap-5 px-5 lg:gap-10 lg:px-[4vw]">
        <button
          type="button"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          aria-controls="menu-di-dong"
          onClick={() => setMenuOpen((open) => !open)}
          className={`shrink-0 text-stone-700 xl:hidden ${focusRing}`}
        >
          {menuOpen ? (
            <X className="size-8" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Menu className="size-8" strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>

        <Link
          to="/home"
          aria-label="Góc Nhà, về trang chủ"
          className={`shrink-0 border border-stone-500 px-2.5 py-1 font-sans text-[30px] font-light leading-none tracking-tight text-stone-500 sm:text-[34px] ${focusRing}`}
        >
          góc nhà
        </Link>

        <nav className="hidden items-center gap-8 xl:flex" aria-label="Điều hướng chính">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="ml-auto flex h-10 w-full max-w-[272px] items-center rounded-full border border-stone-200 bg-stone-50 pl-5 pr-3 transition-colors focus-within:border-stone-400 focus-within:bg-white"
        >
          <input
            type="search"
            placeholder="Tìm sản phẩm"
            aria-label="Tìm sản phẩm"
            className="w-full bg-transparent text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
          />
          <button type="submit" aria-label="Tìm kiếm" className={`text-stone-900 ${focusRing}`}>
            <Search className="size-5" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </form>
      </div>

      {/* Menu di động / khi thu gọn */}
      {menuOpen && (
        <nav id="menu-di-dong" className="border-t border-stone-100 px-5 py-3 xl:hidden" aria-label="Menu di động">
          <ul className="grid divide-y divide-stone-100">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-3 text-sm uppercase tracking-wide transition-colors ${
                      isActive ? 'font-bold text-orange-700' : 'text-stone-800 hover:text-orange-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
};