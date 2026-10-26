
const {
    getProductsWithPagination,
    getProductMetadata: getProductMetadataModel,
} = require('../models/ProductModel');

const {
    validateProductQueryParams,
    toProductDTO,
} = require('../utils/productValidator');

/**
 * GET /api/products
 * Lấy danh sách sản phẩm (tìm kiếm, lọc theo danh mục, phòng, chất liệu, màu sắc, tồn kho, phân trang)
 */
async function getProducts(req, res) {
    try {
        const params = validateProductQueryParams(req.query);
        const queryParams = {
            ...params,
            status: params.status || 'ACTIVE',
        };
        const result = await getProductsWithPagination(queryParams);

        return res.status(200).json({
            message: 'Lấy danh sách sản phẩm thành công',
            data: (result.products || []).map(toProductDTO),
            pagination: {
                totalItems: result.totalItems,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                itemsPerPage: result.itemsPerPage,
            },
        });
    } catch (error) {
        console.error('[productController.getProducts]', error);
        return res.status(500).json({
            message: 'Lỗi máy chủ khi lấy danh sách sản phẩm',
            error: error.message,
        });
    }
}

/**
 * GET /api/products/metadata
 * Lấy danh mục, phòng, chất liệu, màu sắc cho bộ lọc khách hàng
 */
async function getProductMetadata(req, res) {
    try {
        const metadata = await getProductMetadataModel();
        return res.status(200).json({
            message: 'Lấy metadata sản phẩm thành công',
            data: metadata,
        });
    } catch (error) {
        console.error('[productController.getProductMetadata]', error);
        return res.status(500).json({
            message: 'Lỗi máy chủ khi lấy metadata sản phẩm',
            error: error.message,
        });
    }
}

module.exports = {
    getProducts,
    getProductMetadata,
};
