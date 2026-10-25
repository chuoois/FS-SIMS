const express = require('express');
const { staffLogin } = require('../controllers/staffAuthController');

const router = express.Router();

// POST /api/staff-auth/login
// Cổng đăng nhập riêng cho nhân sự (OWNER, SALES, LEADERSTAFF)
router.post('/login', staffLogin);

// Refresh token, Logout & Forgot password dùng chung /api/auth/*

module.exports = router;
