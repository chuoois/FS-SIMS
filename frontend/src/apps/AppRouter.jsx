import { createBrowserRouter } from "react-router-dom";
import { lazyNamed } from "../utils/lazyNamed";
import { PublicRouter } from "../apps/public-router/PublicRouter";
import { OwnerRouter } from "../apps/dasboard-router/OwnerRouter";
import { SaleRouter } from "../apps/dasboard-router/SaleRouter";
import { StaffLeaderRouter } from "../apps/dasboard-router/StaffLeaderRouter";

const StaffLoginPage = lazyNamed(() => import("../pages/staff-pages/StaffLoginPage"), "StaffLoginPage");
const StaffForgotPasswordPage = lazyNamed(
  () => import("../pages/staff-pages/StaffForgotPasswordPage"),
  "StaffForgotPasswordPage"
);
const NotFoundPage = lazyNamed(() => import("../pages/error-pages/Errorpages"), "NotFoundPage");
const UnauthorizedPage = lazyNamed(() => import("../pages/error-pages/Errorpages"), "UnauthorizedPage");
const ForbiddenPage = lazyNamed(() => import("../pages/error-pages/Errorpages"), "ForbiddenPage");

export const router = createBrowserRouter([
  // ── Cổng Đăng nhập & Quên mật khẩu nội bộ cho 3 vị trí: Owner, Sales, Staff Leader ──
  { path: '/staff/login', element: <StaffLoginPage /> },
  { path: '/staff/forgot-password', element: <StaffForgotPasswordPage /> },

  // ── Routers giao diện khách hàng & công khai ──
  PublicRouter,

  // ── Routers Dashboard theo vai trò nhân viên ──
  OwnerRouter,
  SaleRouter,
  StaffLeaderRouter,

  // ── Trang lỗi (standalone, không có Header/Footer) ───────
  { path: '/401', element: <UnauthorizedPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*',    element: <NotFoundPage /> },
]);