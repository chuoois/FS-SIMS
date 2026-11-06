// =========================================================
// orderManagementRoutes.js
// Định tuyến API Quản lý Đơn hàng (Manage Orders — Owner & Leader)
// =========================================================

const express = require('express');
const {
  getOrders,
  getOrderDetail,
  cancelOrder,
  updateOrderStatus,
  getRequestsForOwner,
  getRequestDetailForOwner,
  reviewRequest,
  getStaffLeadersList,
  assignLeader,
  inspectOrder,
  getLeaderOrders,
  leaderAccept,
  leaderProgress,
  leaderSubmitInspection,
} = require('../controllers/orderManagementController');

const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tất cả route đều yêu cầu đăng nhập
router.use(authenticate);

// ── 1. OWNER: QUẢN LÝ YÊU CẦU ĐẶT HÀNG & DUYỆT / CHỐT THIẾT KẾ ──
router.get('/requests', requireRole('OWNER'), getRequestsForOwner);
router.get('/requests/:id', requireRole('OWNER'), getRequestDetailForOwner);
router.post('/requests/:id/review', requireRole('OWNER'), reviewRequest);

// ── 2. OWNER: PHÂN CÔNG TỔ TRƯỞNG & NGHIỆM THU ────────────────
router.get('/leaders', requireRole('OWNER'), getStaffLeadersList);
router.post('/:id/assign-leader', requireRole('OWNER'), assignLeader);
router.post('/:id/inspection', requireRole('OWNER'), inspectOrder);

// ── 3. LEADER: TIẾP NHẬN SẢN XUẤT, TIẾN ĐỘ & GỬI NGHIỆM THU ──
router.get('/leader/orders', requireRole('LEADERSTAFF', 'OWNER'), getLeaderOrders);
router.post('/leader/orders/:id/accept', requireRole('LEADERSTAFF', 'OWNER'), leaderAccept);
router.patch('/leader/orders/:id/progress', requireRole('LEADERSTAFF', 'OWNER'), leaderProgress);
router.post('/leader/orders/:id/submit-inspection', requireRole('LEADERSTAFF', 'OWNER'), leaderSubmitInspection);

// ── 4. CHUNG: DANH SÁCH & CHI TIẾT ĐƠN HÀNG ───────────────────
router.get('/', requireRole('OWNER', 'SALES'), getOrders);
router.get('/:id', requireRole('OWNER', 'SALES'), getOrderDetail);
router.post('/:id/cancel', requireRole('OWNER', 'SALES'), cancelOrder);
router.patch('/:id/status', requireRole('OWNER'), updateOrderStatus);

module.exports = router;
