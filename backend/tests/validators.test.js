const { validateRegistrationInput, validateLoginInput } = require('../src/utils/validators');

describe('validateRegistrationInput', () => {
  test('chấp nhận dữ liệu hợp lệ không có phone', () => {
    expect(validateRegistrationInput({
      email: 'person@example.com',
      password: 'password123',
      fullName: 'Test User',
    })).toBeNull();
  });

  test('chấp nhận dữ liệu hợp lệ có phone', () => {
    expect(validateRegistrationInput({
      email: 'person@example.com',
      password: 'password123',
      fullName: 'Test User',
      phoneNumber: '0912345678',
    })).toBeNull();
  });

  test('chấp nhận phone rỗng (tuỳ chọn)', () => {
    expect(validateRegistrationInput({
      email: 'person@example.com',
      password: 'password123',
      fullName: 'Test User',
      phoneNumber: '',
    })).toBeNull();
  });

  test('từ chối phone không hợp lệ', () => {
    expect(validateRegistrationInput({
      email: 'person@example.com',
      password: 'password123',
      fullName: 'Test User',
      phoneNumber: 'abc',
    })).toBe('Số điện thoại không hợp lệ');
  });

  test('từ chối thiếu email', () => {
    expect(validateRegistrationInput({ password: 'password123', fullName: 'Test User' }))
      .toBe('Email là bắt buộc');
  });

  test('từ chối email không hợp lệ', () => {
    expect(validateRegistrationInput({
      email: 'not-an-email',
      password: 'password123',
      fullName: 'Test User',
    })).toBe('Email không hợp lệ');
  });

  test('từ chối mật khẩu ngắn', () => {
    expect(validateRegistrationInput({
      email: 'person@example.com',
      password: 'short',
      fullName: 'Test User',
    })).toBe('Mật khẩu phải có ít nhất 8 ký tự');
  });

  test('từ chối thiếu fullName', () => {
    expect(validateRegistrationInput({
      email: 'person@example.com',
      password: 'password123',
      fullName: '   ',
    })).toBe('Họ và tên là bắt buộc và không được vượt quá 150 ký tự');
  });
});

describe('validateLoginInput', () => {
  test('chấp nhận dữ liệu hợp lệ', () => {
    expect(validateLoginInput({ email: 'person@example.com', password: 'anypassword' })).toBeNull();
  });

  test('từ chối thiếu email', () => {
    expect(validateLoginInput({ password: 'password123' })).toBe('Email là bắt buộc');
  });

  test('từ chối thiếu password', () => {
    expect(validateLoginInput({ email: 'person@example.com' })).toBe('Mật khẩu là bắt buộc');
  });

  test('từ chối email không hợp lệ', () => {
    expect(validateLoginInput({ email: 'bad-email', password: 'password123' }))
      .toBe('Email không hợp lệ');
  });
});