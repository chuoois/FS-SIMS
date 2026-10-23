import { StaffLeaderLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";

export const StaffLeaderRouter = {
  path: "/staff-leader",
  element: <ProtectedRoute roles={[ROLES.LEADERSTAFF, ROLES.OWNER]} redirectTo="/staff/login" />,
  children: [
    {
      element: <StaffLeaderLayout />,
      children: [
        {
          index: true,
          element: (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-stone-900">Tổng quan Quản lý Xưởng & Sản xuất</h2>
              <p className="mt-2 text-sm text-stone-600">
                Khu vực điều phối tiến độ gia công, xuất nhập nguyên vật liệu và quản lý thợ xưởng.
              </p>
            </div>
          ),
        },
        {
          path: "production",
          element: (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-stone-900">Tiến độ sản xuất</h2>
            </div>
          ),
        },
      ],
    },
  ],
};
