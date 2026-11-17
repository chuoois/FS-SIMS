// =========================================================
// materialExportService.js
// Frontend API Client cho Quản lý Phiếu Xuất Kho Nguyên Vật Liệu (Manage Material Export Slips)
// Sử dụng axios instance chung theo convention của dự án
// =========================================================

import api from './api';

/**
 * Lấy danh sách phiếu xuất kho (có tìm kiếm, lọc trạng thái, lệnh gia công, ngày, phân trang)
 * @param {{ search?: string, status?: string, production_id?: string|number, from_date?: string, to_date?: string, page?: number, limit?: number }} params
 */
export async function getMaterialExports(params = {}) {
  const response = await api.get('/material-exports', { params });
  return response.data; // { message, data: issues, pagination }
}

/**
 * Lấy thống kê tổng quan phiếu xuất kho (tổng phiếu, nháp, đã xác nhận, đã hủy, tổng số lượng đã xuất)
 */
export async function getMaterialExportSummary() {
  const response = await api.get('/material-exports/summary');
  return response.data; // { message, summary }
}

/**
 * Lấy mã phiếu xuất tiếp theo tự sinh cho một ngày nhất định
 * @param {string} [date] định dạng YYYY-MM-DD
 */
export async function getNextMaterialExportCode(date) {
  const response = await api.get('/material-exports/next-code', {
    params: date ? { date } : {},
  });
  return response.data; // { message, nextCode }
}

/**
 * Lấy danh sách lệnh gia công khả dụng để chọn khi lập phiếu xuất kho
 */
export async function getProductionOrdersForExport() {
  const response = await api.get('/material-exports/production-orders');
  return response.data; // { message, data: productionOrders }
}

/**
 * Lấy thông tin chi tiết 1 phiếu xuất kho kèm danh sách các mặt hàng xuất
 * @param {number|string} id
 */
export async function getMaterialExportDetail(id) {
  const response = await api.get(`/material-exports/${id}`);
  return response.data; // { message, issue }
}

/**
 * Tạo mới phiếu xuất kho (DRAFT hoặc CONFIRMED)
 * @param {{ issue_code?: string, production_id: number, issue_date: string, status?: string, note?: string, items: Array<{ raw_material_id: number, quantity: number, note?: string }> }} data
 */
export async function createMaterialExport(data) {
  const response = await api.post('/material-exports', data);
  return response.data; // { message, issue }
}

/**
 * Cập nhật phiếu xuất kho khi còn ở trạng thái DRAFT
 * @param {number|string} id
 * @param {{ production_id?: number, issue_date?: string, status?: string, note?: string, items?: Array<{ raw_material_id: number, quantity: number, note?: string }> }} data
 */
export async function updateMaterialExport(id, data) {
  const response = await api.put(`/material-exports/${id}`, data);
  return response.data; // { message, issue }
}

/**
 * Xác nhận xuất kho phiếu nháp (DRAFT -> CONFIRMED, trừ tồn kho nguyên vật liệu)
 * @param {number|string} id
 */
export async function confirmMaterialExport(id) {
  const response = await api.post(`/material-exports/${id}/confirm`);
  return response.data; // { message, issue }
}

/**
 * Hủy phiếu xuất kho nháp
 * @param {number|string} id
 * @param {{ note?: string }} [data]
 */
export async function cancelMaterialExport(id, data = {}) {
  const response = await api.post(`/material-exports/${id}/cancel`, data);
  return response.data; // { message, issue }
}

/**
 * Xóa phiếu xuất kho (chỉ được xóa khi ở trạng thái DRAFT hoặc CANCELLED)
 * @param {number|string} id
 */
export async function deleteMaterialExport(id) {
  const response = await api.delete(`/material-exports/${id}`);
  return response.data; // { message }
}
