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
  findUserAccountById,
  updateUserPassword,
} = require('../models/userAccount.model');
const { findUserRoleByCode } = require('../models/userRole.model');
const {
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
} = require('../models/refreshToken.model');
const {
  validateLoginInput,
  validateRegistrationInput,
} = require('../utils/validators');
const { sendNewPasswordEmail } = require('../services/mailService');
const { ApiError } = require('../utils/ApiError');
const { buildSuccessResponse } = require('../utils/successResponse');

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

function isDuplicateEmailError(error) {
  return error?.name === 'SequelizeUniqueConstraintError'
    || error?.original?.code === 'ER_DUP_ENTRY'
    || error?.parent?.code === 'ER_DUP_ENTRY';
}

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

const STAFF_ROLE_CODES = ['OWNER', 'SALES', 'LEADERSTAFF'];

let cachedStaffRoleIds = null;
async function getStaffRoleIds() {
  if (cachedStaffRoleIds) return cachedStaffRoleIds;

  const ids = [];
  for (const code of STAFF_ROLE_CODES) {
    const role = await findUserRoleByCode(code);
    if (role) ids.push(role.role_id);
  }

  if (ids.length > 0) cachedStaffRoleIds = ids;
  return ids;
}

async function register(req, res, next) {
  const { fullName, email, phone: phoneNumber, password } = req.body || {};

  try {
    const validationError = validateRegistrationInput({ email, password, fullName, phoneNumber });
    if (validationError) {
      throw new ApiError(400, validationError);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();
    const existingAccount = await findUserAccountByEmail(normalizedEmail);
    if (existingAccount) {
      throw new ApiError(409, 'Email đã được sử dụng');
    }

    const customerRole = await findUserRoleByCode('CUSTOMER');
    if (!customerRole) {
      throw new ApiError(500, 'Chưa cấu hình vai trò CUSTOMER');
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

    return res.status(201).json(buildSuccessResponse({
      status: 201,
      message: 'Đăng ký tài khoản thành công',
      data: {
        email: user?.email || normalizedEmail,
        fullName: user?.full_name || normalizedFullName,
      },
      req,
    }));
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return next(new ApiError(409, 'Email đã được sử dụng'));
    }

    if (error instanceof ApiError) {
      return next(error);
    }

    const apiError = new ApiError(500, 'Không thể tạo tài khoản');
    apiError.cause = error;
    return next(apiError);
  }
}

async function login(req, res, next) {
  try {
    const validationError = validateLoginInput(req.body);
    if (validationError) {
      throw new ApiError(400, validationError);
    }

    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;
    const account = await findUserAccountByEmail(email);
    if (!account) {
      throw new ApiError(404, 'Tài khoản không tồn tại');
    }

    if (account.status !== 'ACTIVE') {
      throw new ApiError(403, 'Tài khoản đã bị vô hiệu hóa');
    }

    const staffRoleIds = await getStaffRoleIds();
    if (staffRoleIds.includes(Number(account.role_id))) {
      throw new ApiError(403, 'Tài khoản này không được cấp quyền truy cập. Vui lòng liên hệ quản trị viên');
    }

    const isPasswordValid = await bcrypt.compare(password, account.password_hash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Email hoặc mật khẩu không đúng');
    }

    const tokenPayload = {
      sub: account.user_account_id,
      email: account.email,
      role: account.role_id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const rawRefreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    await createRefreshToken({
      userAccountId: account.user_account_id,
      token: rawRefreshToken,
      expiresAt,
      createBy: `USER:${account.user_account_id}`,
    });

    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_MS,
    });

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Đăng nhập thành công',
      data: {
        accessToken,
        user: {
          userAccountId: account.user_account_id,
          email: account.email,
          fullName: account.full_name,
          roleId: account.role_id,
          avatarUrl: account.avatar_url || null,
        },
      },
      req,
    }));
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(500, 'Lỗi máy chủ, vui lòng thử lại'));
  }
}

async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new ApiError(401, 'Không tìm thấy refresh token');
    }

    const stored = await findValidRefreshToken(token);
    if (!stored) {
      throw new ApiError(401, 'Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const account = await findUserAccountById(stored.user_account_id);
    if (!account) {
      throw new ApiError(401, 'Tài khoản không tồn tại');
    }

    const tokenPayload = {
      sub: account.user_account_id,
      email: account.email,
      role: account.role_id,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Làm mới token thành công',
      data: { accessToken: newAccessToken },
      req,
    }));
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(500, 'Lỗi máy chủ'));
  }
}

async function logout(req, res, next) {
  try {
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

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Đăng xuất thành công',
      data: null,
      req,
    }));
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(500, 'Lỗi máy chủ'));
  }
}

async function forgotPassword(req, res, next) {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    if (!email) {
      throw new ApiError(400, 'Vui lòng cung cấp địa chỉ email.');
    }

    const genericMessage = 'Nếu email đã được đăng ký, mật khẩu mới sẽ được gửi đến hộp thư của bạn.';
    const account = await findUserAccountByEmail(email);

    if (!account || account.status !== 'ACTIVE') {
      return res.status(200).json(buildSuccessResponse({
        status: 200,
        message: genericMessage,
        data: null,
        req,
      }));
    }

    const newPassword = randomBytes(8)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 10)
      .padEnd(10, 'A');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(account.user_account_id, passwordHash);

    sendNewPasswordEmail(
      account.email,
      account.full_name || 'bạn',
      newPassword,
    ).catch((err) => console.error('[forgotPassword] sendMail error:', err.message));

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: genericMessage,
      data: null,
      req,
    }));
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(500, 'Lỗi máy chủ, vui lòng thử lại.'));
  }
}

module.exports = { register, login, refreshToken, logout, forgotPassword };
