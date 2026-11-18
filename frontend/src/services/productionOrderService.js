// =========================================================
// productionOrderService.js
// Frontend API Client cho Quản lý Lệnh Gia Công (Manage Production Orders)
// Sử dụng axios instance chung theo convention của dự án
// =========================================================

import api from './api';

/**
 * Lấy danh sách lệnh gia công (tìm kiếm, lọc trạng thái, phân trang)
 * @param {{ search?: string, status?: string, page?: number, limit?: number }} params
 */
export async function getProductionOrders(params = {}) {
  const response = await api.get('/production-orders', { params });
  return response.data; // { message, productionOrders, pagination }
}

/**
 * Lấy chi tiết 1 lệnh gia công kèm ảnh thiết kế và ảnh nghiệm thu
 * @param {number|string} id - production_id
 */
export async function getProductionOrderDetail(id) {
  const response = await api.get(`/production-orders/${id}`);
  return response.data; // { message, productionOrder }
}

/**
 * Lấy danh sách đơn hàng CONFIRMED + CUSTOM chưa có lệnh gia công (cho dropdown tạo mới)
 */
export async function getEligibleOrders() {
  const response = await api.get('/production-orders/eligible-orders');
  return response.data; // { message, data: orders }
}

/**
 * Lấy danh sách trưởng nhóm sản xuất (LEADERSTAFF) đang ACTIVE (cho dropdown gán trưởng nhóm)
 */
export async function getStaffLeaders() {
  const response = await api.get('/production-orders/staff-leaders');
  return response.data; // { message, data: leaders }
}

/**
 * Tạo mới lệnh gia công từ đơn hàng khách hàng
 * @param {{ order_id: number, planned_start: string, planned_end: string }} data
 */
export async function createProductionOrder(data) {
  const response = await api.post('/production-orders', data);
  return response.data; // { message, productionOrder }
}

/**
 * Gán trưởng nhóm sản xuất cho lệnh gia công
 * @param {number|string} id - production_id
 * @param {{ assigned_to: number }} data
 */
export async function assignLeader(id, data) {
  const response = await api.patch(`/production-orders/${id}/assign-leader`, data);
  return response.data; // { message, productionOrder }
}

/**
 * Hủy lệnh gia công
 * @param {number|string} id - production_id
 */
export async function cancelProductionOrder(id) {
  const response = await api.post(`/production-orders/${id}/cancel`);
  return response.data; // { message }
}

/**
 * Chủ xưởng upload ảnh thiết kế / bản vẽ mẫu lên lệnh gia công
 * @param {number|string} id - production_id
 * @param {File[]|FileList} files
 * @param {string[]} urlList - danh sách URL thủ công (nếu có)
 */
export async function uploadProductionDesignImages(id, files = [], urlList = [], orderItemId = null) {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => formData.append('images', file));
  } else if (files instanceof FileList) {
    Array.from(files).forEach((file) => formData.append('images', file));
  }
  if (urlList && urlList.length > 0) {
    urlList.forEach((url) => formData.append('urls', url));
  }
  if (orderItemId) {
    formData.append('order_item_id', String(orderItemId));
  }
  const response = await api.post(`/production-orders/${id}/upload-design-images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data; // { message, urls, count }
}

/**
 * Chủ xưởng nghiệm thu lệnh gia công (Duyệt hoặc Từ chối)
 * @param {number|string} id - production_id
 * @param {{ passed: boolean, rejectReason?: string }} data
 */
export async function inspectProductionOrder(id, data) {
  const response = await api.post(`/production-orders/${id}/inspect`, data);
  return response.data; // { message, order }
}

