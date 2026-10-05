// =========================================================
// authService.js
// Mọi lời gọi HTTP liên quan đến xác thực tập trung ở đây
// =========================================================

import api from './api';

/**
 * Đăng nhập - trả về { accessToken, user }
 * Refresh token được lưu tự động qua httpOnly cookie
 */
export async function loginUser({ email, password }) {
  const response = await api.post('/auth/login', { email, password }, { withCredentials: true });
  return response.data; // { message, accessToken, user }
}

/**
 * Làm mới access token bằng refresh token trong cookie
 */
export async function refreshAccessToken() {
  const response = await api.post('/auth/refresh', {}, { withCredentials: true });
  return response.data; // { message, accessToken }
}

/**
 * Đăng xuất - xóa refresh token phía server và client
 */
export async function logoutUser() {
  const response = await api.post('/auth/logout', {}, { withCredentials: true });
  return response.data;
}

/**
 * Đăng ký tài khoản mới
 * @param {{ fullName: string, email: string, phone: string, password: string }} data
 */
export async function registerUser({ fullName, email, phone, password }) {
  const response = await api.post('/users/register', { fullName, email, phone, password });
  return response.data; // { message, user }
}

