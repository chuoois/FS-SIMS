// =========================================================
// orderManagementRoutes.js
// Định tuyến API Quản lý Đơn hàng (Manage Orders — Owner & Leader)
// Phân quyền: Yêu cầu đăng nhập; Owner thấy toàn bộ đơn hàng
// =========================================================

const express = require('express');
const {
  getOrders,
  getOrderDetail,
  cancelOrder,
  updateOrderStatus,
  getOwnerRequests,
  getOwnerRequestDetail,
  reviewRequest,
  getStaffLeaders,
  assignLeader,
  inspectOrder,
  getLeaderOrders,
  leaderAccept,
  leaderProgress,
  leaderSubmit,
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

// ── 5. Owner thẩm định yêu cầu thiết kế (Order Requests) ─────
router.get('/owner/requests', requireRole('OWNER'), getOwnerRequests);
router.get('/owner/requests/:id', requireRole('OWNER'), getOwnerRequestDetail);
router.post('/owner/requests/:id/review', requireRole('OWNER'), reviewRequest);

// ── 6. Owner quản lý phân công & nghiệm thu ─────────────────
router.get('/leaders', requireRole('OWNER'), getStaffLeaders);
router.post('/orders/:id/assign-leader', requireRole('OWNER'), assignLeader);
router.post('/orders/:id/inspect', requireRole('OWNER'), inspectOrder);

// ── 7. Leader (Tổ trưởng xưởng) xử lý sản xuất ──────────────
router.get('/leader/orders', requireRole('LEADERSTAFF', 'OWNER'), getLeaderOrders);
router.post('/leader/orders/:id/accept', requireRole('LEADERSTAFF', 'OWNER'), leaderAccept);
router.post('/leader/orders/:id/progress', requireRole('LEADERSTAFF', 'OWNER'), leaderProgress);
router.post('/leader/orders/:id/submit-inspection', requireRole('LEADERSTAFF', 'OWNER'), leaderSubmit);

module.exports = router;
