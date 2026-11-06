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


/**
 * 5. Lấy danh sách yêu cầu thiết kế / may đo (Owner quản lý & thẩm định)
 */
export async function getOwnerRequests(params = {}) {
  const response = await api.get('/order-management/owner/requests', { params });
  return response.data;
}

/**
 * 6. Lấy chi tiết yêu cầu thiết kế theo ID (Owner)
 */
export async function getOwnerRequestById(id) {
  const response = await api.get(`/order-management/owner/requests/${id}`);
  return response.data;
}

/**
 * 7. Owner thẩm định yêu cầu: REQUEST_CHANGE, REJECT, APPROVE, FINALIZE_DESIGN
 */
export async function reviewOwnerRequest(id, payload) {
  const response = await api.post(`/order-management/owner/requests/${id}/review`, payload);
  return response.data;
}

/**
 * 8. Lấy danh sách Tổ trưởng xưởng (LEADERSTAFF)
 */
export async function getStaffLeaders() {
  const response = await api.get('/order-management/leaders');
  return response.data;
}

/**
 * 9. Owner phân công Tổ trưởng sản xuất đơn hàng
 */
export async function assignLeaderToOrder(orderId, payload) {
  const response = await api.post(`/order-management/orders/${orderId}/assign-leader`, payload);
  return response.data;
}

/**
 * 10. Owner nghiệm thu sản phẩm (ĐẠT / KHÔNG ĐẠT)
 */
export async function inspectOrder(orderId, payload) {
  const response = await api.post(`/order-management/orders/${orderId}/inspect`, payload);
  return response.data;
}

/**
 * 11. Tổ trưởng xem danh sách đơn hàng được giao
 */
export async function getLeaderOrders(params = {}) {
  const response = await api.get('/order-management/leader/orders', { params });
  return response.data;
}

/**
 * 12. Tổ trưởng tiếp nhận đơn hàng sản xuất
 */
export async function leaderAcceptOrder(orderId, payload = {}) {
  const response = await api.post(`/order-management/leader/orders/${orderId}/accept`, payload);
  return response.data;
}

/**
 * 13. Tổ trưởng cập nhật tiến độ sản xuất
 */
export async function leaderUpdateProgress(orderId, payload = {}) {
  const response = await api.post(`/order-management/leader/orders/${orderId}/progress`, payload);
  return response.data;
}

/**
 * 14. Tổ trưởng gửi yêu cầu nghiệm thu lên Owner
 */
export async function leaderSubmitInspection(orderId, payload = {}) {
  const response = await api.post(`/order-management/leader/orders/${orderId}/submit-inspection`, payload);
  return response.data;
}
