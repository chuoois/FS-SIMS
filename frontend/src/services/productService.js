import api from './api';

/**
 * Lấy danh sách sản phẩm có phân trang, tìm kiếm và lọc
 */
export async function getProducts(params = {}) {
    const response = await api.get('/products', { params });
    return response.data;
}

/**
 * Lấy metadata (danh mục, không gian phòng...) phục vụ bộ lọc
 */
export async function getProductMetadata() {
    const response = await api.get('/products/metadata');
    return response.data;
}