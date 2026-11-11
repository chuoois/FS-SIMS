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

/**
 * 11. Lấy danh sách yêu cầu của khách hàng (dành cho Sale)
 */
export async function getRequests(params = {}) {
  const response = await api.get('/sale-orders/requests', { params });
  return response.data;
}

/**
 * 12. Lấy chi tiết 1 yêu cầu
 */
export async function getRequestById(requestId) {
  const response = await api.get(`/sale-orders/requests/${requestId}`);
  return response.data;
}

/**
 * 13. Chuyển yêu cầu thành hợp đồng DRAFT
 */
export async function convertRequestToContract(requestId, payload = {}) {
  const response = await api.post(`/sale-orders/requests/${requestId}/convert-to-contract`, payload);
  return response.data;
}

/**
 * 14. Lấy danh sách khách hàng phục vụ dropdown/autocomplete cho Sales
 */
export async function getCustomers(params = {}) {
  const response = await api.get('/sale-orders/customers', { params });
  return response.data;
}

/**
 * 15. Sales tạo đơn yêu cầu thiết kế / may đo riêng biệt (Order Request)
 */
export async function createSalesOrderRequest(payload) {
  const response = await api.post('/sale-orders/requests', payload);
  return response.data;
}

/**
 * 16. Sales cập nhật lại đơn yêu cầu (khi Owner yêu cầu sửa thiết kế)
 */
export async function updateSalesOrderRequest(requestId, payload) {
  const response = await api.put(`/sale-orders/requests/${requestId}`, payload);
  return response.data;
}

/**
 * 17. Sales kích hoạt giao hàng (khi Owner nghiệm thu đạt READY_TO_DELIVER)
 */
export async function confirmOrderDelivery(orderId, payload = {}) {
  const response = await api.post(`/sale-orders/orders/${orderId}/deliver`, payload);
  return response.data;
}

/**
 * 18. Sales xác nhận đã giao hàng thành công -> Hoàn tất đơn COMPLETED
 */
export async function completeOrderDelivery(orderId, payload = {}) {
  const response = await api.post(`/sale-orders/orders/${orderId}/complete`, payload);
  return response.data;
}

/**
 * 19. Tải lên danh sách hình ảnh thiết kế / may đo (Cloudinary)
 */
export async function uploadRequestImages(files) {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => formData.append('images', file));
  } else if (files instanceof FileList) {
    Array.from(files).forEach((file) => formData.append('images', file));
  } else if (files) {
    formData.append('images', files);
  }
  const response = await api.post('/sale-orders/upload-images', formData);
  return response.data;
}

/**
 * 20. Chủ xưởng gửi bản thiết kế (file + ghi chú) sang cho Sales
 */
export async function updateRequestDesign(requestId, formData) {
  const response = await api.patch(
    `/sale-orders/requests/${requestId}/design`,
    formData
  );

  return response.data;
}

/**
 * 21. Thêm mới chất liệu (loại gỗ) trực tiếp từ form tạo/sửa yêu cầu
 */
export async function createRequestMaterial(data) {
  const response = await api.post('/sale-orders/materials', data);
  return response.data;
}

/**
 * 22. Thêm mới màu sắc (màu sơn) trực tiếp từ form tạo/sửa yêu cầu
 */
export async function createRequestColor(data) {
  const response = await api.post('/sale-orders/colors', data);
  return response.data;
}
