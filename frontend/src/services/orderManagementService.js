// =========================================================
// orderManagementService.js
// Tất cả lời gọi API cho Quản lý Đơn hàng (Owner)
// Tuân thủ convention: Mọi API call qua services/api.js
// =========================================================

import api from './api';

/**
 * Lấy danh sách đơn hàng (phân trang, lọc, tìm kiếm)
 * @param {Object} params - { page, limit, status, order_type, search }
 */
export async function getOrders(params = {}) {
  const response = await api.get('/order-management', { params });
  return response.data;
}

/**
 * Lấy chi tiết đơn hàng theo ID
 * @param {number|string} id
 */
export async function getOrderDetail(id) {
  const response = await api.get(`/order-management/${id}`);
  return response.data;
}

/**
 * Hủy đơn hàng
 * @param {number|string} id
 */
export async function cancelOrder(id) {
  const response = await api.post(`/order-management/${id}/cancel`);
  return response.data;
}

/**
 * Cập nhật trạng thái đơn hàng (Owner)
 * @param {number|string} id
 * @param {{ status: string }} data
 */
export async function updateOrderStatus(id, data) {
  const response = await api.patch(`/order-management/${id}/status`, data);
  return response.data;
}

