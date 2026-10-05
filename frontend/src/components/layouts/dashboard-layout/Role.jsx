import {
  BarChart3,
  Boxes,
  CalendarCheck,
  Calculator,
  ClipboardList,
  Clock,
  FileText,
  HandCoins,
  Hammer,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

/* Cấu hình menu theo từng vai trò: path '' là trang index (tổng quan) */
export const roles = {
  owner: {
    label: 'Chủ xưởng',
    base: '/owner',
    items: [
      { label: 'Tổng quan', path: '', icon: LayoutDashboard },
      { label: 'Doanh thu & báo cáo', path: 'reports', icon: BarChart3 },
      { label: 'Đơn hàng', path: 'orders', icon: Package },
      { label: 'Sản phẩm', path: 'products', icon: Boxes },
      { label: 'Khách hàng', path: 'customers', icon: Users },
      { label: 'Nhân sự', path: 'staff', icon: UserCog },
      { label: 'Tài chính', path: 'finance', icon: Wallet },
      { label: 'Cài đặt', path: 'settings', icon: Settings },
    ],
  },
  sale: {
    label: 'Kinh doanh',
    base: '/sale',
    items: [
      { label: 'Tổng quan', path: '', icon: LayoutDashboard },
      { label: 'Đơn hàng', path: 'orders', icon: Package },
      { label: 'Báo giá', path: 'quotes', icon: FileText },
      { label: 'Khách hàng', path: 'customers', icon: Users },
      { label: 'Lịch hẹn tư vấn', path: 'appointments', icon: CalendarCheck },
      { label: 'Sản phẩm', path: 'products', icon: Boxes },
    ],
  },
  staffLeader: {
    label: 'Trưởng nhóm',
    base: '/staff-leader',
    items: [
      { label: 'Tổng quan', path: '', icon: LayoutDashboard },
      { label: 'Công việc', path: 'tasks', icon: ClipboardList },
      { label: 'Tiến độ sản xuất', path: 'production', icon: Hammer },
      { label: 'Nhân viên trong nhóm', path: 'team', icon: Users },
      { label: 'Chấm công', path: 'attendance', icon: Clock },
      { label: 'Báo cáo nhóm', path: 'reports', icon: BarChart3 },
    ],
  },
  accountant: {
    label: 'Kế toán',
    base: '/accountant',
    items: [
      { label: 'Tổng quan', path: '', icon: LayoutDashboard },
      { label: 'Hóa đơn', path: 'invoices', icon: Receipt },
      { label: 'Thu chi', path: 'cashflow', icon: Wallet },
      { label: 'Công nợ', path: 'debts', icon: HandCoins },
      { label: 'Lương nhân viên', path: 'payroll', icon: Calculator },
      { label: 'Báo cáo tài chính', path: 'reports', icon: BarChart3 },
    ],
  },
};

/* Thêm `to` và `end` cho từng mục để dùng với NavLink */
export const resolveItems = (role) =>
  role.items.map((i) => ({
    ...i,
    to: i.path ? `${role.base}/${i.path}` : role.base,
    end: !i.path,
  }));