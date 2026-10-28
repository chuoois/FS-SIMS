// =========================================================
// saleOrderService.js
// Service gọi API Riêng biệt cho Bán hàng & Tạo đơn hàng tại quầy (Sale POS)
// =========================================================

import api from './api';

/**
 * 1. Lấy danh sách sản phẩm có trong kho dành cho POS
 */
export async function getWarehouseProducts(params = {}) {
  const response = await api.get('/sale-orders/products', { params });
  return response.data;
}

/**
 * 2. Lấy thông tin chi tiết một sản phẩm trong kho (kích thước, combo...)
 */
export async function getProductDetail(productId) {
  const response = await api.get(`/sale-orders/products/${productId}`);
  return response.data;
}

/**
 * 3. Lấy metadata (danh mục, phòng...) phục vụ lọc ở POS
 */
export async function getProductMetadata() {
  const response = await api.get('/sale-orders/metadata');
  return response.data;
}

/**
 * 4. Tạo biên bản hợp đồng bán hàng trực tiếp tại quầy (OFFLINE DRAFT)
 */
export async function createOfflineContract(payload) {
  const response = await api.post('/sale-orders/contracts', payload);
  return response.data;
}

/**
 * 5. Ký và chốt hợp đồng tại quầy (Chuyển sang SIGNED)
 */
export async function signContract(contractId, payload = {}) {
  const response = await api.post(`/sale-orders/contracts/${contractId}/sign`, payload);
  return response.data;
}

/**
 * 6. Lấy danh sách hợp đồng
 */
export async function getContracts(params = {}) {
  const response = await api.get('/sale-orders/contracts', { params });
  return response.data;
}

/**
 * 7. Lấy chi tiết hợp đồng theo ID
 */
export async function getContractById(contractId) {
  const response = await api.get(`/sale-orders/contracts/${contractId}`);
  return response.data;
}

/**
 * 8. Tạo đơn hàng từ hợp đồng đã ký kết
 */
export async function createOrderFromContract(contractId) {
  const response = await api.post(`/sale-orders/orders/from-contract/${contractId}`);
  return response.data;
}

/**
 * 9. Lấy danh sách đơn hàng
 */
export async function getOrders(params = {}) {
  const response = await api.get('/sale-orders/orders', { params });
  return response.data;
}

/**
 * 10. Lấy chi tiết đơn hàng theo ID
 */
export async function getOrderById(orderId) {
  const response = await api.get(`/sale-orders/orders/${orderId}`);
  return response.data;
}

