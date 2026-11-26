// =========================================================
// leaderStaffRoutes.js
// Định tuyến API riêng biệt cho Quản lý Sản xuất & Tiếp nhận đơn hàng (Tổ trưởng xưởng - LEADERSTAFF)
// =========================================================

const express = require('express');
const {
  getLeaderOrders,
  getLeaderOrderDetail,
  leaderAccept,
  leaderProgress,
  leaderSubmit,
  uploadInspectionImage,
} = require('../controllers/leaderStaffController');

const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Yêu cầu đăng nhập và phân quyền cho Tổ trưởng hoặc Owner
router.use(authenticate);
router.use(requireRole('LEADERSTAFF', 'OWNER', 'ADMIN'));

// 1. Lấy danh sách đơn hàng được phân công cho Tổ trưởng
router.get('/orders', getLeaderOrders);

// 2. Lấy chi tiết bản vẽ kỹ thuật, thông số (D x R x C cm), chất liệu, màu sắc
router.get('/orders/:id', getLeaderOrderDetail);

// 3. Tiếp nhận đơn hàng sản xuất
router.post('/orders/:id/accept', leaderAccept);

// 4. Cập nhật tiến độ sản xuất (đánh dấu hoàn thành / chưa hoàn thành)
router.post('/orders/:id/progress', leaderProgress);

// 5 & 6. Gửi yêu cầu nghiệm thu lên Chủ xưởng (hoặc nộp lại sau khi khắc phục)
router.post('/orders/:id/submit-inspection', leaderSubmit);

// 7. Upload hình ảnh thành phẩm nghiệm thu
router.post('/upload-inspection-image', upload.array('images', 5), uploadInspectionImage);

module.exports = router;

