// =========================================================
// staffAccountService.js
// Lời gọi HTTP quản lý tài khoản nhân viên (dành cho Chủ xưởng - Owner)
// Tập trung qua api instance chung theo convention của dự án
// =========================================================

import api from './api';

/**
 * Lấy danh sách tài khoản nhân viên nội bộ (Sales, Staff Leader)
 * Hỗ trợ tìm kiếm, lọc theo vai trò, trạng thái và phân trang
 * @param {{ search?: string, role?: string, status?: string, page?: number, limit?: number }} params
 */
export async function getStaffAccounts(params = {}) {
  const cleanParams = {};
  if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
  if (params.role && params.role !== 'ALL') cleanParams.role = params.role;
  if (params.status && params.status !== 'ALL') cleanParams.status = params.status;
  if (params.page) cleanParams.page = params.page;
  if (params.limit) cleanParams.limit = params.limit;

  const response = await api.get('/staff-accounts', { params: cleanParams });
  return response.data; // { message, data: accounts, pagination, stats }
}

/**
 * Lấy danh sách các vai trò nhân viên khả dụng
 */
export async function getStaffRoles() {
  const response = await api.get('/staff-accounts/roles');
  return response.data; // { message, roles }
}

/**
 * Lấy chi tiết 1 tài khoản nhân viên
 * @param {number|string} id
 */
export async function getStaffAccountDetail(id) {
  const response = await api.get(`/staff-accounts/${id}`);
  return response.data; // { message, account }
}

/**
 * Tạo mới tài khoản nhân viên
 * @param {{ email: string, password: string, fullName: string, phoneNumber: string, roleId: number, dob?: string, gender?: string, address?: string, note?: string }} data
 */
export async function createStaffAccount(data) {
  const response = await api.post('/staff-accounts', data);
  return response.data; // { message, account }
}

/**
 * Cập nhật thông tin nhân viên hoặc đổi vai trò / mật khẩu
 * @param {number|string} id
 * @param {{ fullName?: string, phoneNumber?: string, roleId?: number, dob?: string, gender?: string, address?: string, note?: string, password?: string }} data
 */
export async function updateStaffAccount(id, data) {
  const response = await api.put(`/staff-accounts/${id}`, data);
  return response.data; // { message, account }
}

/**
 * Khóa hoặc Mở khóa tài khoản nhân viên
 * @param {number|string} id
 * @param {'ACTIVE'|'INACTIVE'} status
 */
export async function changeStaffAccountStatus(id, status) {
  const response = await api.patch(`/staff-accounts/${id}/status`, { status });
  return response.data; // { message, status }
}

/**
 * Xóa tài khoản nhân viên khỏi hệ thống
 * @param {number|string} id
 */
export async function deleteStaffAccount(id) {
  const response = await api.delete(`/staff-accounts/${id}`);
  return response.data; // { message }
}
