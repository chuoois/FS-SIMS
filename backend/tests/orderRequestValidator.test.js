const { validateCreateCartRequestInput } = require('../src/utils/orderRequestValidator');

describe('validateCreateCartRequestInput', () => {
  test('chuẩn hóa thông tin liên hệ hợp lệ', () => {
    expect(validateCreateCartRequestInput({
      contactName: '  Nguyễn Văn A ',
      contactPhone: '090 123 4567',
      deliveryAddress: '  12 Lê Lợi  ',
      description: '  Giao giờ hành chính  ',
    })).toEqual({
      isValid: true,
      value: {
        contactName: 'Nguyễn Văn A',
        contactPhone: '090 123 4567',
        deliveryAddress: '12 Lê Lợi',
        description: 'Giao giờ hành chính',
      },
    });
  });

  test.each([
    [{ contactPhone: '0901234567' }, 'Tên người nhận là bắt buộc.'],
    [{ contactName: 'Nguyễn Văn A', contactPhone: 'abc' }, 'Số điện thoại không hợp lệ.'],
    [{ contactName: 'Nguyễn Văn A', contactPhone: '0901234567', deliveryAddress: 'x'.repeat(256) }, 'Địa chỉ giao hàng không được vượt quá 255 ký tự.'],
  ])('từ chối dữ liệu không hợp lệ', (input, message) => {
    expect(validateCreateCartRequestInput(input)).toMatchObject({
      isValid: false,
      error: message,
    });
  });
});
