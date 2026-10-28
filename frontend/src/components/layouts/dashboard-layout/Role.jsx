import {
  BarChart3,
  Boxes,
  Building2,
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
      { label: 'Quản lý tài khoản', path: 'accounts', icon: UserCog },
      { label: 'Nhà cung cấp', path: 'suppliers', icon: Building2 },
      { label: 'Sản phẩm', path: 'products', icon: Boxes },
      { label: 'Quản lý nguyên vật liệu', path: 'materials', icon: Package },
      { label: 'Doanh thu & báo cáo', path: '#', icon: BarChart3 },
      { label: 'Đơn hàng', path: '#', icon: ClipboardList },
      { label: 'Khách hàng', path: '#', icon: Users },
      { label: 'Cài đặt', path: '#', icon: Settings },
    ],
  },
  sale: {
    label: 'Nhân viên bán hàng',
    base: '/sale',
    items: [
      { label: 'Tạo đơn hàng (POS)', path: 'create-order', icon: Receipt },
      { label: 'Đơn hàng', path: 'orders', icon: Package },
      { label: 'Hợp đồng', path: 'contracts', icon: FileText },
      { label: 'Khách hàng', path: '#', icon: Users },
      { label: 'Lịch hẹn tư vấn', path: '#', icon: CalendarCheck },
      { label: 'Sản phẩm', path: '#', icon: Boxes },
    ],
  },
  staffLeader: {
    label: 'Thợ xưởng',
    base: '/staff-leader',
    items: [
      { label: 'Tổng quan', path: '', icon: LayoutDashboard },
      { label: 'Công việc', path: '#', icon: ClipboardList },
      { label: 'Tiến độ sản xuất', path: '#', icon: Hammer },
      { label: 'Nhân viên trong nhóm', path: '#', icon: Users },
      { label: 'Chấm công', path: '#', icon: Clock },
      { label: 'Báo cáo nhóm', path: '#', icon: BarChart3 },
    ],
  },
};

/* Thêm `to` và `end` cho từng mục để dùng với NavLink */
export const resolveItems = (role) =>
  role.items.map((i, index) => ({
    ...i,
    to: i.path === '#' ? '#' : i.path ? `${role.base}/${i.path}` : role.base,
    end: !i.path,
    key: `${role.base}-${i.label}-${index}`,
  }));
