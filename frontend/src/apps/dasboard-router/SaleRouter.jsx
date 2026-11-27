import { SaleLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";
import { lazyNamed } from "../../utils/lazyNamed";

const CreateOrderPage = lazyNamed(() => import("../../pages/sale-pages/CreateOrderPage"), "CreateOrderPage");
const CreateOrderRequestPage = lazyNamed(
  () => import("../../pages/sale-pages/CreateOrderRequestPage"),
  "CreateOrderRequestPage"
);
const OrdersPage = lazyNamed(() => import("../../pages/sale-pages/OrdersPage"), "OrdersPage");
const ContractsPage = lazyNamed(() => import("../../pages/sale-pages/ContractsPage"), "ContractsPage");
const RequestsPage = lazyNamed(() => import("../../pages/sale-pages/RequestsPage"), "RequestsPage");
const CustomersPage = lazyNamed(() => import("../../pages/sale-pages/CustomersPage"), "CustomersPage");

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
          path: "requests/create",
          element: <CreateOrderRequestPage />,
        },
        {
          path: "create-request",
          element: <CreateOrderRequestPage />,
        },
        {
          path: "orders",
          element: <OrdersPage />,
        },
        {
          path: "contracts",
          element: <ContractsPage />,
        },
        {
          path: "requests",
          element: <RequestsPage />,
        },
        {
          path: "customers",
          element: <CustomersPage />,
        },
      ],
    },
  ],
};
