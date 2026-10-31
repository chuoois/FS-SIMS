// =========================================================
// materialExportRoutes.js
// Định tuyến API Quản lý Phiếu Xuất Kho Nguyên Vật Liệu (Manage Material Export Slips)
// Phân quyền: Yêu cầu đăng nhập và chỉ role OWNER được phép thao tác
// =========================================================

const express = require('express');
const {
  getMaterialExports,
  getMaterialExportSummary,
  getNextMaterialExportCode,
  getProductionOrdersList,
  getMaterialExportById,
  createMaterialExport,
  updateMaterialExport,
  confirmMaterialExport,
  cancelMaterialExport,
  deleteMaterialExport,
} = require('../controllers/materialExportController');

const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Bắt buộc xác thực và kiểm tra vai trò OWNER
router.use(authenticate, requireRole('OWNER'));

// 1. GET /api/material-exports/summary - Thống kê tổng quan phiếu xuất kho
router.get('/summary', getMaterialExportSummary);

// 2. GET /api/material-exports/next-code - Lấy mã phiếu xuất tự sinh tiếp theo
router.get('/next-code', getNextMaterialExportCode);

// 3. GET /api/material-exports/production-orders - Lấy danh sách lệnh gia công khả dụng
router.get('/production-orders', getProductionOrdersList);

// 4. GET /api/material-exports - Danh sách phiếu xuất kho (tìm kiếm, lọc, phân trang)
router.get('/', getMaterialExports);

// 5. GET /api/material-exports/:id - Chi tiết phiếu xuất kho & mặt hàng
router.get('/:id', getMaterialExportById);

// 6. POST /api/material-exports - Tạo mới phiếu xuất kho (DRAFT hoặc CONFIRMED)
router.post('/', createMaterialExport);

// 7. PUT /api/material-exports/:id - Cập nhật phiếu xuất kho nháp (DRAFT)
router.put('/:id', updateMaterialExport);

// 8. POST /api/material-exports/:id/confirm - Xác nhận xuất kho (trừ tồn kho nguyên vật liệu)
router.post('/:id/confirm', confirmMaterialExport);

// 9. POST /api/material-exports/:id/cancel - Hủy phiếu xuất kho nháp
router.post('/:id/cancel', cancelMaterialExport);

// 10. DELETE /api/material-exports/:id - Xóa phiếu xuất kho (DRAFT hoặc CANCELLED)
router.delete('/:id', deleteMaterialExport);

module.exports = router;
