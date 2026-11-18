// =========================================================
// productionOrderRoutes.js
// Định tuyến API Quản lý Lệnh Gia Công (Manage Production Orders)
// Phân quyền: Yêu cầu đăng nhập và chỉ role OWNER được phép thao tác
// =========================================================

const express = require('express');
const {
  getProductionOrders,
  getEligibleOrders,
  getStaffLeadersList,
  createProductionOrderHandler,
  assignLeader,
  cancelProductionOrderHandler,
  uploadDesignImages,
  getProductionOrderDetail,
  ownerInspectProductionOrder,
} = require('../controllers/productionOrderController');

const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Bắt buộc xác thực và kiểm tra vai trò OWNER
router.use(authenticate, requireRole('OWNER'));

// 1. GET /api/production-orders/eligible-orders
//    Danh sách đơn hàng CONFIRMED + CUSTOM chưa có lệnh gia công (cho dropdown tạo mới)
router.get('/eligible-orders', getEligibleOrders);

// 2. GET /api/production-orders/staff-leaders
//    Danh sách trưởng nhóm (LEADERSTAFF) đang ACTIVE (cho dropdown gán trưởng nhóm)
router.get('/staff-leaders', getStaffLeadersList);

// 3. GET /api/production-orders
//    Danh sách lệnh gia công (tìm kiếm, lọc trạng thái, phân trang)
router.get('/', getProductionOrders);

// 4. POST /api/production-orders
//    Tạo mới lệnh gia công từ đơn hàng khách hàng
router.post('/', createProductionOrderHandler);

// 5. PATCH /api/production-orders/:id/assign-leader
//    Gán trưởng nhóm sản xuất cho lệnh gia công
router.patch('/:id/assign-leader', assignLeader);

// 6. POST /api/production-orders/:id/cancel
//    Hủy lệnh gia công (DRAFT hoặc IN_PROGRESS)
router.post('/:id/cancel', cancelProductionOrderHandler);

// 7. GET /api/production-orders/:id
//    Lấy chi tiết lệnh gia công kèm ảnh thiết kế & ảnh nghiệm thu
router.get('/:id', getProductionOrderDetail);

// 8. POST /api/production-orders/:id/upload-design-images
//    Chủ xưởng upload ảnh thiết kế / bản vẽ mẫu cho lệnh gia công
router.post('/:id/upload-design-images', upload.array('images', 10), uploadDesignImages);

// 9. POST /api/production-orders/:id/inspect
//    Chủ xưởng nghiệm thu (Duyệt / Từ chối) lệnh gia công
router.post('/:id/inspect', ownerInspectProductionOrder);

module.exports = router;
