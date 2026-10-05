import { createBrowserRouter } from "react-router-dom";
import { PublicRouter } from "../apps/public-router/PublicRouter";
import { OwnerRouter } from "../apps/dasboard-router/OwnerRouter";
import { NotFoundPage, UnauthorizedPage, ForbiddenPage } from "../pages/error-pages/Errorpages";

export const router = createBrowserRouter([
  PublicRouter,
  OwnerRouter,

  // ── Trang lỗi (standalone, không có Header/Footer) ───────
  { path: '/401', element: <UnauthorizedPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*',    element: <NotFoundPage /> },
]);