// =========================================================
// staffAccountController.js
// Quản lý tài khoản nhân viên dành riêng cho Chủ xưởng (Owner)
// Bao gồm: Xem danh sách, tạo mới, xem chi tiết, sửa thông tin / role,
// CHỈ áp dụng cho nhân sự cấp dưới (SALES, LEADERSTAFF), KHÔNG hiển thị/quản lý OWNER hay Customer.
// =========================================================

const bcrypt = require('bcryptjs');
const {
  createUserAccount,
  findUserAccountByEmail,
  updateUserAccountStatus,
  getStaffAccounts,
  getStaffAccountById,
  updateStaffAccount: updateStaffAccountModel,
  deleteStaffAccount: deleteStaffAccountModel,
} = require('../models/userAccount.model');
const { findUserRoleByCode, findUserRoleById, getStaffRoles } = require('../models/userRole.model');

// Chỉ quản lý tài khoản nhân viên cấp dưới (Kinh doanh, Tổ trưởng xưởng)
// Tài khoản Chủ xưởng (OWNER) và Khách hàng (CUSTOMER) KHÔNG nằm trong danh sách này
const MANAGED_STAFF_ROLE_CODES = ['SALES', 'LEADERSTAFF'];

let cachedStaffRoleIds = null;
async function getStaffRoleIds() {
  if (cachedStaffRoleIds) return cachedStaffRoleIds;

  const ids = [];
  for (const code of MANAGED_STAFF_ROLE_CODES) {
    const role = await findUserRoleByCode(code);
    if (role) ids.push(Number(role.role_id));
  }

  if (ids.length > 0) cachedStaffRoleIds = ids;
  return ids;
}

// ── GET /api/staff-accounts ───────────────────────────────
async function listStaffAccounts(req, res) {
  try {
    const staffRoleIds = await getStaffRoleIds();
    const accounts = await getStaffAccounts(staffRoleIds);

    return res.status(200).json({
      message: 'Lấy danh sách tài khoản nhân viên thành công',
      data: accounts,
    });
  } catch (error) {
    console.error('[staffAccountController.listStaffAccounts]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách nhân viên' });
  }
}

// ── GET /api/staff-accounts/roles ─────────────────────────
async function listStaffRoles(req, res) {
  try {
    const roles = await getStaffRoles();
    return res.status(200).json({
      message: 'Lấy danh sách vai trò nhân viên thành công',
      roles,
    });
  } catch (error) {
    console.error('[staffAccountController.listStaffRoles]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách vai trò' });
  }
}

// ── GET /api/staff-accounts/:id ───────────────────────────
async function getStaffAccountDetail(req, res) {
  const { id } = req.params;
  const userAccountId = Number(id);

  if (!userAccountId || isNaN(userAccountId)) {
    return res.status(400).json({ message: 'ID tài khoản không hợp lệ' });
  }

  try {
    const staffRoleIds = await getStaffRoleIds();
    const account = await getStaffAccountById(userAccountId, staffRoleIds);

    if (!account) {
      return res.status(404).json({
        message: 'Tài khoản không tồn tại hoặc không phải là nhân sự nội bộ',
      });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết tài khoản thành công',
      account,
    });
  } catch (error) {
    console.error('[staffAccountController.getStaffAccountDetail]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết tài khoản' });
  }
}

// ── POST /api/staff-accounts ──────────────────────────────
async function createStaffAccount(req, res) {
  const {
    email,
    password,
    fullName,
    phoneNumber,
    roleId,
    dob,
    gender,
    address,
    note,
  } = req.body;

  // Validate các trường bắt buộc
  if (!email || !email.trim()) {
    return res.status(400).json({ message: 'Email là bắt buộc' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ message: 'Email không đúng định dạng' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ message: 'Họ và tên là bắt buộc' });
  }

  if (!phoneNumber || !phoneNumber.trim()) {
    return res.status(400).json({ message: 'Số điện thoại là bắt buộc' });
  }

  if (!roleId) {
    return res.status(400).json({ message: 'Vui lòng chọn vai trò cho nhân viên' });
  }

  try {
    // Kiểm tra roleId có hợp lệ và thuộc nhóm nhân sự không
    const staffRoleIds = await getStaffRoleIds();
    if (!staffRoleIds.includes(Number(roleId))) {
      return res.status(400).json({
        message: 'Vai trò được chọn không hợp lệ cho nhân sự nội bộ',
      });
    }

    // Kiểm tra trùng email
    const existing = await findUserAccountByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ message: 'Email đã được sử dụng trong hệ thống' });
    }

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);
    const creatorId = req.user?.sub ? `OWNER:${req.user.sub}` : 'OWNER';

    const newAccount = await createUserAccount({
      roleId: Number(roleId),
      email: cleanEmail,
      passwordHash,
      status: 'ACTIVE',
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      dob: dob || null,
      gender: gender || null,
      address: address ? address.trim() : null,
      note: note ? note.trim() : null,
      createBy: creatorId,
    });

    const roleInfo = await findUserRoleById(roleId);

    return res.status(201).json({
      message: 'Tạo tài khoản nhân viên thành công',
      account: {
        ...newAccount,
        role: roleInfo,
      },
    });
  } catch (error) {
    console.error('[staffAccountController.createStaffAccount]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi tạo tài khoản nhân viên' });
  }
}

// ── PUT /api/staff-accounts/:id ───────────────────────────
async function updateStaffAccount(req, res) {
  const { id } = req.params;
  const userAccountId = Number(id);

  if (!userAccountId || isNaN(userAccountId)) {
    return res.status(400).json({ message: 'ID tài khoản không hợp lệ' });
  }

  const {
    email,
    fullName,
    phoneNumber,
    roleId,
    dob,
    gender,
    address,
    note,
    password,
  } = req.body;

  try {
    const staffRoleIds = await getStaffRoleIds();
    const targetAccount = await getStaffAccountById(userAccountId, staffRoleIds);

    if (!targetAccount) {
      return res.status(404).json({
        message: 'Tài khoản không tồn tại hoặc không phải là nhân sự nội bộ',
      });
    }

    // Nếu sửa email: kiểm tra định dạng và chống trùng lặp
    let cleanEmail = undefined;
    if (email !== undefined) {
      if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Email không được để trống' });
      }
      cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ message: 'Email không đúng định dạng' });
      }

      if (cleanEmail !== targetAccount.email.toLowerCase()) {
        const existing = await findUserAccountByEmail(cleanEmail);
        if (existing && Number(existing.user_account_id) !== userAccountId) {
          return res.status(409).json({ message: 'Email đã được sử dụng bởi một tài khoản khác' });
        }
      }
    }

    // Nếu sửa roleId: kiểm tra role mới có phải là role nhân viên cấp dưới hợp lệ không
    if (roleId !== undefined) {
      if (!staffRoleIds.includes(Number(roleId))) {
        return res.status(400).json({
          message: 'Vai trò được chọn không hợp lệ cho nhân sự nội bộ',
        });
      }
    }

    let passwordHash = null;
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const modifierId = req.user?.sub ? `OWNER:${req.user.sub}` : 'OWNER';

    await updateStaffAccountModel(
      userAccountId,
      {
        email: cleanEmail,
        roleId: roleId !== undefined ? Number(roleId) : undefined,
        fullName: fullName ? fullName.trim() : undefined,
        phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
        dob: dob !== undefined ? dob : undefined,
        gender: gender !== undefined ? gender : undefined,
        address: address !== undefined ? address : undefined,
        note: note !== undefined ? note : undefined,
        passwordHash,
      },
      modifierId,
    );

    const updated = await getStaffAccountById(userAccountId, staffRoleIds);

    return res.status(200).json({
      message: 'Cập nhật thông tin nhân viên thành công',
      account: updated,
    });
  } catch (error) {
    console.error('[staffAccountController.updateStaffAccount]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật tài khoản' });
  }
}

// ── PATCH /api/staff-accounts/:id/status ──────────────────
async function changeStaffAccountStatus(req, res) {
  const { id } = req.params;
  const userAccountId = Number(id);

  if (!userAccountId || isNaN(userAccountId)) {
    return res.status(400).json({ message: 'ID tài khoản không hợp lệ' });
  }

  const { status } = req.body;
  if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ (phải là ACTIVE hoặc INACTIVE)' });
  }

  try {
    const staffRoleIds = await getStaffRoleIds();
    const targetAccount = await getStaffAccountById(userAccountId, staffRoleIds);

    if (!targetAccount) {
      return res.status(404).json({
        message: 'Tài khoản không tồn tại hoặc không phải là nhân sự nội bộ',
      });
    }

    const modifierId = req.user?.sub ? `OWNER:${req.user.sub}` : 'OWNER';
    await updateUserAccountStatus(userAccountId, status, modifierId);

    return res.status(200).json({
      message: status === 'ACTIVE' ? 'Đã kích hoạt tài khoản thành công' : 'Đã khóa tài khoản thành công',
      status,
    });
  } catch (error) {
    console.error('[staffAccountController.changeStaffAccountStatus]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật trạng thái tài khoản' });
  }
}

// ── DELETE /api/staff-accounts/:id ────────────────────────
async function removeStaffAccount(req, res) {
  const { id } = req.params;
  const userAccountId = Number(id);

  if (!userAccountId || isNaN(userAccountId)) {
    return res.status(400).json({ message: 'ID tài khoản không hợp lệ' });
  }

  try {
    const staffRoleIds = await getStaffRoleIds();
    const targetAccount = await getStaffAccountById(userAccountId, staffRoleIds);

    if (!targetAccount) {
      return res.status(404).json({
        message: 'Tài khoản không tồn tại hoặc không phải là nhân sự nội bộ',
      });
    }

    await deleteStaffAccountModel(userAccountId);

    return res.status(200).json({
      message: 'Đã xóa tài khoản nhân viên thành công',
    });
  } catch (error) {
    console.error('[staffAccountController.removeStaffAccount]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi xóa tài khoản' });
  }
}

module.exports = {
  listStaffAccounts,
  listStaffRoles,
  getStaffAccountDetail,
  createStaffAccount,
  updateStaffAccount,
  changeStaffAccountStatus,
  removeStaffAccount,
};
