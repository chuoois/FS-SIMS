// =========================================================
// ProtectedRoute.jsx
// Guard phân quyền cho React Router — dùng làm wrapper element
//
// Cách dùng:
//   <ProtectedRoute>                    → chỉ cần đăng nhập
//   <ProtectedRoute roles={[1, 2]}>     → cần đăng nhập VÀ có role phù hợp
//
// Hành vi:
//   - Đang khởi tạo session    → render spinner (tránh redirect sớm)
//   - Chưa đăng nhập           → redirect /login (kèm state.from để redirect sau)
//   - Đã đăng nhập nhưng sai role → redirect /403
//   - Hợp lệ                   → render <Outlet />
// =========================================================

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * @param {Object}   props
 * @param {number[]} [props.roles]        - Danh sách roleId được phép truy cập.
 *                                          Bỏ qua (undefined) = chỉ cần đăng nhập.
 * @param {string}   [props.redirectTo]   - Override đích redirect khi chưa login.
 */
export const ProtectedRoute = ({ roles, redirectTo = '/login' }) => {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const location = useLocation();

  // Chờ AuthContext hoàn thành silent refresh trước khi quyết định redirect
  if (isInitializing) {
    return <AuthLoadingSpinner />;
  }

  // Chưa đăng nhập → về trang login, giữ lại đường dẫn hiện tại
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

// ── Spinner hiển thị trong lúc silent refresh ─────────────
function AuthLoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-bg, #0f0f0f)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
