// =========================================================
// leaderStaffService.js
// Tất cả lời gọi API dành riêng cho vai trò Tổ trưởng xưởng (LEADERSTAFF)
// Tách biệt khỏi orderManagementService để tránh conflict và đảm bảo tính module
// Tuân thủ convention: Mọi API call qua services/api.js
// =========================================================

import api from './api';

/**
 * 1. Tổ trưởng xem danh sách đơn hàng được phân công
 * @param {Object} params - { page, limit, status, search, search_by, order_code, customer_name }
 */
export async function getLeaderOrders(params = {}) {
  try {
    const response = await api.get('/leader-staff/orders', { params });
    const d = response.data;
    const list = d?.data || d?.orders || (Array.isArray(d) ? d : []);
    return {
      ...d,
      data: list,
      orders: list,
    };
  } catch (err) {
    // Fallback sang route cũ nếu backend chưa reload
    const fallbackResponse = await api.get('/order-management/leader/orders', { params });
    const d = fallbackResponse.data;
    const list = d?.data || d?.orders || (Array.isArray(d) ? d : []);
    return {
      ...d,
      data: list,
      orders: list,
    };
  }
}

/**
 * 2. Tổ trưởng xem chi tiết bản vẽ kỹ thuật, kích thước, chất liệu, màu sắc của đơn
 * @param {number|string} orderId
 */
export async function getLeaderOrderDetail(orderId) {
  try {
    const response = await api.get(`/leader-staff/orders/${orderId}`);
    return response.data;
  } catch (err) {
    const fallbackResponse = await api.get(`/order-management/${orderId}`);
    return fallbackResponse.data;
  }
}

/**
 * 3. Tổ trưởng tiếp nhận đơn hàng vào sản xuất
 * @param {number|string} orderId
 * @param {Object} payload
 */
export async function leaderAcceptOrder(orderId, payload = {}) {
  try {
    const response = await api.post(`/leader-staff/orders/${orderId}/accept`, payload);
    return response.data;
  } catch (err) {
    const fallbackResponse = await api.post(`/order-management/leader/orders/${orderId}/accept`, payload);
    return fallbackResponse.data;
  }
}

/**
 * 4. Tổ trưởng cập nhật tiến độ sản xuất (Hoàn thành / Chưa hoàn thành)
 * @param {number|string} orderId
 * @param {{ isCompleted?: boolean, progressNote?: string, note?: string }} payload
 */
export async function leaderUpdateProgress(orderId, payload = {}) {
  try {
    const response = await api.post(`/leader-staff/orders/${orderId}/progress`, payload);
    return response.data;
  } catch (err) {
    const fallbackResponse = await api.post(`/order-management/leader/orders/${orderId}/progress`, payload);
    return fallbackResponse.data;
  }
}

/**
 * 5 & 6. Tổ trưởng gửi yêu cầu nghiệm thu lên Chủ xưởng (hoặc nộp lại sau khi khắc phục)
 * @param {number|string} orderId
 * @param {{ note?: string, images?: string[] }} payload
 */
export async function leaderSubmitInspection(orderId, payload = {}) {
  try {
    const response = await api.post(`/leader-staff/orders/${orderId}/submit-inspection`, payload);
    return response.data;
  } catch (err) {
    const fallbackResponse = await api.post(`/order-management/leader/orders/${orderId}/submit-inspection`, payload);
    return fallbackResponse.data;
  }
}

/**
 * 7. Upload hình ảnh nghiệm thu sản phẩm lên server / Cloudinary
 * @param {File[]|FileList|File} files
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

  try {
    const response = await api.post('/leader-staff/upload-inspection-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (err) {
    const fallbackResponse = await api.post('/order-management/upload-inspection-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return fallbackResponse.data;
  }
}

