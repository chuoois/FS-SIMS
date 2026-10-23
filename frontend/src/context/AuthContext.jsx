// =========================================================
// AuthContext.jsx
// Quản lý trạng thái xác thực toàn cục
//
// Flow:
//   1. Khi app khởi động, thử silent refresh (dùng cookie httpOnly)
//      để khôi phục session mà không cần user đăng nhập lại.
//   2. isInitializing = true trong lúc đang thử → ProtectedRoute
//      sẽ render loading thay vì redirect sớm.
//   3. Lắng nghe event 'auth:session-expired' từ axios interceptor
//      để tự động logout khi cả refresh cũng thất bại.
// =========================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { loginUser, logoutUser, refreshAccessToken } from '../services/authService';

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'accessToken';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // true trong lúc app đang kiểm tra session ban đầu
  const [isInitializing, setIsInitializing] = useState(true);

  // ── Helpers ────────────────────────────────────────────
  const saveSession = useCallback((token, userData) => {
    setAccessToken(token);
    setUser(userData);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.setItem('authUser', JSON.stringify(userData));
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem('authUser');
  }, []);

  // ── Silent refresh khi khởi động ───────────────────────
  useEffect(() => {
    let cancelled = false;

    async function tryRestoreSession() {
      // Nếu đã có token + user trong sessionStorage (same-tab reload) dùng luôn
      const storedToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      const storedUser = sessionStorage.getItem('authUser');

      if (storedToken && storedUser) {
        try {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsInitializing(false);
          return;
        } catch {
          // JSON parse lỗi → bỏ qua, thử silent refresh
        }
      }

      // Không có session trong storage → thử dùng cookie httpOnly để lấy token mới
      try {
        const data = await refreshAccessToken(); // { message, accessToken }
        if (!cancelled) {
          // Cần lấy thông tin user: giải mã payload từ accessToken
          const payload = parseJwtPayload(data.accessToken);
          const restoredUser = {
            userAccountId: payload.sub,
            email: payload.email ?? null,
            roleId: payload.role,
          };

          saveSession(data.accessToken, restoredUser);
        }
      } catch {
        // Refresh thất bại (cookie hết hạn / không có) → user chưa đăng nhập, ok
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    tryRestoreSession();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lắng nghe session-expired từ axios interceptor ─────
  useEffect(() => {
    function onSessionExpired() {
      clearSession();
    }
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, [clearSession]);

  // ── Login ──────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const data = await loginUser({ email, password });
    saveSession(data.accessToken, data.user);
    return data;
  }, [saveSession]);

  // ── Logout ─────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isInitializing,
    login,
    logout,
    saveSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Helpers ────────────────────────────────────────────────
/** Giải mã phần payload của JWT (không verify signature, chỉ đọc data) */
function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
  return ctx;
}
