const {
  findUserAccountById,
  updateUserProfile,
} = require('../models/userAccount.model');
const { deleteImage, getPublicIdFromUrl } = require('../services/cloudinaryService');

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

async function getProfile(req, res) {
  try {
    const userId = Number(req.user?.sub);
    if (!userId) {
      return res.status(401).json({ message: 'Yêu cầu xác thực. Vui lòng đăng nhập.' });
    }

    const account = await findUserAccountById(userId);
    if (!account) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    return res.status(200).json({
      message: 'Lấy thông tin hồ sơ thành công',
      user: mapUserProfile(account),
    });
  } catch (error) {
    console.error('[userController.getProfile]', error);
    return res.status(500).json({ message: 'Không thể lấy thông tin hồ sơ' });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = Number(req.user?.sub);
    if (!userId) {
      return res.status(401).json({ message: 'Yêu cầu xác thực. Vui lòng đăng nhập.' });
    }

    const existing = await findUserAccountById(userId);
    if (!existing) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    if (!fullName) {
      return res.status(400).json({ message: 'Họ và tên là bắt buộc' });
    }

    const phone = req.body?.phone !== undefined && req.body?.phone !== null && req.body?.phone !== ''
      ? String(req.body.phone).trim()
      : null;
    if (phone && !/^(0|\+84)\d{9,10}$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
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
      return res.status(400).json({ message: 'Cập nhật hồ sơ không thành công' });
    }

    if (avatarUrl !== undefined && existingAvatarUrl && avatarUrl !== existingAvatarUrl) {
      try {
        await deleteImage(getPublicIdFromUrl(existingAvatarUrl));
      } catch (error) {
        console.warn('[userController.updateProfile] Không thể xóa ảnh đại diện cũ:', error.message);
      }
    }

    return res.status(200).json({
      message: 'Cập nhật hồ sơ thành công',
      user: mapUserProfile({
        ...existing,
        full_name: fullName,
        phone_number: phone,
        dob: birthday,
        gender,
        address,
        avatar_url: avatarUrl !== undefined ? avatarUrl : existingAvatarUrl,
      }),
    });
  } catch (error) {
    console.error('[userController.updateProfile]', error);
    return res.status(500).json({ message: 'Không thể cập nhật hồ sơ' });
  }
}

module.exports = { getProfile, updateProfile };
