// =========================================================
// staffAuthController.js
// Xử lý Login dành riêng cho nhân sự nội bộ:
// OWNER, SALES, LEADERSTAFF
//
// Khác với authController.js (dùng cho Customer):
//   - Kiểm tra role_code ngay tại backend (trả 403 nếu không phải nhân sự)
//   - Endpoint login riêng: /api/staff-auth/login
//   - Refresh token, Logout & Forgot password dùng chung /api/auth/*
// =========================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');

const { findUserAccountByEmail } = require('../models/userAccount.model');
const { findUserRoleByCode } = require('../models/userRole.model');
const { createRefreshToken } = require('../models/refreshToken.model');
const { validateLoginInput } = require('../utils/validators');

const ACCESS_TOKEN_EXPIRES = '30s';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

// Role code được phép đăng nhập qua cổng nhân sự
const ALLOWED_STAFF_ROLE_CODES = ['OWNER', 'SALES', 'LEADERSTAFF'];

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

/**
 * Lấy danh sách role_id hợp lệ của nhân sự từ bảng user_role.
 * Kết quả được cache trong biến module-level để không query lại mỗi request.
 */
let cachedStaffRoleIds = null;

async function getStaffRoleIds() {
  if (cachedStaffRoleIds) return cachedStaffRoleIds;

  const ids = [];
  for (const code of ALLOWED_STAFF_ROLE_CODES) {
    const role = await findUserRoleByCode(code);
    if (role) ids.push(role.role_id);
  }

  if (ids.length > 0) cachedStaffRoleIds = ids;
  return ids;
}

// =========================================================
// POST /api/staff-auth/login
// =========================================================
async function staffLogin(req, res) {
  const validationError = validateLoginInput(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  try {
    const account = await findUserAccountByEmail(email);
    if (!account) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại' });
    }

    if (account.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
    }

    // ── Kiểm tra role: chỉ cho phép nhân sự ──
    const staffRoleIds = await getStaffRoleIds();
    if (!staffRoleIds.includes(Number(account.role_id))) {
      return res.status(403).json({
        message:
         'Tài khoản này không được cấp quyền truy cập.Vui lòng liên hệ quản trị viên',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, account.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const tokenPayload = {
      sub: account.user_account_id,
      email: account.email,
      role: account.role_id,
    };

    const accessToken = generateAccessToken(tokenPayload);

    // Tạo refresh token ngẫu nhiên
    const rawRefreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    await createRefreshToken({
      userAccountId: account.user_account_id,
      token: rawRefreshToken,
      expiresAt,
      createBy: `STAFF:${account.user_account_id}`,
    });

    // Gửi refresh token qua httpOnly cookie
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_MS,
    });

    return res.status(200).json({
      message: 'Đăng nhập nhân viên thành công',
      accessToken,
      user: {
        userAccountId: account.user_account_id,
        email: account.email,
        fullName: account.full_name,
        roleId: account.role_id,
        avatarUrl: account.avatar_url || null,
      },
    });
  } catch (error) {
    console.error('[staffAuthController.staffLogin]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại' });
  }
}

module.exports = { staffLogin };
