// =========================================================
// financialReportRoutes.js
// Định tuyến API Quản lý Báo cáo Tài chính (Manage Financial Reports — Owner)
// =========================================================

const express = require('express');
const {
  getFinancialSummary,
  getFinancialOrders,
  getFinancialReceipts,
  exportFinancialReport,
} = require('../controllers/financialReportController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tất cả route đều yêu cầu đăng nhập và có role OWNER
router.use(authenticate);
router.use(requireRole('OWNER'));

// 1. GET /api/financial-reports/summary — Tổng quan số liệu, biểu đồ, top sản phẩm
router.get('/summary', getFinancialSummary);

// 2. GET /api/financial-reports/orders — Bảng kê chi tiết đơn hàng
router.get('/orders', getFinancialOrders);

// 3. GET /api/financial-reports/receipts — Bảng kê chi tiết phiếu nhập vật tư
router.get('/receipts', getFinancialReceipts);

// 4. GET /api/financial-reports/export — Xuất toàn bộ dữ liệu báo cáo / file CSV
router.get('/export', exportFinancialReport);

module.exports = router;

