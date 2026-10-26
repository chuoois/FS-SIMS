// =========================================================
// rawMaterialRoutes.js
// Định tuyến API Quản lý Nguyên vật liệu (Manage Raw Materials)
// Phân quyền: Yêu cầu đăng nhập và chỉ role OWNER được phép thao tác
// =========================================================

const express = require('express');
const {
  getRawMaterials,
  getRawMaterialStockSummary,
  getNextRawMaterialCode,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} = require('../controllers/rawMaterialController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Bắt buộc xác thực và kiểm tra vai trò OWNER
router.use(authenticate, requireRole('OWNER'));

// 1. GET /api/raw-materials/stock-summary - Thống kê tồn kho & cảnh báo sắp hết
router.get('/stock-summary', getRawMaterialStockSummary);

// 2. GET /api/raw-materials/next-code - Lấy mã nguyên vật liệu tự sinh tiếp theo
router.get('/next-code', getNextRawMaterialCode);

// 3. GET /api/raw-materials - Danh sách nguyên vật liệu (tìm kiếm, lọc, phân trang)
router.get('/', getRawMaterials);

// 4. GET /api/raw-materials/:id - Chi tiết 1 nguyên vật liệu
router.get('/:id', getRawMaterialById);

// 5. POST /api/raw-materials - Thêm mới nguyên vật liệu
router.post('/', createRawMaterial);

// 6. PUT /api/raw-materials/:id - Cập nhật nguyên vật liệu
router.put('/:id', updateRawMaterial);

// 7. DELETE /api/raw-materials/:id - Xóa nguyên vật liệu (khi chưa phát sinh phiếu nhập/xuất kho)
router.delete('/:id', deleteRawMaterial);

module.exports = router;
