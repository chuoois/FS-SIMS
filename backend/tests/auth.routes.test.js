// Mock DB models trước khi require app (Jest hoist)
jest.mock('../src/models/userAccount.model', () => ({
  findUserAccountByEmail: jest.fn(),
}));

jest.mock('../src/models/refreshToken.model', () => ({
  createRefreshToken: jest.fn(),
  findValidRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { findUserAccountByEmail } = require('../src/models/userAccount.model');
const {
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
} = require('../src/models/refreshToken.model');

// Hash mật khẩu dùng chung cho test
let hashedPassword;
beforeAll(async () => {
  hashedPassword = await bcrypt.hash('password123', 10);
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createRefreshToken.mockResolvedValue({ refreshTokenId: 1, token: 'fake-rt' });
  });

  test('trả 400 khi thiếu email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email là bắt buộc');
  });

  test('trả 400 khi thiếu mật khẩu', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Mật khẩu là bắt buộc');
  });

  test('trả 401 khi email không tồn tại', async () => {
    findUserAccountByEmail.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noone@example.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Email hoặc mật khẩu không đúng');
  });

  test('trả 401 khi mật khẩu sai', async () => {
    findUserAccountByEmail.mockResolvedValue({
      user_account_id: 1,
      email: 'user@example.com',
      password_hash: hashedPassword,
      status: 'ACTIVE',
      full_name: 'Test User',
      role_id: 5,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Email hoặc mật khẩu không đúng');
  });

  test('trả 403 khi tài khoản bị vô hiệu hóa', async () => {
    findUserAccountByEmail.mockResolvedValue({
      user_account_id: 2,
      email: 'disabled@example.com',
      password_hash: hashedPassword,
      status: 'INACTIVE',
      full_name: 'Disabled User',
      role_id: 5,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'disabled@example.com', password: 'password123' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Tài khoản đã bị vô hiệu hóa');
  });

  test('trả 200 với accessToken và user khi đăng nhập thành công', async () => {
    findUserAccountByEmail.mockResolvedValue({
      user_account_id: 1,
      email: 'user@example.com',
      password_hash: hashedPassword,
      status: 'ACTIVE',
      full_name: 'Test User',
      role_id: 5,
      avatar_url: null,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '  User@Example.com  ', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Đăng nhập thành công');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toMatchObject({
      userAccountId: 1,
      email: 'user@example.com',
      fullName: 'Test User',
    });
    // Không được trả password_hash
    expect(res.body.user.password_hash).toBeUndefined();
    expect(createRefreshToken).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/auth/logout', () => {
  test('trả 200 và xóa cookie khi logout', async () => {
    deleteRefreshToken.mockResolvedValue(1);
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'refreshToken=some-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Đăng xuất thành công');
    expect(deleteRefreshToken).toHaveBeenCalledWith('some-token');
  });
});
