jest.mock('../src/models/userAccount.model', () => ({
  createUserAccount: jest.fn(),
  findUserAccountByEmail: jest.fn(),
  findUserAccountById: jest.fn(),
  updateUserPassword: jest.fn(),
}));

jest.mock('../src/models/userRole.model', () => ({
  findUserRoleByCode: jest.fn(),
}));

jest.mock('../src/models/refreshToken.model', () => ({
  createRefreshToken: jest.fn(),
  findValidRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
}));

jest.mock('../src/services/mailService', () => ({
  sendNewPasswordEmail: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createUserAccount,
  findUserAccountByEmail,
  findUserAccountById,
  updateUserPassword,
} = require('../src/models/userAccount.model');
const { findUserRoleByCode } = require('../src/models/userRole.model');
const {
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
} = require('../src/models/refreshToken.model');
const { sendNewPasswordEmail } = require('../src/services/mailService');
const {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
} = require('../src/controllers/authController');

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function createRequest(overrides = {}) {
  return {
    body: {},
    cookies: {},
    originalUrl: '/api/auth',
    traceId: 'trace-test',
    ...overrides,
  };
}

function expectApiError(next, statusCode, detail) {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error).toMatchObject({ statusCode, detail });
}

describe('authController', () => {
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    bcrypt.hash.mockResolvedValue('hashed-password');
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('access-token');
    findUserAccountByEmail.mockResolvedValue(null);
    findUserRoleByCode.mockResolvedValue(null);
    createUserAccount.mockResolvedValue({});
    createRefreshToken.mockResolvedValue({});
    findValidRefreshToken.mockResolvedValue(null);
    findUserAccountById.mockResolvedValue(null);
    deleteRefreshToken.mockResolvedValue({});
    updateUserPassword.mockResolvedValue({});
    sendNewPasswordEmail.mockResolvedValue({});
  });

  describe('register', () => {
    test('passes validation failures to the error middleware', async () => {
      const req = createRequest({ body: { email: 'invalid' } });
      const res = createResponse();

      await register(req, res, next);

      expectApiError(next, 400, 'Email không hợp lệ');
      expect(findUserAccountByEmail).not.toHaveBeenCalled();
    });

    test('returns conflict when the email already exists', async () => {
      findUserAccountByEmail.mockResolvedValue({ user_account_id: 7 });
      const req = createRequest({
        body: {
          fullName: 'Customer',
          email: 'customer@example.com',
          password: 'password123',
        },
      });
      const res = createResponse();

      await register(req, res, next);

      expectApiError(next, 409, 'Email đã được sử dụng');
      expect(createUserAccount).not.toHaveBeenCalled();
    });

    test('creates an account and returns the standard success payload', async () => {
      findUserRoleByCode.mockResolvedValue({ role_id: 2 });
      createUserAccount.mockResolvedValue({
        email: 'customer@example.com',
        full_name: 'Customer Name',
      });
      const req = createRequest({
        body: {
          fullName: ' Customer Name ',
          email: ' Customer@Example.com ',
          phone: ' 0900000000 ',
          password: 'password123',
        },
      });
      const res = createResponse();

      await register(req, res, next);

      expect(findUserAccountByEmail).toHaveBeenCalledWith('customer@example.com');
      expect(createUserAccount).toHaveBeenCalledWith(expect.objectContaining({
        roleId: 2,
        email: 'customer@example.com',
        passwordHash: 'hashed-password',
        fullName: 'Customer Name',
        phoneNumber: '0900000000',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 201,
        message: 'Đăng ký tài khoản thành công',
        data: { email: 'customer@example.com', fullName: 'Customer Name' },
        traceId: 'trace-test',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('allows registration when the optional phone number is empty', async () => {
      findUserRoleByCode.mockResolvedValue({ role_id: 2 });
      const req = createRequest({
        body: {
          fullName: 'Customer',
          email: 'customer@example.com',
          phone: '',
          password: 'password123',
        },
      });

      await register(req, createResponse(), next);

      expect(createUserAccount).toHaveBeenCalledWith(expect.objectContaining({
        phoneNumber: null,
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('maps a database duplicate-email error to a conflict', async () => {
      findUserRoleByCode.mockResolvedValue({ role_id: 2 });
      createUserAccount.mockRejectedValue({
        name: 'SequelizeUniqueConstraintError',
      });
      const req = createRequest({
        body: {
          fullName: 'Customer',
          email: 'customer@example.com',
          password: 'password123',
        },
      });

      await register(req, createResponse(), next);

      expectApiError(next, 409, 'Email đã được sử dụng');
    });

    test('reports missing customer role as an internal error', async () => {
      const req = createRequest({
        body: {
          fullName: 'Customer',
          email: 'customer@example.com',
          password: 'password123',
        },
      });

      await register(req, createResponse(), next);

      expectApiError(next, 500, 'Chưa cấu hình vai trò CUSTOMER');
      expect(createUserAccount).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const account = {
      user_account_id: 10,
      email: 'customer@example.com',
      password_hash: 'stored-hash',
      full_name: 'Customer',
      role_id: 5,
      status: 'ACTIVE',
      avatar_url: null,
    };

    test('rejects invalid input', async () => {
      await login(createRequest({ body: {} }), createResponse(), next);

      expectApiError(next, 400, 'Email là bắt buộc');
      expect(findUserAccountByEmail).not.toHaveBeenCalled();
    });

    test('rejects unknown and inactive accounts', async () => {
      const req = createRequest({
        body: { email: 'customer@example.com', password: 'password123' },
      });
      await login(req, createResponse(), next);
      expectApiError(next, 404, 'Tài khoản không tồn tại');

      next.mockClear();
      findUserAccountByEmail.mockResolvedValue({ ...account, status: 'DISABLED' });
      await login(req, createResponse(), next);
      expectApiError(next, 403, 'Tài khoản đã bị vô hiệu hóa');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test('rejects an incorrect password', async () => {
      findUserAccountByEmail.mockResolvedValue(account);
      bcrypt.compare.mockResolvedValue(false);

      await login(
        createRequest({ body: { email: account.email, password: 'wrong-password' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 401, 'Email hoặc mật khẩu không đúng');
      expect(createRefreshToken).not.toHaveBeenCalled();
    });

    test('creates tokens, sets the refresh cookie, and returns account data', async () => {
      findUserAccountByEmail.mockResolvedValue(account);
      const req = createRequest({
        body: { email: ' CUSTOMER@EXAMPLE.COM ', password: 'password123' },
      });
      const res = createResponse();

      await login(req, res, next);

      expect(findUserAccountByEmail).toHaveBeenCalledWith('customer@example.com');
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 10, email: account.email, role: 5 },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
      );
      expect(createRefreshToken).toHaveBeenCalledWith(expect.objectContaining({
        userAccountId: 10,
        createBy: 'USER:10',
        expiresAt: expect.any(Date),
      }));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', expect.any(String), expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        data: {
          accessToken: 'access-token',
          user: {
            userAccountId: 10,
            email: account.email,
            fullName: 'Customer',
            roleId: 5,
            avatarUrl: null,
          },
        },
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('denies staff accounts on the customer login endpoint', async () => {
      findUserAccountByEmail.mockResolvedValue({ ...account, role_id: 99 });
      findUserRoleByCode.mockImplementation(async (code) => (
        code === 'OWNER' ? { role_id: 99 } : null
      ));

      await login(
        createRequest({ body: { email: account.email, password: 'password123' } }),
        createResponse(),
        next,
      );

      expectApiError(
        next,
        403,
        'Tài khoản này không được cấp quyền truy cập. Vui lòng liên hệ quản trị viên',
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    test('rejects a missing or invalid refresh token', async () => {
      await refreshToken(createRequest(), createResponse(), next);
      expectApiError(next, 401, 'Không tìm thấy refresh token');

      next.mockClear();
      await refreshToken(
        createRequest({ cookies: { refreshToken: 'invalid-token' } }),
        createResponse(),
        next,
      );
      expectApiError(next, 401, 'Refresh token không hợp lệ hoặc đã hết hạn');
    });

    test('rejects a token whose account no longer exists', async () => {
      findValidRefreshToken.mockResolvedValue({ user_account_id: 10 });

      await refreshToken(
        createRequest({ cookies: { refreshToken: 'valid-token' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 401, 'Tài khoản không tồn tại');
    });

    test('returns a new access token for a valid refresh token', async () => {
      findValidRefreshToken.mockResolvedValue({ user_account_id: 10 });
      findUserAccountById.mockResolvedValue({
        user_account_id: 10,
        email: 'customer@example.com',
        role_id: 5,
      });
      const res = createResponse();

      await refreshToken(
        createRequest({ cookies: { refreshToken: 'valid-token' } }),
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Làm mới token thành công',
        data: { accessToken: 'access-token' },
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    test('deletes the refresh token, clears the cookie, and returns success', async () => {
      const res = createResponse();

      await logout(
        createRequest({ cookies: { refreshToken: 'refresh-token' } }),
        res,
        next,
      );

      expect(deleteRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Đăng xuất thành công',
        data: null,
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('still clears the cookie when token deletion fails', async () => {
      deleteRefreshToken.mockRejectedValue(new Error('database unavailable'));
      const res = createResponse();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await logout(
        createRequest({ cookies: { refreshToken: 'refresh-token' } }),
        res,
        next,
      );

      expect(res.clearCookie).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('forgotPassword', () => {
    test('rejects a missing email', async () => {
      await forgotPassword(createRequest(), createResponse(), next);

      expectApiError(next, 400, 'Vui lòng cung cấp địa chỉ email.');
      expect(findUserAccountByEmail).not.toHaveBeenCalled();
    });

    test('returns the same response for unknown and inactive accounts', async () => {
      const req = createRequest({ body: { email: ' Customer@Example.com ' } });
      const missingRes = createResponse();

      await forgotPassword(req, missingRes, next);
      expect(findUserAccountByEmail).toHaveBeenCalledWith('customer@example.com');
      expect(missingRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Nếu email đã được đăng ký, mật khẩu mới sẽ được gửi đến hộp thư của bạn.',
        data: null,
      }));

      findUserAccountByEmail.mockResolvedValue({ status: 'DISABLED' });
      const inactiveRes = createResponse();
      await forgotPassword(req, inactiveRes, next);

      expect(inactiveRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Nếu email đã được đăng ký, mật khẩu mới sẽ được gửi đến hộp thư của bạn.',
        data: null,
      }));
      expect(updateUserPassword).not.toHaveBeenCalled();
      expect(sendNewPasswordEmail).not.toHaveBeenCalled();
    });

    test('updates an active account password and sends the new password by email', async () => {
      findUserAccountByEmail.mockResolvedValue({
        user_account_id: 10,
        email: 'customer@example.com',
        full_name: 'Customer',
        status: 'ACTIVE',
      });
      const res = createResponse();

      await forgotPassword(
        createRequest({ body: { email: 'customer@example.com' } }),
        res,
        next,
      );

      expect(updateUserPassword).toHaveBeenCalledWith(10, 'hashed-password');
      expect(sendNewPasswordEmail).toHaveBeenCalledWith(
        'customer@example.com',
        'Customer',
        expect.stringMatching(/^[a-zA-Z0-9]{10}$/),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Nếu email đã được đăng ký, mật khẩu mới sẽ được gửi đến hộp thư của bạn.',
        data: null,
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('passes unexpected failures to the error middleware', async () => {
      findUserAccountByEmail.mockRejectedValue(new Error('database unavailable'));

      await forgotPassword(
        createRequest({ body: { email: 'customer@example.com' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 500, 'Lỗi máy chủ, vui lòng thử lại.');
    });
  });
});
