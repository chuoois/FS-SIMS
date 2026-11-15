const {
  findUserAccountById,
  findUserAccountByEmail,
  updateUserProfile,
  updateUserPassword,
} = require('../models/userAccount.model');
const bcrypt = require('bcryptjs');
const { deleteImage, getPublicIdFromUrl } = require('../services/cloudinaryService');
const { ApiError } = require('../utils/ApiError');
const { buildSuccessResponse } = require('../utils/successResponse');

function mapUserProfile(account = {}) {
  return {
    userAccountId: account.user_account_id ?? account.userAccountId ?? null,
    roleId: account.role_id ?? account.roleId ?? null,
    email: account.email ?? '',
    status: account.status ?? 'ACTIVE',
    fullName: account.full_name ?? account.fullName ?? '',
    phoneNumber: account.phone_number ?? account.phoneNumber ?? null,
    dateOfBirth: account.dob ?? account.dateOfBirth ?? null,
    gender: account.gender ?? null,
    address: account.address ?? null,
    avatarUrl: account.avatar_url ?? account.avatarUrl ?? null,
  };
}

function getErrorForNext(error, detail) {
  if (error instanceof ApiError) return error;

  const apiError = new ApiError(500, detail);
  apiError.cause = error;
  return apiError;
}

function getAuthenticatedUserId(req) {
  const userId = Number(req.user?.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ApiError(401, 'Yêu cầu xác thực. Vui lòng đăng nhập.');
  }
  return userId;
}

async function getProfile(req, res, next) {
  try {
    const userId = getAuthenticatedUserId(req);
    const account = await findUserAccountById(userId);
    if (!account) {
      throw new ApiError(404, 'Người dùng không tồn tại');
    }

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy thông tin hồ sơ thành công',
      data: { user: mapUserProfile(account) },
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Không thể lấy thông tin hồ sơ'));
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = getAuthenticatedUserId(req);
    const existing = await findUserAccountById(userId);
    if (!existing) {
      throw new ApiError(404, 'Người dùng không tồn tại');
    }

    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    if (!fullName) {
      throw new ApiError(400, 'Họ và tên là bắt buộc');
    }

    const phone = req.body?.phone !== undefined && req.body?.phone !== null && req.body?.phone !== ''
      ? String(req.body.phone).trim()
      : null;
    if (phone && !/^(0|\+84)\d{9,10}$/.test(phone.replace(/\s/g, ''))) {
      throw new ApiError(400, 'Số điện thoại không hợp lệ');
    }

    const birthday = req.body?.birthday || null;
    const gender = req.body?.gender || null;
    const address = req.body?.address !== undefined && req.body?.address !== null
      ? String(req.body.address).trim()
      : null;

    const updatePayload = {
      fullName,
      phoneNumber: phone,
      dob: birthday,
      gender,
      address,
      note: existing.note ?? null,
    };
    const existingAvatarUrl = existing.avatar_url ?? existing.avatarUrl ?? null;
    const avatarUrl = req.file?.path ?? (req.body?.removeAvatar === 'true' ? null : undefined);
    if (avatarUrl !== undefined) {
      updatePayload.avatarUrl = avatarUrl;
    }

    const updated = await updateUserProfile(userId, updatePayload, `USER:${userId}`);
    if (!updated) {
      throw new ApiError(400, 'Cập nhật hồ sơ không thành công');
    }

    if (avatarUrl !== undefined && existingAvatarUrl && avatarUrl !== existingAvatarUrl) {
      try {
        await deleteImage(getPublicIdFromUrl(existingAvatarUrl));
      } catch (error) {
        console.warn('[userController.updateProfile] Không thể xóa ảnh đại diện cũ:', error.message);
      }
    }

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Cập nhật hồ sơ thành công',
      data: {
        user: mapUserProfile({
          ...existing,
          full_name: fullName,
          phone_number: phone,
          dob: birthday,
          gender,
          address,
          avatar_url: avatarUrl !== undefined ? avatarUrl : existingAvatarUrl,
        }),
      },
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Không thể cập nhật hồ sơ'));
  }
}

async function changePassword(req, res, next) {
  try {
    const userId = getAuthenticatedUserId(req);
    const userEmail = req.user?.email;
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof currentPassword !== 'string' || !currentPassword) {
      throw new ApiError(400, 'Vui lòng nhập mật khẩu hiện tại.');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new ApiError(400, 'Mật khẩu mới phải có ít nhất 8 ký tự.');
    }
    if (currentPassword === newPassword) {
      throw new ApiError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại.');
    }

    const account = await findUserAccountByEmail(userEmail);
    if (!account) {
      throw new ApiError(404, 'Người dùng không tồn tại.');
    }

    const isMatch = await bcrypt.compare(currentPassword, account.password_hash);
    if (!isMatch) {
      throw new ApiError(400, 'Mật khẩu hiện tại không đúng.');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const updated = await updateUserPassword(userId, newHash);
    if (!updated) {
      throw new ApiError(404, 'Người dùng không tồn tại.');
    }

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Đổi mật khẩu thành công.',
      data: null,
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Không thể đổi mật khẩu.'));
  }
}

module.exports = { getProfile, updateProfile, changePassword };
