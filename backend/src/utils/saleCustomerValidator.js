// =========================================================
// saleCustomerValidator.js
// Hàm thuần kiểm tra hợp lệ dữ liệu khách hàng (Role Sale)
// =========================================================

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE'];
const ALLOWED_GENDERS = ['MALE', 'FEMALE', 'OTHER'];

function validateFullName(fullName) {
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return 'Họ và tên khách hàng là bắt buộc.';
  }
  if (fullName.trim().length > 150) {
    return 'Họ và tên khách hàng không được vượt quá 150 ký tự.';
  }
  return null;
}

function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
    return 'Số điện thoại khách hàng là bắt buộc.';
  }
  if (!PHONE_REGEX.test(phoneNumber.trim())) {
    return 'Số điện thoại không hợp lệ (từ 7 đến 20 ký tự số).';
  }
  return null;
}

function validateOptionalEmail(email) {
  if (email === undefined || email === null) return null;
  if (typeof email !== 'string') {
    return 'Địa chỉ email không đúng định dạng.';
  }
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (trimmed.length > 255 || !EMAIL_REGEX.test(trimmed)) {
    return 'Địa chỉ email không đúng định dạng.';
  }
  return null;
}

function validateCreateSaleCustomerInput(body = {}) {
  const { fullName, phoneNumber, email, address, note } = body || {};

  const nameError = validateFullName(fullName);
  if (nameError) return { isValid: false, error: nameError };

  const phoneError = validatePhoneNumber(phoneNumber);
  if (phoneError) return { isValid: false, error: phoneError };

  const emailError = validateOptionalEmail(email);
  if (emailError) return { isValid: false, error: emailError };

  return {
    isValid: true,
    value: {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : '',
      address: typeof address === 'string' ? address.trim() : '',
      note: typeof note === 'string' ? note.trim() : '',
    },
  };
}

function validateUpdateSaleCustomerInput(body = {}) {
  const payload = body && typeof body === 'object' ? body : {};
  const value = {};

  if (payload.fullName !== undefined) {
    const nameError = validateFullName(payload.fullName);
    if (nameError) return { isValid: false, error: nameError };
    value.fullName = payload.fullName.trim();
  }

  if (payload.phoneNumber !== undefined) {
    const phoneError = validatePhoneNumber(payload.phoneNumber);
    if (phoneError) return { isValid: false, error: phoneError };
    value.phoneNumber = payload.phoneNumber.trim();
  }

  if (payload.email !== undefined) {
    const emailError = validateOptionalEmail(payload.email);
    if (emailError) return { isValid: false, error: emailError };
    const cleanEmail = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (cleanEmail) {
      value.email = cleanEmail;
    }
  }

  if (payload.status !== undefined) {
    if (typeof payload.status !== 'string' || !ALLOWED_STATUSES.includes(payload.status.trim().toUpperCase())) {
      return { isValid: false, error: 'Trạng thái khách hàng không hợp lệ (chỉ chấp nhận ACTIVE hoặc INACTIVE).' };
    }
    value.status = payload.status.trim().toUpperCase();
  }

  if (payload.gender !== undefined) {
    if (payload.gender === null || String(payload.gender).trim() === '') {
      value.gender = null;
    } else {
      const normalizedGender = String(payload.gender).trim().toUpperCase();
      if (!ALLOWED_GENDERS.includes(normalizedGender)) {
        return { isValid: false, error: 'Giới tính không hợp lệ.' };
      }
      value.gender = normalizedGender;
    }
  }

  if (payload.dob !== undefined) {
    if (payload.dob === null || String(payload.dob).trim() === '') {
      value.dob = null;
    } else {
      const trimmedDob = String(payload.dob).trim();
      if (!DATE_REGEX.test(trimmedDob) || Number.isNaN(Date.parse(trimmedDob))) {
        return { isValid: false, error: 'Ngày sinh không đúng định dạng (YYYY-MM-DD).' };
      }
      value.dob = trimmedDob;
    }
  }

  if (payload.address !== undefined) {
    if (payload.address !== null && typeof payload.address !== 'string') {
      return { isValid: false, error: 'Địa chỉ không hợp lệ.' };
    }
    const trimmedAddress = payload.address ? payload.address.trim() : '';
    if (trimmedAddress.length > 255) {
      return { isValid: false, error: 'Địa chỉ không được vượt quá 255 ký tự.' };
    }
    value.address = trimmedAddress || null;
  }

  if (payload.note !== undefined) {
    if (payload.note !== null && typeof payload.note !== 'string') {
      return { isValid: false, error: 'Ghi chú không hợp lệ.' };
    }
    const trimmedNote = payload.note ? payload.note.trim() : '';
    if (trimmedNote.length > 255) {
      return { isValid: false, error: 'Ghi chú không được vượt quá 255 ký tự.' };
    }
    value.note = trimmedNote || null;
  }

  if (Object.keys(value).length === 0) {
    return { isValid: false, error: 'Vui lòng cung cấp ít nhất một thông tin cần cập nhật.' };
  }

  return { isValid: true, value };
}

module.exports = {
  validateCreateSaleCustomerInput,
  validateUpdateSaleCustomerInput,
};
