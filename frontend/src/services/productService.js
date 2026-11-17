import api from './api';

/**
 * Lấy danh sách sản phẩm có phân trang, tìm kiếm và lọc
 */
export async function getProducts(params = {}) {
    const response = await api.get('/products', { params });
    return response.data;
}

/**
 * Lấy chi tiết một sản phẩm công khai
 */
export async function getProductById(productId) {
    const response = await api.get(`/products/${productId}`);
    return response.data;
}

/**
 * Lấy metadata (danh mục, không gian phòng...) phục vụ bộ lọc
 */
export async function getProductMetadata() {
    const response = await api.get('/products/metadata');
    return response.data;
}