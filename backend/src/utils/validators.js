function validateRegistrationInput({ email, password, fullName, phoneNumber } = {}) {
  if (typeof email !== 'string' || !email.trim()) {
    return 'Email là bắt buộc';
  }

  const normalizedEmail = email.trim();
  if (normalizedEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Email không hợp lệ';
  }

  if (typeof password !== 'string' || password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự';
  }

  if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 150) {
    return 'Họ và tên là bắt buộc và không được vượt quá 150 ký tự';
  }

  if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== '') {
    if (typeof phoneNumber !== 'string' || !/^[0-9+\-\s()]{7,20}$/.test(phoneNumber.trim())) {
      return 'Số điện thoại không hợp lệ';
    }
  }

  return null;
}

function validateLoginInput({ email, password } = {}) {
  if (typeof email !== 'string' || !email.trim()) {
    return 'Email là bắt buộc';
  }

  const normalizedEmail = email.trim();
  if (normalizedEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Email không hợp lệ';
  }

  if (typeof password !== 'string' || !password) {
    return 'Mật khẩu là bắt buộc';
  }

  return null;
}

module.exports = { validateRegistrationInput, validateLoginInput };