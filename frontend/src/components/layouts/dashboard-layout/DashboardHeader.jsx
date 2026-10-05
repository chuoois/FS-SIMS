import { Bell, Menu } from 'lucide-react';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase() || 'GN';

export const DashboardHeader = ({ title, roleLabel, user, menuOpen, onMenuClick }) => (
  <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 lg:px-8">
    <div className="flex min-w-0 items-center gap-4">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Mở menu"
        aria-expanded={menuOpen}
        aria-controls="sidebar"
        className={`text-stone-700 lg:hidden ${focusRing}`}
      >
        <Menu className="size-7" strokeWidth={1.6} aria-hidden="true" />
      </button>
      <h1 className="truncate text-[15px] font-bold text-stone-900">{title}</h1>
    </div>

    <div className="flex items-center gap-4">
      <button type="button" aria-label="Thông báo" className={`text-stone-500 transition-colors hover:text-stone-900 ${focusRing}`}>
        <Bell className="size-5" strokeWidth={1.6} aria-hidden="true" />
      </button>
      <span className="h-5 w-px bg-stone-200" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-[#323139] text-xs font-bold text-white" aria-hidden="true">
          {initials(user.name)}
        </span>
        <div className="hidden leading-tight sm:block">
          <p className="text-[13px] font-bold text-stone-900">{user.name}</p>
          <p className="text-[11px] font-medium text-stone-500">{roleLabel}</p>
        </div>
      </div>
    </div>
  </header>
);