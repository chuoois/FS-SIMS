
// =========================================================
// productRoutes.js
// Định tuyến API Khách hàng xem Sản phẩm (Public Product Browsing)
// Không yêu cầu đăng nhập
// =========================================================

const express = require('express');
const {
    getProducts,
    getProductById,
    getProductMetadata,
} = require('../controllers/productController');

const router = express.Router();

// 1. GET /api/products/metadata - Metadata (danh mục, phòng, chất liệu, màu sắc) phục vụ lọc
router.get('/metadata', getProductMetadata);

// 2. GET /api/products/:id - Chi tiết sản phẩm công khai
router.get('/:id', getProductById);

// 3. GET /api/products - Danh sách sản phẩm (tìm kiếm, lọc theo danh mục, phòng, phân trang)
router.get('/', getProducts);

module.exports = router;