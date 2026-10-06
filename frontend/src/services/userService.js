// =========================================================
// userService.js
// Mọi lời gọi HTTP liên quan đến xác thực tập trung ở đây
// =========================================================

import api from './api';

function getAuthHeaders() {
  const accessToken = sessionStorage.getItem('accessToken');
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getUserProfile() {
  const response = await api.get('/users/profile', {
    headers: getAuthHeaders(),
    withCredentials: true,
  });
  return response.data; // { message, user }
}

export async function updateUserProfile(profileData) {
  const response = await api.put('/users/profile', profileData, {
    headers: getAuthHeaders(),
    withCredentials: true,
  });
  return response.data; // { message, user }
}
