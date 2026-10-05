const bcrypt = require('bcryptjs');
const {
  createUserAccount,
  findUserAccountByEmail,
} = require('../models/userAccount.model');
const { findUserRoleByCode } = require('../models/userRole.model');
const { validateRegistrationInput } = require('../utils/validators');

function isDuplicateEmailError(error) {
  return error.name === 'SequelizeUniqueConstraintError' || error.original?.code === 'ER_DUP_ENTRY';
}

async function registerUser(req, res) {
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

    console.error('[userController.registerUser]', error);
    return res.status(500).json({ message: 'Không thể tạo tài khoản' });
  }
}

module.exports = { registerUser };