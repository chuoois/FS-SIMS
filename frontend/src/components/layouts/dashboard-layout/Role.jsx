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
  PenTool,
} from 'lucide-react';

/* Cấu hình menu theo từng vai trò: path '' là trang index (tổng quan) */
export const roles = {
  owner: {
    label: 'Chủ xưởng',
    base: '/owner',
    items: [
      { label: 'Báo cáo tài chính', path: 'financial-reports', icon: BarChart3 },
      { label: 'Quản lý đơn hàng', path: 'orders', icon: ClipboardList },
      { label: 'Yêu cầu khách hàng', path: 'customer-requests', icon: ClipboardList },
      { label: 'Nhà cung cấp', path: 'suppliers', icon: Building2 },
      { label: 'Sản phẩm', path: 'products', icon: Boxes },
      { label: 'Quản lý nguyên vật liệu', path: 'materials', icon: Package },
      { label: 'Phiếu nhập hàng', path: 'purchase-receipts', icon: Receipt },
      { label: 'Phiếu xuất kho', path: 'material-exports', icon: FileText },
      { label: 'Lệnh gia công', path: 'production-orders', icon: Hammer },
      { label: 'Quản lý tài khoản', path: 'accounts', icon: UserCog },
    ],
  },
  sale: {
    label: 'Nhân viên bán hàng',
    base: '/sale',
    items: [
      { label: 'Tạo đơn hàng (POS)', path: 'create-order', icon: Receipt },
      { label: 'Tạo đơn theo yêu cầu', path: 'requests/create', icon: PenTool },
      { label: 'Đơn hàng', path: 'orders', icon: Package },
      { label: 'Hợp đồng', path: 'contracts', icon: FileText },
      { label: 'Yêu cầu của khách', path: 'requests', icon: ClipboardList },
      { label: 'Khách hàng', path: 'customers', icon: Users },
      { label: 'Lịch hẹn tư vấn', path: '#', icon: CalendarCheck },
      { label: 'Sản phẩm', path: '#', icon: Boxes },
    ],
  },
  staffLeader: {
    label: 'Thợ xưởng',
    base: '/staff-leader',
    items: [
      { label: 'Tổng quan', path: '', icon: LayoutDashboard },
      { label: 'Đơn hàng sản xuất', path: 'orders', icon: Package },
      { label: 'Tiến độ sản xuất', path: 'production', icon: Hammer },
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
    end: i.end !== undefined ? i.end : true,
    key: `${role.base}-${i.label}-${index}`,
  }));
