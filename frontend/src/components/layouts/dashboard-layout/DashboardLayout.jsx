import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { resolveItems, roles } from './Role';

/* Khung chung: Sidebar + Header + <Outlet /> (trang con, index là Tổng quan) */
const DashboardLayout = ({ role, user = { name: 'Người dùng' }, onLogout }) => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const items = resolveItems(role);
  const current = items.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)));

  // Đóng sidebar khi đổi trang hoặc bấm Esc
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen bg-stone-100 text-stone-800">
      <DashboardSidebar
        roleLabel={role.label}
        items={items}
        open={open}
        onClose={() => setOpen(false)}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={current?.label ?? role.label}
          roleLabel={role.label}
          user={user}
          menuOpen={open}
          onMenuClick={() => setOpen(true)}
        />
        <main className="w-full flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

/* ---------- 4 layout theo vai trò ---------- */
export const OwnerLayout = (props) => <DashboardLayout role={roles.owner} {...props} />;
export const SaleLayout = (props) => <DashboardLayout role={roles.sale} {...props} />;
export const StaffLeaderLayout = (props) => <DashboardLayout role={roles.staffLeader} {...props} />;
export const AccountantLayout = (props) => <DashboardLayout role={roles.accountant} {...props} />;