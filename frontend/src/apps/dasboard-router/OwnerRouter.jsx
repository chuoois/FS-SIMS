import { OwnerLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";
import { ManageStaffAccountsPage } from "../../pages/owner-pages/ManageStaffAccountsPage";
import { ManageSuppliersPage } from "../../pages/owner-pages/ManageSuppliersPage";

export const OwnerRouter = {
  path: "/owner",
  // Guard: phải đăng nhập VÀ có role OWNER
  element: <ProtectedRoute roles={[ROLES.OWNER]} redirectTo="/staff/login" />,
  children: [
    {
      element: <OwnerLayout />,
      children: [
        {
          index: true,
          element: (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-stone-900">Tổng quan Chủ xưởng (Owner)</h2>
              <p className="mt-2 text-sm text-stone-600">
                Theo dõi toàn bộ hoạt động kinh doanh, tiến độ sản xuất, doanh thu và nhân sự của xưởng Góc Nhà.
              </p>
            </div>
          ),
        },
        {
          path: "accounts",
          element: <ManageStaffAccountsPage />,
        },
        {
          path: "suppliers",
          element: <ManageSuppliersPage />,
        },
        {
          path: "analytics",
          element: (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-stone-900">Báo cáo & Phân tích</h2>
            </div>
          ),
        },
      ],
    },
  ],
};