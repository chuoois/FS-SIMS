// =========================================================
// supplierService.js
// Frontend API Client cho Quản lý Nhà cung cấp (Manage Suppliers)
// Sử dụng axios instance chung theo convention của dự án
// =========================================================

import api from './api';

/**
 * Lấy danh sách nhà cung cấp có phân trang, tìm kiếm và lọc trạng thái
 * @param {{ search?: string, status?: string, page?: number, limit?: number }} params
 */
export async function getSuppliers(params = {}) {
  const response = await api.get('/suppliers', { params });
  return response.data; // { message, data: suppliers, pagination }
}

/**
 * Lấy danh sách các nhà cung cấp đang ACTIVE (phục vụ chọn NCC khi lập phiếu nhập kho)
 */
export async function getActiveSuppliers() {
  const response = await api.get('/suppliers/active');
  return response.data; // { message, suppliers }
}

/**
 * Lấy mã nhà cung cấp tiếp theo tự động sinh (VD: NCC001)
 */
export async function getNextSupplierCode() {
  const response = await api.get('/suppliers/next-code');
  return response.data; // { message, nextCode }
}

/**
 * Lấy thông tin chi tiết 1 nhà cung cấp kèm lịch sử phiếu nhập kho
 * @param {number|string} id
 */
export async function getSupplierDetail(id) {
  const response = await api.get(`/suppliers/${id}`);
  return response.data; // { message, supplier }
}

/**
 * Tạo mới nhà cung cấp
 * @param {{ supplier_code: string, supplier_name: string, phone_number?: string, address?: string, note?: string, status?: string }} data
 */
export async function createSupplier(data) {
  const response = await api.post('/suppliers', data);
  return response.data; // { message, supplier }
}

/**
 * Cập nhật thông tin nhà cung cấp (không được sửa mã)
 * @param {number|string} id
 * @param {{ supplier_name?: string, phone_number?: string, address?: string, note?: string, status?: string }} data
 */
export async function updateSupplier(id, data) {
  const response = await api.put(`/suppliers/${id}`, data);
  return response.data; // { message, supplier }
}

/**
 * Xóa nhà cung cấp (chỉ được xóa khi chưa có phiếu nhập nào)
 * @param {number|string} id
 */
export async function deleteSupplier(id) {
  const response = await api.delete(`/suppliers/${id}`);
  return response.data; // { message }
}
