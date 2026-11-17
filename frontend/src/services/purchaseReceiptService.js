// =========================================================
// purchaseReceiptService.js
// Frontend API Client cho Quản lý Phiếu Nhập Kho (Manage Purchase Receipts)
// Sử dụng axios instance chung theo convention của dự án
// =========================================================

import api from './api';

/**
 * Lấy danh sách phiếu nhập kho (có tìm kiếm, lọc trạng thái, NCC, ngày, phân trang)
 * @param {{ search?: string, status?: string, supplier_id?: string|number, from_date?: string, to_date?: string, page?: number, limit?: number }} params
 */
export async function getReceipts(params = {}) {
  const response = await api.get('/purchase-receipts', { params });
  return response.data; // { message, data: receipts, pagination }
}

/**
 * Lấy thống kê tổng quan phiếu nhập (tổng phiếu, nháp, đã xác nhận, đã hủy, tổng tiền đã nhập)
 */
export async function getReceiptSummary() {
  const response = await api.get('/purchase-receipts/summary');
  return response.data; // { message, summary }
}

/**
 * Lấy mã phiếu nhập tiếp theo tự sinh cho một ngày nhất định
 * @param {string} [date] định dạng YYYY-MM-DD
 */
export async function getNextReceiptCode(date) {
  const response = await api.get('/purchase-receipts/next-code', {
    params: date ? { date } : {},
  });
  return response.data; // { message, nextCode }
}

/**
 * Lấy thông tin chi tiết 1 phiếu nhập kho kèm danh sách các mặt hàng
 * @param {number|string} id
 */
export async function getReceiptDetail(id) {
  const response = await api.get(`/purchase-receipts/${id}`);
  return response.data; // { message, receipt }
}

/**
 * Tạo mới phiếu nhập kho (DRAFT hoặc CONFIRMED)
 * @param {{ receipt_code?: string, supplier_id: number, receipt_date: string, status?: string, note?: string, items: Array<{ raw_material_id: number, quantity: number, unit_price: number, note?: string }> }} data
 */
export async function createReceipt(data) {
  const response = await api.post('/purchase-receipts', data);
  return response.data; // { message, receipt }
}

/**
 * Cập nhật phiếu nhập kho khi còn ở trạng thái DRAFT
 * @param {number|string} id
 * @param {{ supplier_id?: number, receipt_date?: string, status?: string, note?: string, items?: Array<{ raw_material_id: number, quantity: number, unit_price: number, note?: string }> }} data
 */
export async function updateReceipt(id, data) {
  const response = await api.put(`/purchase-receipts/${id}`, data);
  return response.data; // { message, receipt }
}

/**
 * Xác nhận nhập kho phiếu nháp (DRAFT -> CONFIRMED, tăng tồn kho nguyên vật liệu)
 * @param {number|string} id
 */
export async function confirmReceipt(id) {
  const response = await api.post(`/purchase-receipts/${id}/confirm`);
  return response.data; // { message, receipt }
}

/**
 * Hủy phiếu nhập kho (chuyển sang CANCELLED, trừ lại tồn kho nếu phiếu đã CONFIRMED)
 * @param {number|string} id
 * @param {{ note?: string }} [data]
 */
export async function cancelReceipt(id, data = {}) {
  const response = await api.post(`/purchase-receipts/${id}/cancel`, data);
  return response.data; // { message, receipt }
}

/**
 * Xóa phiếu nhập kho (chỉ được xóa khi ở trạng thái DRAFT hoặc CANCELLED)
 * @param {number|string} id
 */
export async function deleteReceipt(id) {
  const response = await api.delete(`/purchase-receipts/${id}`);
  return response.data; // { message }
}
