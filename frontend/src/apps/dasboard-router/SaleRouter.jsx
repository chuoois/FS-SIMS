import { SaleLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";
import { CreateOrderPage } from "../../pages/sale-pages/CreateOrderPage";
import { OrdersPage } from "../../pages/sale-pages/OrdersPage";
import { ContractsPage } from "../../pages/sale-pages/ContractsPage";

export const SaleRouter = {
  path: "/sale",
  element: <ProtectedRoute roles={[ROLES.SALES, ROLES.OWNER]} redirectTo="/staff/login" />,
  children: [
    {
      element: <SaleLayout />,
      children: [
        {
          index: true,
          element: <CreateOrderPage />,
        },
        {
          path: "create-order",
          element: <CreateOrderPage />,
        },
        {
          path: "orders/create",
          element: <CreateOrderPage />,
        },
        {
          path: "orders",
          element: <OrdersPage />,
        },
        {
          path: "contracts",
          element: <ContractsPage />,
        },
      ],
    },
  ],
};
