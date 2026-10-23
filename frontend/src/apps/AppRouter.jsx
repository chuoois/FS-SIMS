import { createBrowserRouter } from "react-router-dom";
import { PublicRouter } from "../apps/public-router/PublicRouter";
import { OwnerRouter, OwnerAliasRouter } from "../apps/dasboard-router/OwnerRouter";
import { SaleRouter } from "../apps/dasboard-router/SaleRouter";
import { StaffLeaderRouter } from "../apps/dasboard-router/StaffLeaderRouter";
import { StaffLoginPage } from "../pages/staff-pages/StaffLoginPage";
import { StaffForgotPasswordPage } from "../pages/staff-pages/StaffForgotPasswordPage";
import { NotFoundPage, UnauthorizedPage, ForbiddenPage } from "../pages/error-pages/Errorpages";

export const router = createBrowserRouter([
  // ── Cổng Đăng nhập & Quên mật khẩu nội bộ cho 3 vị trí: Owner, Sales, Staff Leader ──
  { path: '/staff/login', element: <StaffLoginPage /> },
  { path: '/staff/forgot-password', element: <StaffForgotPasswordPage /> },

  // ── Routers giao diện khách hàng & công khai ──
  PublicRouter,

  // ── Routers Dashboard theo vai trò nhân viên ──
  OwnerRouter,
  OwnerAliasRouter,
  SaleRouter,
  StaffLeaderRouter,

  // ── Trang lỗi (standalone, không có Header/Footer) ───────
  { path: '/401', element: <UnauthorizedPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*',    element: <NotFoundPage /> },
]);