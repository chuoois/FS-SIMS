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
 * Tạo mới lệnh gia công từ đơn hàng khách hàng (hỗ trợ multipart/form-data kèm bản vẽ kỹ thuật)
 * @param {FormData|{ order_id: number, planned_start: string, planned_end: string, design_file?: File, design_file_url?: string }} data
 */
export async function createProductionOrder(data) {
  let payload = data;

  if (typeof FormData !== 'undefined' && !(data instanceof FormData)) {
    if (data && data.design_file instanceof File) {
      const formData = new FormData();
      formData.append('order_id', data.order_id);
      formData.append('planned_start', data.planned_start);
      formData.append('planned_end', data.planned_end);
      formData.append('design_file', data.design_file);
      if (data.design_file_url) {
        formData.append('design_file_url', data.design_file_url);
      }
      payload = formData;
    }
  }

  const response = await api.post('/production-orders', payload);
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
 * Cập nhật file bản vẽ kỹ thuật cho lệnh gia công
 * @param {number|string} id - production_id
 * @param {FormData|File|string} fileOrData
 */
export async function updateProductionOrderDesignFile(id, fileOrData) {
  let payload = fileOrData;

  if (typeof FormData !== 'undefined') {
    if (fileOrData instanceof File) {
      const formData = new FormData();
      formData.append('design_file', fileOrData);
      payload = formData;
    } else if (typeof fileOrData === 'string') {
      payload = { design_file_url: fileOrData };
    }
  }

  const response = await api.patch(`/production-orders/${id}/design-file`, payload);
  return response.data; // { message, productionOrder }
}
