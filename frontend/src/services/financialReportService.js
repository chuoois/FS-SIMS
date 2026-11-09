// =========================================================
// financialReportService.js
// Frontend API Client cho Quản lý Báo cáo Tài chính (Owner Financial Reports)
// Sử dụng axios instance chung theo convention của dự án
// =========================================================

import api from './api';

/**
 * Lấy dữ liệu tổng quan báo cáo tài chính (KPIs, biểu đồ, cơ cấu loại đơn, top sản phẩm)
 * @param {{ startDate?: string, endDate?: string, groupBy?: string }} params
 */
export async function getFinancialSummary(params = {}) {
  const response = await api.get('/financial-reports/summary', { params });
  return response.data; // { message, summary }
}

/**
 * Lấy danh sách chi tiết đơn hàng doanh thu (phân trang, lọc theo loại, trạng thái)
 * @param {{ startDate?: string, endDate?: string, orderType?: string, status?: string, page?: number, limit?: number }} params
 */
export async function getFinancialOrders(params = {}) {
  const response = await api.get('/financial-reports/orders', { params });
  return response.data; // { message, orders, pagination }
}

/**
 * Lấy danh sách chi tiết chi phí nhập kho nguyên vật liệu (phân trang, lọc theo trạng thái)
 * @param {{ startDate?: string, endDate?: string, status?: string, page?: number, limit?: number }} params
 */
export async function getFinancialReceipts(params = {}) {
  const response = await api.get('/financial-reports/receipts', { params });
  return response.data; // { message, receipts, pagination }
}

/**
 * Lấy toàn bộ dữ liệu báo cáo tài chính để xuất file Excel/PDF
 * @param {{ startDate?: string, endDate?: string }} params
 */
export async function getFinancialExportData(params = {}) {
  const response = await api.get('/financial-reports/export', { params });
  return response.data; // { message, exportData: { summary, orders, receipts } }
}

/**
 * Tải trực tiếp file CSV xuất từ backend
 * @param {{ startDate?: string, endDate?: string }} params
 */
export async function downloadFinancialCSV(params = {}) {
  const response = await api.get('/financial-reports/export', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  });
  return response.data;
}

