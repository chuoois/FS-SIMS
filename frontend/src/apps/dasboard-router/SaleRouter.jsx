import { SaleLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";

export const SaleRouter = {
  path: "/sale",
  element: <ProtectedRoute roles={[ROLES.SALES, ROLES.OWNER]} redirectTo="/staff/login" />,
  children: [
    {
      element: <SaleLayout />,
      children: [
        {
          index: true,
          element: (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-stone-900">Tổng quan Kinh doanh</h2>
              <p className="mt-2 text-sm text-stone-600">
                Chào mừng bạn đến với khu vực Quản lý Bán hàng & Chăm sóc Khách hàng Góc Nhà.
              </p>
            </div>
          ),
        },
        {
          path: "orders",
          element: (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-stone-900">Danh sách Đơn hàng</h2>
            </div>
          ),
        },
      ],
    },
  ],
};
