// =========================================================
// AuthContext.jsx
// Quản lý trạng thái xác thực toàn cục
// =========================================================

import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser, logoutUser } from '../services/authService';

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'accessToken';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Khôi phục user từ sessionStorage khi reload trang
    try {
      const stored = sessionStorage.getItem('authUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() =>
    sessionStorage.getItem(ACCESS_TOKEN_KEY) || null
  );

  const login = useCallback(async ({ email, password }) => {
    const data = await loginUser({ email, password });
    setUser(data.user);
    setAccessToken(data.accessToken);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    sessionStorage.setItem('authUser', JSON.stringify(data.user));
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem('authUser');
    }
  }, []);

  const value = {
    user,
    accessToken,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
  return ctx;
}
