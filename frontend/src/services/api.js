// =========================================================
// api.js
// Axios instance dùng chung toàn app
//
// Interceptor tự động:
//   1. REQUEST  — gắn Authorization: Bearer <accessToken> (lấy từ sessionStorage)
//   2. RESPONSE — khi nhận 401:
//        a. Gọi POST /auth/refresh (cookie httpOnly) để lấy accessToken mới
//        b. Lưu token mới, retry request gốc
//        c. Các request khác đến trong lúc đang refresh sẽ được queue và
//           chạy lại sau khi refresh xong (tránh gọi /refresh nhiều lần)
//        d. Nếu refresh cũng thất bại → xóa session, redirect /login
// =========================================================

import axios from 'axios';

const ACCESS_TOKEN_KEY = 'accessToken';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true, // luôn gửi cookie (refresh token httpOnly)
});

// ── Trạng thái refresh đang chạy ──────────────────────────
let isRefreshing = false;
let failedQueue = []; // { resolve, reject }[]

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

// ── Request interceptor: gắn Bearer token ─────────────────
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: xử lý 401 ──────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Chỉ xử lý 401; bỏ qua nếu chính request /auth/refresh bị 401
    // hoặc request này đã được retry một lần rồi
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/staff-auth/login')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Đang refresh → đưa vào queue, chờ token mới
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data.accessToken;
      sessionStorage.setItem(ACCESS_TOKEN_KEY, newToken);

      // Cập nhật header mặc định cho các request tiếp theo
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

      processQueue(null, newToken);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Refresh thất bại → xóa session và chuyển về login
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem('authUser');

      // Dispatch custom event để AuthContext lắng nghe và reset state
      window.dispatchEvent(new CustomEvent('auth:session-expired'));

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
