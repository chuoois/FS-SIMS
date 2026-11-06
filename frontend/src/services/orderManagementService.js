// =========================================================
// orderManagementService.js
// Tất cả lời gọi API cho Quản lý Đơn hàng & Nghiệm thu (Owner & Leader)
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

/**
 * Owner lấy danh sách yêu cầu đơn hàng từ Sales
 */
export async function getOwnerRequests(params = {}) {
  const response = await api.get('/order-management/requests', { params });
  return response.data;
}

/**
 * Owner lấy chi tiết 1 yêu cầu đơn hàng
 */
export async function getOwnerRequestById(id) {
  const response = await api.get(`/order-management/requests/${id}`);
  return response.data;
}

/**
 * Owner duyệt, chốt thiết kế, yêu cầu sửa, hoặc từ chối
 * @param {number|string} id
 * @param {{ action: 'APPROVE' | 'FINALIZE_DESIGN' | 'REQUEST_CHANGE' | 'REJECT', reason?: string, note?: string }} payload
 */
export async function reviewOwnerRequest(id, payload) {
  const response = await api.post(`/order-management/requests/${id}/review`, payload);
  return response.data;
}

/**
 * Owner lấy danh sách tài khoản Tổ trưởng (LeaderStaff)
 */
export async function getStaffLeaders() {
  const response = await api.get('/order-management/leaders');
  return response.data;
}

/**
 * Owner phân công Tổ trưởng phụ trách đơn hàng
 */
export async function assignLeaderToOrder(orderId, leaderId) {
  const response = await api.post(`/order-management/${orderId}/assign-leader`, { leaderId });
  return response.data;
}

/**
 * Owner nghiệm thu đơn hàng: PASSED hoặc FAILED
 * @param {number|string} orderId
 * @param {{ result: 'PASSED' | 'FAILED', reason?: string, note?: string }} payload
 */
export async function inspectOrder(orderId, payload) {
  const response = await api.post(`/order-management/${orderId}/inspection`, payload);
  return response.data;
}

/**
 * Leader xem danh sách đơn hàng được phân công cho mình
 */
export async function getLeaderOrders(params = {}) {
  const response = await api.get('/order-management/leader/orders', { params });
  return response.data;
}

/**
 * Leader xác nhận tiếp nhận đơn hàng sản xuất
 */
export async function leaderAcceptOrder(orderId) {
  const response = await api.post(`/order-management/leader/orders/${orderId}/accept`);
  return response.data;
}

/**
 * Leader cập nhật tiến độ / ghi chú sản xuất
 */
export async function leaderUpdateProgress(orderId, payload = {}) {
  const response = await api.patch(`/order-management/leader/orders/${orderId}/progress`, payload);
  return response.data;
}

/**
 * Leader gửi yêu cầu nghiệm thu lên Owner
 */
export async function leaderSubmitInspection(orderId, payload = {}) {
  const response = await api.post(`/order-management/leader/orders/${orderId}/submit-inspection`, payload);
  return response.data;
}
