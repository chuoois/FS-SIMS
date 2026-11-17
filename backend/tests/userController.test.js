jest.mock('../src/models/userAccount.model', () => ({
  findUserAccountById: jest.fn(),
  findUserAccountByEmail: jest.fn(),
  updateUserProfile: jest.fn(),
  updateUserPassword: jest.fn(),
}));

jest.mock('../src/services/cloudinaryService', () => ({
  deleteImage: jest.fn(),
  getPublicIdFromUrl: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const {
  findUserAccountById,
  findUserAccountByEmail,
  updateUserProfile,
  updateUserPassword,
} = require('../src/models/userAccount.model');
const { deleteImage, getPublicIdFromUrl } = require('../src/services/cloudinaryService');
const { ApiError } = require('../src/utils/ApiError');
const {
  getProfile,
  updateProfile,
  changePassword,
} = require('../src/controllers/userController');

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function createRequest(overrides = {}) {
  return {
    user: { sub: '7', email: 'user@example.com' },
    body: {},
    originalUrl: '/api/users/profile',
    traceId: 'trace-user-test',
    ...overrides,
  };
}

function expectApiError(next, statusCode, detail) {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
  expect(next.mock.calls[0][0]).toMatchObject({ statusCode, detail });
}

describe('userController', () => {
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    updateUserProfile.mockResolvedValue(true);
    updateUserPassword.mockResolvedValue(true);
    deleteImage.mockResolvedValue({});
    getPublicIdFromUrl.mockReturnValue('avatars/old-avatar');
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('new-password-hash');
  });

  describe('getProfile', () => {
    test('returns profile data using the standard success envelope', async () => {
      findUserAccountById.mockResolvedValue({
        user_account_id: 7,
        email: 'user@example.com',
        full_name: 'User Name',
        phone_number: '0900000000',
      });
      const req = createRequest();
      const res = createResponse();

      await getProfile(req, res, next);

      expect(findUserAccountById).toHaveBeenCalledWith(7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Lấy thông tin hồ sơ thành công',
        data: {
          user: expect.objectContaining({
            userAccountId: 7,
            fullName: 'User Name',
            phoneNumber: '0900000000',
          }),
        },
        instance: '/api/users/profile',
        traceId: 'trace-user-test',
        timestamp: expect.any(String),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('forwards missing accounts and lookup errors to error middleware', async () => {
      findUserAccountById.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('database unavailable'));

      await getProfile(createRequest(), createResponse(), next);
      expectApiError(next, 404, 'Người dùng không tồn tại');

      next.mockClear();
      await getProfile(createRequest(), createResponse(), next);
      expectApiError(next, 500, 'Không thể lấy thông tin hồ sơ');
      expect(next.mock.calls[0][0].cause).toBeInstanceOf(Error);
    });
  });

  describe('updateProfile', () => {
    test.each([
      [{ fullName: '   ', phone: '0900000000' }, 'Họ và tên là bắt buộc'],
      [{ fullName: 'User Name', phone: 'invalid' }, 'Số điện thoại không hợp lệ'],
    ])('rejects invalid profile data', async (body, detail) => {
      findUserAccountById.mockResolvedValue({});

      await updateProfile(createRequest({ body }), createResponse(), next);

      expectApiError(next, 400, detail);
      expect(updateUserProfile).not.toHaveBeenCalled();
    });

    test('updates profile and returns data in the standard envelope', async () => {
      findUserAccountById.mockResolvedValue({
        user_account_id: 7,
        full_name: 'Old Name',
        avatar_url: 'https://res.cloudinary.com/demo/image/upload/avatars/old-avatar.jpg',
        note: 'keep note',
      });
      const req = createRequest({
        body: { fullName: ' New Name ', phone: '0900000000', removeAvatar: 'true' },
      });
      const res = createResponse();

      await updateProfile(req, res, next);

      expect(updateUserProfile).toHaveBeenCalledWith(7, expect.objectContaining({
        fullName: 'New Name',
        phoneNumber: '0900000000',
        note: 'keep note',
        avatarUrl: null,
      }), 'USER:7');
      expect(getPublicIdFromUrl).toHaveBeenCalledWith(
        'https://res.cloudinary.com/demo/image/upload/avatars/old-avatar.jpg',
      );
      expect(deleteImage).toHaveBeenCalledWith('avatars/old-avatar');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        data: {
          user: expect.objectContaining({ fullName: 'New Name', avatarUrl: null }),
        },
        traceId: 'trace-user-test',
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    test('rejects non-string or short new passwords', async () => {
      await changePassword(
        createRequest({ body: { currentPassword: 'old', newPassword: 12345678 } }),
        createResponse(),
        next,
      );

      expectApiError(next, 400, 'Mật khẩu mới phải có ít nhất 8 ký tự.');
      expect(findUserAccountByEmail).not.toHaveBeenCalled();
    });

    test('changes the password and returns standardized success data', async () => {
      findUserAccountByEmail.mockResolvedValue({ password_hash: 'old-password-hash' });
      const req = createRequest({
        originalUrl: '/api/users/change-password',
        body: { currentPassword: 'old-password', newPassword: 'new-password' },
      });
      const res = createResponse();

      await changePassword(req, res, next);

      expect(bcrypt.compare).toHaveBeenCalledWith('old-password', 'old-password-hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 10);
      expect(updateUserPassword).toHaveBeenCalledWith(7, 'new-password-hash');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Đổi mật khẩu thành công.',
        data: null,
        instance: '/api/users/change-password',
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });
});
