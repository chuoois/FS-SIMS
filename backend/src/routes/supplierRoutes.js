// =========================================================
// supplierRoutes.js
// Định tuyến API Quản lý Nhà cung cấp (Manage Suppliers)
// Phân quyền: Yêu cầu đăng nhập và chỉ role OWNER được phép truy cập
// =========================================================

const express = require('express');
const {
  getSuppliers,
  getActiveSuppliers,
  getNextSupplierCode,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Bắt buộc xác thực và kiểm tra vai trò OWNER
router.use(authenticate, requireRole('OWNER'));

// 1. GET /api/suppliers - Xem danh sách nhà cung cấp (tìm kiếm, lọc, phân trang)
router.get('/', getSuppliers);

// 2. GET /api/suppliers/active - Lấy danh sách các nhà cung cấp đang ACTIVE
router.get('/active', getActiveSuppliers);

// 3. GET /api/suppliers/next-code - Lấy mã nhà cung cấp tự động sinh tiếp theo
router.get('/next-code', getNextSupplierCode);

// 4. GET /api/suppliers/:id - Xem chi tiết nhà cung cấp & lịch sử phiếu nhập
router.get('/:id', getSupplierById);

// 5. POST /api/suppliers - Thêm mới nhà cung cấp
router.post('/', createSupplier);

// 5. PUT /api/suppliers/:id - Cập nhật thông tin nhà cung cấp (không đổi mã)
router.put('/:id', updateSupplier);

// 6. DELETE /api/suppliers/:id - Xóa nhà cung cấp (chỉ cho phép khi chưa có phiếu nhập)
router.delete('/:id', deleteSupplier);

module.exports = router;
