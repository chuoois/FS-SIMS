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
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Tất cả route đều yêu cầu đăng nhập
router.use(authenticate);

// ── 1. Danh sách nhân sự Leader & Staff phân công sản xuất ─────
// Đặt TRƯỚC router.get('/:id') để tránh Express nuốt param :id = 'leaders'
router.get('/leaders', requireRole('OWNER', 'SALES', 'LEADERSTAFF', 'MANAGER', 'ADMIN'), getStaffLeaders);

// ── 2. Owner thẩm định yêu cầu thiết kế (Order Requests) ─────
router.get('/owner/requests', requireRole('OWNER'), getOwnerRequests);
router.get('/owner/requests/:id', requireRole('OWNER'), getOwnerRequestDetail);
router.post('/owner/requests/:id/review', requireRole('OWNER'), reviewRequest);

// ── 3. Leader (Tổ trưởng xưởng) xử lý sản xuất ──────────────
router.get('/leader/orders', requireRole('LEADERSTAFF', 'OWNER'), getLeaderOrders);
router.post('/leader/orders/:id/accept', requireRole('LEADERSTAFF', 'OWNER'), leaderAccept);
router.post('/leader/orders/:id/progress', requireRole('LEADERSTAFF', 'OWNER'), leaderProgress);
router.post('/leader/orders/:id/submit-inspection', requireRole('LEADERSTAFF', 'OWNER'), leaderSubmit);

// ── 4. Upload hình ảnh nghiệm thu sản phẩm ─────────────────
router.post('/upload-inspection-image', upload.array('images', 5), (req, res) => {
  try {
    const urls = (req.files || []).map((f) => f.path || f.url || f.secure_url).filter(Boolean);
    return res.status(200).json({
      message: 'Tải lên hình ảnh nghiệm thu thành công',
      urls,
      images: urls,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi tải ảnh nghiệm thu', error: err.message });
  }
});

// ── 5. Owner quản lý phân công & nghiệm thu đơn hàng ────────
router.post('/orders/:id/assign-leader', requireRole('OWNER', 'SALES', 'ADMIN'), assignLeader);
router.post('/orders/:id/inspect', requireRole('OWNER', 'SALES', 'ADMIN'), inspectOrder);

// ── 6. Quản lý danh sách đơn hàng ────────────────────────────
// GET /api/order-management
router.get('/', requireRole('OWNER', 'SALES'), getOrders);

// POST /api/order-management/:id/cancel
router.post('/:id/cancel', requireRole('OWNER', 'SALES'), cancelOrder);

// PATCH /api/order-management/:id/status
router.patch('/:id/status', requireRole('OWNER'), updateOrderStatus);

// GET /api/order-management/:id
router.get('/:id', requireRole('OWNER', 'SALES'), getOrderDetail);

module.exports = router;

