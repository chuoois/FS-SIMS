// =========================================================
// ProtectedRoute.jsx
// Guard phân quyền cho React Router — dùng làm wrapper element
//
// Cách dùng:
//   <ProtectedRoute>                    → chỉ cần đăng nhập
//   <ProtectedRoute roles={[1, 2]}>     → cần đăng nhập VÀ có role phù hợp
//
// Hành vi:
//   - Chưa đăng nhập            → redirect /login (kèm state.from để redirect sau)
//   - Đã đăng nhập nhưng sai role → redirect /403
//   - Hợp lệ                    → render <Outlet /> (dùng trong route con)
// =========================================================

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * @param {Object}   props
 * @param {number[]} [props.roles]   - Danh sách roleId được phép truy cập.
 *                                     Bỏ qua (undefined) = chỉ cần đăng nhập.
 * @param {string}   [props.redirectTo='/login'] - Override đích redirect khi chưa login.
 */
export const ProtectedRoute = ({ roles, redirectTo = '/login' }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Chưa đăng nhập → về trang login, giữ lại đường dẫn hiện tại để redirect sau khi login
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // Đã đăng nhập nhưng không có role phù hợp → 403
  if (roles && !roles.includes(user?.roleId)) {
    return <Navigate to="/403" replace />;
  }

  // Hợp lệ → render các route con
  return <Outlet />;
};
