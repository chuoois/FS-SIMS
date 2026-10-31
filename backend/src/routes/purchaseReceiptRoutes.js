// =========================================================
// purchaseReceiptRoutes.js
// Định tuyến API Quản lý Phiếu Nhập Kho (Manage Purchase Receipts)
// Phân quyền: Yêu cầu đăng nhập và chỉ role OWNER được phép thao tác
// =========================================================

const express = require('express');
const {
  getReceipts,
  getReceiptSummary,
  getNextReceiptCode,
  getReceiptById,
  createReceipt,
  updateReceipt,
  confirmReceipt,
  cancelReceipt,
  deleteReceipt,
} = require('../controllers/purchaseReceiptController');

const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Bắt buộc xác thực và kiểm tra vai trò OWNER
router.use(authenticate, requireRole('OWNER'));

// 1. GET /api/purchase-receipts/summary - Thống kê tổng quan phiếu nhập kho
router.get('/summary', getReceiptSummary);

// 2. GET /api/purchase-receipts/next-code - Lấy mã phiếu nhập tự sinh tiếp theo
router.get('/next-code', getNextReceiptCode);

// 3. GET /api/purchase-receipts - Danh sách phiếu nhập (tìm kiếm, lọc NCC/trạng thái/ngày, phân trang)
router.get('/', getReceipts);

// 4. GET /api/purchase-receipts/:id - Xem chi tiết phiếu nhập kho & danh sách mặt hàng
router.get('/:id', getReceiptById);

// 5. POST /api/purchase-receipts - Tạo mới phiếu nhập kho (DRAFT hoặc CONFIRMED)
router.post('/', createReceipt);

// 6. PUT /api/purchase-receipts/:id - Cập nhật phiếu nhập kho (chỉ khi là DRAFT)
router.put('/:id', updateReceipt);

// 7. POST /api/purchase-receipts/:id/confirm - Xác nhận nhập kho phiếu nháp (cộng tồn kho)
router.post('/:id/confirm', confirmReceipt);

// 8. POST /api/purchase-receipts/:id/cancel - Hủy phiếu nhập kho (trừ lại tồn kho nếu đã CONFIRMED)
router.post('/:id/cancel', cancelReceipt);

// 9. DELETE /api/purchase-receipts/:id - Xóa phiếu nhập kho (chỉ khi là DRAFT hoặc CANCELLED)
router.delete('/:id', deleteReceipt);

module.exports = router;
