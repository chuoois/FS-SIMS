const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

function optionalText(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }
  if (typeof value !== 'string') {
    return { error: `${fieldName} không hợp lệ.` };
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { error: `${fieldName} không được vượt quá ${maxLength} ký tự.` };
  }
  return { value: trimmed || null };
}

function validateCreateCartRequestInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { isValid: false, error: 'Thông tin yêu cầu không hợp lệ.' };
  }

  const contactName = typeof input.contactName === 'string' ? input.contactName.trim() : '';
  if (!contactName) {
    return { isValid: false, error: 'Tên người nhận là bắt buộc.' };
  }
  if (contactName.length > 150) {
    return { isValid: false, error: 'Tên người nhận không được vượt quá 150 ký tự.' };
  }

  const contactPhone = typeof input.contactPhone === 'string' ? input.contactPhone.trim() : '';
  if (!contactPhone) {
    return { isValid: false, error: 'Số điện thoại là bắt buộc.' };
  }
  if (!PHONE_REGEX.test(contactPhone)) {
    return { isValid: false, error: 'Số điện thoại không hợp lệ.' };
  }

  const deliveryAddress = optionalText(input.deliveryAddress, 'Địa chỉ giao hàng', 255);
  if (deliveryAddress.error) return { isValid: false, error: deliveryAddress.error };
  const description = optionalText(input.description, 'Ghi chú', 500);
  if (description.error) return { isValid: false, error: description.error };

  return {
    isValid: true,
    value: {
      contactName,
      contactPhone,
      deliveryAddress: deliveryAddress.value,
      description: description.value,
    },
  };
}

module.exports = { validateCreateCartRequestInput };
