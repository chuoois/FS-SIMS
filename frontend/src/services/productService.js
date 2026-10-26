// =========================================================
// productService.js
// Frontend API Client cho Quản lý Sản phẩm (Manage Products)
// =========================================================

import api from './api';

/**
 * Lấy danh sách sản phẩm có phân trang, tìm kiếm và lọc
 */
export async function getProducts(params = {}) {
  const response = await api.get('/products', { params });
  return response.data;
}

/**
 * Lấy metadata sản phẩm (danh mục, phòng, chất liệu, màu sắc)
 */
export async function getProductMetadata() {
  const response = await api.get('/products/metadata');
  return response.data;
}

/**
 * Lấy thống kê tồn kho sản phẩm
 */
export async function getProductStockSummary() {
  const response = await api.get('/products/stock-summary');
  return response.data;
}

/**
 * Lấy mã sản phẩm tự sinh tiếp theo
 */
export async function getNextProductCode() {
  const response = await api.get('/products/next-code');
  return response.data;
}

/**
 * Lấy chi tiết 1 sản phẩm kèm thống kê sử dụng
 */
export async function getProductDetail(id) {
  const response = await api.get(`/products/${id}`);
  return response.data;
}

/**
 * Thêm mới sản phẩm (hỗ trợ FormData nếu có file ảnh)
 */
export async function createProduct(data) {
  let payload = data;
  let headers = {};

  if (data instanceof FormData) {
    payload = data;
    headers['Content-Type'] = 'multipart/form-data';
  }

  const response = await api.post('/products', payload, { headers });
  return response.data;
}

/**
 * Cập nhật sản phẩm (hỗ trợ FormData nếu có file ảnh mới)
 */
export async function updateProduct(id, data) {
  let payload = data;
  let headers = {};

  if (data instanceof FormData) {
    payload = data;
    headers['Content-Type'] = 'multipart/form-data';
  }

  const response = await api.put(`/products/${id}`, payload, { headers });
  return response.data;
}

/**
 * Xóa sản phẩm
 */
export async function deleteProduct(id) {
  const response = await api.delete(`/products/${id}`);
  return response.data;
}

/**
 * Thêm mới chất liệu sản phẩm
 */
export async function createProductMaterial(data) {
  const response = await api.post('/products/materials', data);
  return response.data;
}

/**
 * Thêm mới màu sắc sản phẩm
 */
export async function createProductColor(data) {
  const response = await api.post('/products/colors', data);
  return response.data;
}

