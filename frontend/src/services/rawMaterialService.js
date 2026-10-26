// =========================================================
// rawMaterialService.js
// Frontend API Client cho Quản lý Nguyên vật liệu (Manage Raw Materials)
// =========================================================

import api from './api';

/**
 * Lấy danh sách nguyên vật liệu có phân trang, tìm kiếm và lọc
 */
export async function getRawMaterials(params = {}) {
  const response = await api.get('/raw-materials', { params });
  return response.data;
}

/**
 * Lấy thống kê tồn kho nguyên vật liệu
 */
export async function getRawMaterialStockSummary() {
  const response = await api.get('/raw-materials/stock-summary');
  return response.data;
}

/**
 * Lấy mã nguyên vật liệu tự sinh tiếp theo
 */
export async function getNextRawMaterialCode() {
  const response = await api.get('/raw-materials/next-code');
  return response.data;
}

/**
 * Lấy chi tiết 1 nguyên vật liệu
 */
export async function getRawMaterialDetail(id) {
  const response = await api.get(`/raw-materials/${id}`);
  return response.data;
}

/**
 * Thêm mới nguyên vật liệu
 */
export async function createRawMaterial(data) {
  const response = await api.post('/raw-materials', data);
  return response.data;
}

/**
 * Cập nhật nguyên vật liệu
 */
export async function updateRawMaterial(id, data) {
  const response = await api.put(`/raw-materials/${id}`, data);
  return response.data;
}

/**
 * Xóa nguyên vật liệu
 */
export async function deleteRawMaterial(id) {
  const response = await api.delete(`/raw-materials/${id}`);
  return response.data;
}
