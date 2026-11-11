// =========================================================
// api.js
// Axios instance dùng chung toàn app
//
// Interceptor tự động:
//   1. REQUEST  — kiểm tra hạn JWT accessToken; nếu sắp/đã hết hạn thì refresh
//                 trước (single-flight) rồi mới gắn Authorization: Bearer <token>
//   2. RESPONSE — khi nhận 401:
//        a. Gọi POST /auth/refresh (cookie httpOnly) để lấy accessToken mới
//        b. Lưu token mới, retry request gốc
//        c. Các request khác đến trong lúc đang refresh sẽ được queue và
//           chạy lại sau khi refresh xong (tránh gọi /refresh nhiều lần)
//        d. Nếu refresh cũng thất bại → xóa session, dispatch auth:session-expired
// =========================================================

import axios from 'axios';

const ACCESS_TOKEN_KEY = 'accessToken';
const TOKEN_REFRESH_BUFFER_MS = 3000;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true, // luôn gửi cookie (refresh token httpOnly)
});

// ── Trạng thái refresh single-flight đang chạy ────────────
let refreshPromise = null;

function parseJwtExpMs(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    const payload = JSON.parse(json);
    return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token) {
  const expMs = parseJwtExpMs(token);
  if (!expMs) return false;
  return Date.now() >= expMs - TOKEN_REFRESH_BUFFER_MS;
}

function shouldSkipRefreshForUrl(url = '') {
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/staff-auth/login')
  );
}

async function refreshAccessTokenSingleFlight() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/refresh`,
      {},
      { withCredentials: true }
    )
    .then(({ data }) => {
      const newToken = data.accessToken;
      sessionStorage.setItem(ACCESS_TOKEN_KEY, newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return newToken;
    })
    .catch((refreshError) => {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem('authUser');
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      throw refreshError;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// ── Request interceptor: chủ động refresh nếu JWT sắp/đã hết hạn ──
api.interceptors.request.use(
  async (config) => {
    let token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && !shouldSkipRefreshForUrl(config.url) && isTokenExpiringSoon(token)) {
      try {
        token = await refreshAccessTokenSingleFlight();
      } catch {
        // Nếu refresh thất bại, để flow response/caller xử lý session-expired
      }
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: xử lý 401 dự phòng ──────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      shouldSkipRefreshForUrl(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newToken = await refreshAccessTokenSingleFlight();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export default api;
