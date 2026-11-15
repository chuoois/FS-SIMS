// =========================================================
// userService.js
// Mọi lời gọi HTTP liên quan đến user tập trung ở đây
// =========================================================

import api from './api';

export async function getUserProfile() {
  const response = await api.get('/users/profile');
  return { ...(response.data.data || {}), message: response.data.message };
}

export async function updateUserProfile(profileData) {
  const response = await api.put('/users/profile', profileData);
  return { ...(response.data.data || {}), message: response.data.message };
}

/**
 * Đổi mật khẩu — yêu cầu đăng nhập
 * @param {{ currentPassword: string, newPassword: string }} data
 */
export async function changePassword({ currentPassword, newPassword }) {
  const response = await api.put('/users/change-password', { currentPassword, newPassword });
  return { ...(response.data.data || {}), message: response.data.message };
}
