import { OwnerLayout } from "../../components/layouts/dashboard-layout/DashboardLayout";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { ROLES } from "../../constants/roles";
import { lazyNamed } from "../../utils/lazyNamed";

const ManageStaffAccountsPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageStaffAccountsPage"),
  "ManageStaffAccountsPage"
);
const ManageSuppliersPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageSuppliersPage"),
  "ManageSuppliersPage"
);
const ManageProductsPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageProductsPage"),
  "ManageProductsPage"
);
const ManageMaterialsPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageMaterialsPage"),
  "ManageMaterialsPage"
);
const ManagePurchaseReceiptsPage = lazyNamed(
  () => import("../../pages/owner-pages/ManagePurchaseReceiptsPage"),
  "ManagePurchaseReceiptsPage"
);
const ManageMaterialExportPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageMaterialExportPage"),
  "ManageMaterialExportPage"
);
const ManageProductionOrdersPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageProductionOrdersPage"),
  "ManageProductionOrdersPage"
);
const ManageOrdersPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageOrdersPage"),
  "ManageOrdersPage"
);
const ManageFinancialReportsPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageFinancialReportsPage"),
  "ManageFinancialReportsPage"
);
const ManageCustomerRequestsPage = lazyNamed(
  () => import("../../pages/owner-pages/ManageCustomerRequestsPage"),
  "ManageCustomerRequestsPage"
);

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
          path: "products",
          element: <ManageProductsPage />,
        },
        {
          path: "materials",
          element: <ManageMaterialsPage />,
        },
        {
          path: "purchase-receipts",
          element: <ManagePurchaseReceiptsPage />,
        },
        {
          path: "material-exports",
          element: <ManageMaterialExportPage />,
        },
        {
          path: "production-orders",
          element: <ManageProductionOrdersPage />,
        },
        {
          path: "orders",
          element: <ManageOrdersPage />,
        },
        {
          path: "requests",
          element: <ManageOrdersPage defaultTab="REQUESTS" />,
        },
        {
          path: "financial-reports",
          element: <ManageFinancialReportsPage />,
        },
        {
          path: "customer-requests",
          element: <ManageCustomerRequestsPage />,
        },
        {
          path: "analytics",
          element: <ManageFinancialReportsPage />,
        },
      ],
    },
  ],
};
