// =========================================================
// leaderStaffService.js
// Tất cả lời gọi API dành riêng cho vai trò Tổ trưởng xưởng (LEADERSTAFF)
// Chuẩn hóa response format theo AGENTS.md & docs/prompts/CONVENTIONS.md:
// Trả về { status, message, data, meta?, instance, traceId, timestamp }
// =========================================================

import api from './api';

/**
 * 1. Tổ trưởng xem danh sách đơn hàng được phân công
 * @param {Object} params - { page, limit, status, search, search_by, order_code, customer_name }
 * @returns {Promise<{ status: number, message: string, data: Array, meta: { page: number, limit: number, total: number, totalPages: number } }>}
 */
export async function getLeaderOrders(params = {}) {
  const response = await api.get('/leader-staff/orders', { params });
  return response.data;
}

/**
 * 2. Tổ trưởng xem chi tiết bản vẽ kỹ thuật, kích thước, chất liệu, màu sắc của đơn
 * @param {number|string} orderId
 * @returns {Promise<{ status: number, message: string, data: Object }>}
 */
export async function getLeaderOrderDetail(orderId) {
  const response = await api.get(`/leader-staff/orders/${orderId}`);
  return response.data;
}

/**
 * 3. Tổ trưởng tiếp nhận đơn hàng vào sản xuất
 * @param {number|string} orderId
 * @param {Object} payload
 * @returns {Promise<{ status: number, message: string, data: Object }>}
 */
export async function leaderAcceptOrder(orderId, payload = {}) {
  const response = await api.post(`/leader-staff/orders/${orderId}/accept`, payload);
  return response.data;
}

/**
 * 4. Tổ trưởng cập nhật tiến độ sản xuất (Hoàn thành / Chưa hoàn thành)
 * @param {number|string} orderId
 * @param {{ isCompleted?: boolean, progressNote?: string, note?: string }} payload
 * @returns {Promise<{ status: number, message: string, data: Object }>}
 */
export async function leaderUpdateProgress(orderId, payload = {}) {
  const response = await api.post(`/leader-staff/orders/${orderId}/progress`, payload);
  return response.data;
}

/**
 * 5 & 6. Tổ trưởng gửi yêu cầu nghiệm thu lên Chủ xưởng (hoặc nộp lại sau khi khắc phục)
 * @param {number|string} orderId
 * @param {{ note?: string, images?: string[] }} payload
 * @returns {Promise<{ status: number, message: string, data: Object }>}
 */
export async function leaderSubmitInspection(orderId, payload = {}) {
  const response = await api.post(`/leader-staff/orders/${orderId}/submit-inspection`, payload);
  return response.data;
}

/**
 * 7. Upload hình ảnh nghiệm thu sản phẩm lên server / Cloudinary
 * @param {File[]|FileList|File} files
 * @returns {Promise<{ status: number, message: string, data: string[] }>}
 */
export async function uploadInspectionImages(files) {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => formData.append('images', file));
  } else if (files instanceof FileList) {
    Array.from(files).forEach((file) => formData.append('images', file));
  } else if (files) {
    formData.append('images', files);
  }

  const response = await api.post('/leader-staff/upload-inspection-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
