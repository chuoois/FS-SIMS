// =========================================================
// staffAuthService.js
// Lời gọi HTTP cho cổng xác thực nhân sự nội bộ
//
// Chỉ có login là dùng endpoint riêng (/api/staff-auth/login)
// Refresh token, logout và forgot-password dùng chung /api/auth/* (xem authService.js)
// =========================================================

import api from './api';

/**
 * Đăng nhập nhân viên (OWNER / SALES / LEADERSTAFF)
 * Backend kiểm tra role — trả 403 nếu là tài khoản khách hàng.
 */
export async function staffLogin({ email, password }) {
  const response = await api.post('/staff-auth/login', { email, password }, { withCredentials: true });
  return response.data; // { message, accessToken, user }
}
