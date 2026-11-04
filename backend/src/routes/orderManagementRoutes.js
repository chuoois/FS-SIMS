// =========================================================
// orderManagementRoutes.js
// Định tuyến API Quản lý Đơn hàng (Manage Orders — Owner)
// Phân quyền: Yêu cầu đăng nhập; Owner thấy toàn bộ đơn hàng
// =========================================================

const express = require('express');
const {
  getOrders,
  getOrderDetail,
  cancelOrder,
  updateOrderStatus,
} = require('../controllers/orderManagementController');

const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tất cả route đều yêu cầu đăng nhập
router.use(authenticate);

// 1. GET /api/order-management
//    Danh sách đơn hàng (Owner xem tất cả)
router.get('/', requireRole('OWNER', 'SALES'), getOrders);

// 2. GET /api/order-management/:id
//    Chi tiết đơn hàng
router.get('/:id', requireRole('OWNER', 'SALES'), getOrderDetail);

// 3. POST /api/order-management/:id/cancel
//    Hủy đơn hàng (chưa COMPLETED, chưa CANCELLED)
router.post('/:id/cancel', requireRole('OWNER', 'SALES'), cancelOrder);

// 4. PATCH /api/order-management/:id/status
//    Cập nhật trạng thái đơn hàng (chỉ Owner)
router.patch('/:id/status', requireRole('OWNER'), updateOrderStatus);

module.exports = router;

