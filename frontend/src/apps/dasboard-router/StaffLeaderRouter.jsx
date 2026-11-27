import { StaffLeaderLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";
import { lazyNamed } from "../../utils/lazyNamed";

const LeaderOrdersPage = lazyNamed(
  () => import("../../pages/staff-pages/LeaderOrdersPage"),
  "LeaderOrdersPage"
);

export const StaffLeaderRouter = {
  path: "/staff-leader",
  element: <ProtectedRoute roles={[ROLES.LEADERSTAFF, ROLES.OWNER]} redirectTo="/staff/login" />,
  children: [
    {
      element: <StaffLeaderLayout />,
      children: [
        {
          index: true,
          element: <LeaderOrdersPage />,
        },
        {
          path: "orders",
          element: <LeaderOrdersPage />,
        },
        {
          path: "production",
          element: <LeaderOrdersPage />,
        },
      ],
    },
  ],
};
