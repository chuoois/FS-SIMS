// =========================================================
// productRoutes.js
// Định tuyến API Quản lý Sản phẩm (Manage Products)
// Phân quyền: Yêu cầu đăng nhập và chỉ role OWNER được phép thao tác
// =========================================================

const express = require('express');
const {
  getProducts,
  getProductMetadata,
  getProductStockSummary,
  getNextProductCode,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductMaterial,
  createProductColor,
} = require('../controllers/productController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Bắt buộc xác thực và kiểm tra vai trò OWNER
router.use(authenticate, requireRole('OWNER'));

// 1. GET /api/products/metadata - Lấy danh mục, phòng, chất liệu, màu sắc
router.get('/metadata', getProductMetadata);

// 2. GET /api/products/stock-summary - Thống kê tồn kho sản phẩm
router.get('/stock-summary', getProductStockSummary);

// 3. GET /api/products/next-code - Lấy mã sản phẩm tự sinh tiếp theo
router.get('/next-code', getNextProductCode);

// 3a. POST /api/products/materials - Thêm mới chất liệu
router.post('/materials', createProductMaterial);

// 3b. POST /api/products/colors - Thêm mới màu sắc
router.post('/colors', createProductColor);

// 4. GET /api/products - Danh sách sản phẩm (tìm kiếm, lọc, phân trang)
router.get('/', getProducts);

// 5. GET /api/products/:id - Chi tiết 1 sản phẩm
router.get('/:id', getProductById);

// 6. POST /api/products - Thêm mới sản phẩm kèm upload 1 ảnh Cloudinary
router.post('/', upload.single('image'), createProduct);

// 7. PUT /api/products/:id - Cập nhật sản phẩm kèm upload ảnh mới nếu có
router.put('/:id', upload.single('image'), updateProduct);

// 8. DELETE /api/products/:id - Xóa sản phẩm (khi chưa sử dụng trong giao dịch)
router.delete('/:id', deleteProduct);

module.exports = router;
