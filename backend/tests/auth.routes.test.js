// Mock DB models trước khi require app (Jest hoist)
jest.mock('../src/models/userAccount.model', () => ({
  findUserAccountByEmail: jest.fn(),
  createUserAccount: jest.fn(),
  findUserAccountById: jest.fn(),
  updateUserProfile: jest.fn(),
}));

jest.mock('../src/models/userRole.model', () => ({
  findUserRoleByCode: jest.fn(),
}));

jest.mock('../src/models/refreshToken.model', () => ({
  createRefreshToken: jest.fn(),
  findValidRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
}));

jest.mock('../src/middlewares/uploadMiddleware', () => ({
  single: jest.fn(() => (req, res, next) => {
    if (req.headers['x-test-avatar-url']) {
      req.file = { path: req.headers['x-test-avatar-url'] };
    }
    next();
  }),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');
const { findUserAccountByEmail, createUserAccount, findUserAccountById, updateUserProfile } = require('../src/models/userAccount.model');
const { findUserRoleByCode } = require('../src/models/userRole.model');
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

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('trả 400 khi email không hợp lệ', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Test User',
      email: 'invalid-email',
      phone: '0901234567',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email không hợp lệ');
  });

  test('trả 409 khi email đã tồn tại', async () => {
    findUserAccountByEmail.mockResolvedValue({ user_account_id: 99, email: 'user@example.com' });

    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Test User',
      email: 'user@example.com',
      phone: '0901234567',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email đã được sử dụng');
  });

  test('trả 500 khi chưa cấu hình vai trò CUSTOMER', async () => {
    findUserAccountByEmail.mockResolvedValue(null);
    findUserRoleByCode.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Test User',
      email: 'user@example.com',
      phone: '0901234567',
      password: 'password123',
    });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Chưa cấu hình vai trò CUSTOMER');
  });

  test('trả 201 và tạo tài khoản mới khi đăng ký thành công', async () => {
    findUserAccountByEmail.mockResolvedValue(null);
    findUserRoleByCode.mockResolvedValue({ role_id: 3, role_code: 'CUSTOMER' });
    createUserAccount.mockResolvedValue({
      userAccountId: 12,
      email: 'newuser@example.com',
      fullName: 'New User',
      roleId: 3,
      phoneNumber: '0901234567',
      status: 'ACTIVE',
    });

    const res = await request(app).post('/api/auth/register').send({
      fullName: '  New User  ',
      email: '  NEWUSER@example.com  ',
      phone: '0901234567',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Đăng ký tài khoản thành công');
    expect(res.body.user).toMatchObject({
      email: 'newuser@example.com',
      fullName: 'New User',
      roleId: 3,
    });
    expect(createUserAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newuser@example.com',
        fullName: 'New User',
        roleId: 3,
      }),
    );
  });
});

describe('GET /api/users/profile', () => {
  test('trả 200 và dữ liệu profile hiện tại của user', async () => {
    findUserAccountById.mockResolvedValue({
      user_account_id: 7,
      email: 'user@example.com',
      full_name: 'Nguyễn Văn A',
      phone_number: '0901234567',
      gender: 'male',
      dob: '1995-05-20',
      address: 'Hà Nội',
      status: 'ACTIVE',
      role_id: 3,
    });

    const token = jwt.sign({ sub: 7, email: 'user@example.com', role: 3 }, process.env.JWT_SECRET);

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      userAccountId: 7,
      email: 'user@example.com',
      fullName: 'Nguyễn Văn A',
      phoneNumber: '0901234567',
      gender: 'male',
      dateOfBirth: '1995-05-20',
      address: 'Hà Nội',
    });
  });
});

describe('PUT /api/users/profile', () => {
  test('cập nhật thông tin profile thành công', async () => {
    findUserAccountById.mockResolvedValue({
      user_account_id: 7,
      email: 'user@example.com',
      full_name: 'Nguyễn Văn A',
      phone_number: '0901234567',
      gender: 'male',
      dob: '1995-05-20',
      address: 'Hà Nội',
    });
    updateUserProfile.mockResolvedValue(true);

    const token = jwt.sign({ sub: 7, email: 'user@example.com', role: 3 }, process.env.JWT_SECRET);

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Nguyễn Văn B',
        phone: '0912345678',
        gender: 'female',
        birthday: '1997-10-11',
        address: 'Đà Nẵng',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Cập nhật hồ sơ thành công');
    expect(updateUserProfile).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        fullName: 'Nguyễn Văn B',
        phoneNumber: '0912345678',
        gender: 'female',
        dob: '1997-10-11',
        address: 'Đà Nẵng',
      }),
      'USER:7',
    );
  });

  test('lưu URL ảnh đại diện Cloudinary khi upload ảnh', async () => {
    findUserAccountById.mockResolvedValue({
      user_account_id: 7,
      email: 'user@example.com',
      full_name: 'Nguyễn Văn A',
      phone_number: '0901234567',
      avatar_url: null,
    });
    updateUserProfile.mockResolvedValue(true);

    const token = jwt.sign({ sub: 7, email: 'user@example.com', role: 3 }, process.env.JWT_SECRET);
    const avatarUrl = 'https://res.cloudinary.com/example/image/upload/avatar.jpg';

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .set('x-test-avatar-url', avatarUrl)
      .send({ fullName: 'Nguyễn Văn A', phone: '0901234567' });

    expect(res.status).toBe(200);
    expect(res.body.user.avatarUrl).toBe(avatarUrl);
    expect(updateUserProfile).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ avatarUrl }),
      'USER:7',
    );
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
