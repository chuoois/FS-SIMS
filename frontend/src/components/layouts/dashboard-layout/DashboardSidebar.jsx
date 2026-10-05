import { Link, NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700';

export const DashboardSidebar = ({ roleLabel, items, open, onClose, onLogout }) => (
  <>
    {/* Lớp phủ trên mobile */}
    {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />}

    <aside
      id="sidebar"
      aria-label={`Menu ${roleLabel}`}
      className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#232226] text-white transition-[transform,visibility] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full max-lg:invisible'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <Link
          to="/home"
          aria-label="Góc Nhà, về trang chủ"
          className={`border border-stone-400 px-2 py-0.5 text-[24px] font-light leading-none tracking-tight text-stone-300 ${focusRing}`}
        >
          góc nhà
        </Link>
        <button type="button" onClick={onClose} aria-label="Đóng menu" className={`text-stone-300 hover:text-white lg:hidden ${focusRing}`}>
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>

      <div className="px-5 pb-2 pt-6">
        <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Khu vực</p>
        <p className="mt-1 text-sm font-bold text-white">{roleLabel}</p>
        <span className="mt-3 block h-px w-6 bg-stone-500" aria-hidden="true" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Điều hướng chính">
        <ul className="grid gap-1">
          {items.map(({ label, to, end, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 border-l-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${focusRing} ${
                    isActive
                      ? 'border-orange-700 bg-white/10 text-white'
                      : 'border-transparent text-stone-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.7} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-stone-400 transition-colors hover:bg-white/5 hover:text-white ${focusRing}`}
        >
          <LogOut className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          Đăng xuất
        </button>
      </div>
    </aside>
  </>
);