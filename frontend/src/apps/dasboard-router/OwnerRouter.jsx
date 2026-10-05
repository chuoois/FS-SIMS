import { OwnerLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";


export const OwnerRouter = {
  path: "/dashboardowner",
  // Guard: phải đăng nhập VÀ có role OWNER
  element: <ProtectedRoute roles={[ROLES.OWNER]} />,
  children: [
    {
      element: <OwnerLayout />,
      children: [
        {
          path: "analytics",
          element: <div>Analytics</div>,
        },
      ],
    },
  ],
};