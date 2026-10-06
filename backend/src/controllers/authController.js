// =========================================================
// authController.js
// Xử lý Register / Login / Logout / Refresh Token
// =========================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');

const {
  createUserAccount,
  findUserAccountByEmail,
} = require('../models/userAccount.model');
const { findUserRoleByCode } = require('../models/userRole.model');
const {
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
  deleteTokensByAccountId,
} = require('../models/refreshToken.model');
const {
  validateLoginInput,
  validateRegistrationInput,
} = require('../utils/validators');

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

function isDuplicateEmailError(error) {
  return error.name === 'SequelizeUniqueConstraintError' || error.original?.code === 'ER_DUP_ENTRY';
}

// =========================================================
// POST /api/auth/register
// =========================================================
async function register(req, res) {
  // Frontend gửi { fullName, email, phone, password }
  const { fullName, email, phone: phoneNumber, password } = req.body;

  const validationError = validateRegistrationInput({ email, password, fullName, phoneNumber });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedFullName = fullName.trim();

  try {
    const existingAccount = await findUserAccountByEmail(normalizedEmail);
    if (existingAccount) {
      return res.status(409).json({ message: 'Email đã được sử dụng' });
    }

    const customerRole = await findUserRoleByCode('CUSTOMER');
    if (!customerRole) {
      return res.status(500).json({ message: 'Chưa cấu hình vai trò CUSTOMER' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserAccount({
      roleId: customerRole.role_id,
      email: normalizedEmail,
      passwordHash,
      fullName: normalizedFullName,
      phoneNumber: phoneNumber ? phoneNumber.trim() : null,
      createBy: 'SYSTEM',
    });

    return res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      user,
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({ message: 'Email đã được sử dụng' });
    }

    console.error('[authController.register]', error);
    return res.status(500).json({ message: 'Không thể tạo tài khoản' });
  }
}

// =========================================================
// POST /api/auth/login
// =========================================================
async function login(req, res) {
  const validationError = validateLoginInput(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  try {
    const account = await findUserAccountByEmail(email);
    if (!account) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    if (account.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
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

    // Tạo refresh token ngẫu nhiên bằng crypto
    const rawRefreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    await createRefreshToken({
      userAccountId: account.user_account_id,
      token: rawRefreshToken,
      expiresAt,
      createBy: `USER:${account.user_account_id}`,
    });

    // Gửi refresh token qua httpOnly cookie (bảo mật hơn)
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_MS,
    });

    return res.status(200).json({
      message: 'Đăng nhập thành công',
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
    console.error('[authController.login]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại' });
  }
}

// =========================================================
// POST /api/auth/refresh
// =========================================================
async function refreshToken(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy refresh token' });
  }

  try {
    const stored = await findValidRefreshToken(token);
    if (!stored) {
      return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }

    const account = await findUserAccountByEmail(stored.email);
    if (!account) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại' });
    }

    const tokenPayload = {
      sub: stored.user_account_id,
      role: account.role_id,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    return res.status(200).json({
      message: 'Làm mới token thành công',
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('[authController.refreshToken]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// =========================================================
// POST /api/auth/logout
// =========================================================
async function logout(req, res) {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      await deleteRefreshToken(token);
    } catch (error) {
      console.error('[authController.logout] delete token error:', error.message);
    }
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res.status(200).json({ message: 'Đăng xuất thành công' });
}

module.exports = { register, login, refreshToken, logout };