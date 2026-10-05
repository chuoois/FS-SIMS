jest.mock('../src/models/userAccount.model', () => ({
  createUserAccount: jest.fn(),
  findUserAccountByEmail: jest.fn(),
}));

jest.mock('../src/models/userRole.model', () => ({
  findUserRoleByCode: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const {
  createUserAccount,
  findUserAccountByEmail,
} = require('../src/models/userAccount.model');
const { findUserRoleByCode } = require('../src/models/userRole.model');

describe('POST /api/users/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findUserAccountByEmail.mockResolvedValue(null);
    findUserRoleByCode.mockResolvedValue({ role_id: 5, role_code: 'CUSTOMER' });
    createUserAccount.mockImplementation(async (account) => ({
      userAccountId: 21,
      roleId: account.roleId,
      email: account.email,
      fullName: account.fullName,
      phoneNumber: account.phoneNumber,
    }));
  });

  test('trả 400 khi dữ liệu đăng ký không hợp lệ', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({ email: 'not-an-email', password: 'short', fullName: '' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Email không hợp lệ');
    expect(createUserAccount).not.toHaveBeenCalled();
  });

  test('trả 409 khi email đã tồn tại', async () => {
    findUserAccountByEmail.mockResolvedValue({ user_account_id: 7 });

    const response = await request(app)
      .post('/api/users/register')
      .send({ email: 'taken@example.com', password: 'password123', fullName: 'Test User' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Email đã được sử dụng');
    expect(createUserAccount).not.toHaveBeenCalled();
  });

  test('tạo tài khoản CUSTOMER với mật khẩu đã hash và không trả password', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({ email: '  Person@Example.com ', password: 'password123', fullName: ' Test User ' });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      userAccountId: 21,
      roleId: 5,
      email: 'person@example.com',
      fullName: 'Test User',
    });
    expect(response.body.user.password).toBeUndefined();
    expect(findUserRoleByCode).toHaveBeenCalledWith('CUSTOMER');

    const [account] = createUserAccount.mock.calls[0];
    expect(account.roleId).toBe(5);
    expect(account.passwordHash).not.toBe('password123');
    await expect(bcrypt.compare('password123', account.passwordHash)).resolves.toBe(true);
  });

  test('truyền đúng phoneNumber khi có số điện thoại', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({ email: 'user@example.com', password: 'password123', fullName: 'Test User', phone: '0912345678' });

    expect(response.status).toBe(201);
    const [account] = createUserAccount.mock.calls[0];
    expect(account.phoneNumber).toBe('0912345678');
  });
});