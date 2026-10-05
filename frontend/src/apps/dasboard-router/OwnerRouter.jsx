import { OwnerLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";


export const OwnerRouter = {
  path: "/dashboardowner",
  element: <OwnerLayout />,
  children: [
    {
      path: "analytics",
      element: <div>Analytics</div>,
    }
  ],
};