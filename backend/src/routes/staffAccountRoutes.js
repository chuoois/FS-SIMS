const express = require('express');
const {
  listStaffAccounts,
  listStaffRoles,
  getStaffAccountDetail,
  createStaffAccount,
  updateStaffAccount,
  changeStaffAccountStatus,
  removeStaffAccount,
} = require('../controllers/staffAccountController');
const { authenticate, requireOwner } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tất cả các route quản lý tài khoản nhân viên đều yêu cầu đăng nhập và có vai trò OWNER
router.use(authenticate, requireOwner);

// GET /api/staff-accounts - Lấy danh sách tài khoản nhân viên
router.get('/', listStaffAccounts);

// GET /api/staff-accounts/roles - Lấy danh sách các role nhân sự
router.get('/roles', listStaffRoles);

// GET /api/staff-accounts/:id - Lấy chi tiết 1 tài khoản nhân viên
router.get('/:id', getStaffAccountDetail);

// POST /api/staff-accounts - Tạo tài khoản nhân viên mới
router.post('/', createStaffAccount);

// PUT /api/staff-accounts/:id - Cập nhật thông tin nhân viên
router.put('/:id', updateStaffAccount);

// PATCH /api/staff-accounts/:id/status - Khóa / Mở khóa tài khoản
router.patch('/:id/status', changeStaffAccountStatus);

// DELETE /api/staff-accounts/:id - Xóa tài khoản nhân viên
router.delete('/:id', removeStaffAccount);

module.exports = router;
