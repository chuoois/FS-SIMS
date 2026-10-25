// Mock DB models trước khi require app
jest.mock('../src/models/userAccount.model', () => ({
  createUserAccount: jest.fn(),
  findUserAccountByEmail: jest.fn(),
  updateUserAccountStatus: jest.fn(),
  getStaffAccounts: jest.fn(),
  getStaffAccountById: jest.fn(),
  updateStaffAccount: jest.fn(),
  deleteStaffAccount: jest.fn(),
}));

jest.mock('../src/models/userRole.model', () => ({
  findUserRoleByCode: jest.fn(),
  findUserRoleById: jest.fn(),
  getStaffRoles: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');
const {
  createUserAccount,
  findUserAccountByEmail,
  updateUserAccountStatus,
  getStaffAccounts,
  getStaffAccountById,
  updateStaffAccount,
  deleteStaffAccount,
} = require('../src/models/userAccount.model');
const {
  findUserRoleByCode,
  findUserRoleById,
  getStaffRoles,
} = require('../src/models/userRole.model');

describe('Owner Staff Accounts Management API', () => {
  const OWNER_ROLE_ID = 1;
  const SALES_ROLE_ID = 2;
  const LEADER_ROLE_ID = 3;
  const CUSTOMER_ROLE_ID = 4;

  const ownerToken = jwt.sign(
    { sub: 1, email: 'owner@gmail.com', role: OWNER_ROLE_ID },
    process.env.JWT_SECRET,
  );
  const staffToken = jwt.sign(
    { sub: 2, email: 'sales@gmail.com', role: SALES_ROLE_ID },
    process.env.JWT_SECRET,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    findUserRoleByCode.mockImplementation(async (code) => {
      if (code === 'OWNER') return { role_id: OWNER_ROLE_ID, role_code: 'OWNER', role_name: 'Chủ xưởng' };
      if (code === 'SALES') return { role_id: SALES_ROLE_ID, role_code: 'SALES', role_name: 'Nhân viên kinh doanh' };
      if (code === 'LEADERSTAFF') return { role_id: LEADER_ROLE_ID, role_code: 'LEADERSTAFF', role_name: 'Tổ trưởng xưởng' };
      if (code === 'CUSTOMER') return { role_id: CUSTOMER_ROLE_ID, role_code: 'CUSTOMER', role_name: 'Khách hàng' };
      return null;
    });

    findUserRoleById.mockImplementation(async (id) => {
      if (Number(id) === OWNER_ROLE_ID) return { role_id: OWNER_ROLE_ID, role_code: 'OWNER', role_name: 'Chủ xưởng' };
      if (Number(id) === SALES_ROLE_ID) return { role_id: SALES_ROLE_ID, role_code: 'SALES', role_name: 'Nhân viên kinh doanh' };
      if (Number(id) === LEADER_ROLE_ID) return { role_id: LEADER_ROLE_ID, role_code: 'LEADERSTAFF', role_name: 'Tổ trưởng xưởng' };
      return null;
    });
  });

  describe('GET /api/staff-accounts', () => {
    test('trả về 401 khi không truyền token', async () => {
      const res = await request(app).get('/api/staff-accounts');
      expect(res.status).toBe(401);
    });

    test('trả về 403 khi role không phải là OWNER', async () => {
      const res = await request(app)
        .get('/api/staff-accounts')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
    });

    test('trả về 200 và danh sách nhân sự cấp dưới khi role là OWNER (không chứa Owner)', async () => {
      const mockAccounts = [
        {
          user_account_id: 2,
          email: 'sales@gmail.com',
          role_id: SALES_ROLE_ID,
          role: { role_code: 'SALES', role_name: 'Nhân viên kinh doanh' },
        },
        {
          user_account_id: 3,
          email: 'staffleader@gmail.com',
          role_id: LEADER_ROLE_ID,
          role: { role_code: 'LEADERSTAFF', role_name: 'Tổ trưởng xưởng' },
        },
      ];
      getStaffAccounts.mockResolvedValue(mockAccounts);

      const res = await request(app)
        .get('/api/staff-accounts')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].email).toBe('sales@gmail.com');
      // getStaffAccounts được gọi với mảng chỉ chứa SALES và LEADERSTAFF role ID
      expect(getStaffAccounts).toHaveBeenCalledWith([SALES_ROLE_ID, LEADER_ROLE_ID]);
    });

    test('truyền tham số tìm kiếm, lọc vai trò, trạng thái và phân trang vào getStaffAccounts', async () => {
      const mockResult = {
        accounts: [
          {
            user_account_id: 2,
            email: 'sales@gmail.com',
            full_name: 'Nguyễn Văn Sales',
            role_id: SALES_ROLE_ID,
            status: 'ACTIVE',
            role: { role_code: 'SALES', role_name: 'Nhân viên kinh doanh' },
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
        stats: { total: 2, active: 2, inactive: 0, salesCount: 1, leaderCount: 1 },
      };
      getStaffAccounts.mockResolvedValue(mockResult);

      const res = await request(app)
        .get('/api/staff-accounts?search=sales&role=SALES&status=ACTIVE&page=1&limit=10')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });
      expect(res.body.stats).toBeDefined();
      expect(getStaffAccounts).toHaveBeenCalledWith(
        [SALES_ROLE_ID, LEADER_ROLE_ID],
        expect.objectContaining({
          search: 'sales',
          role: 'SALES',
          status: 'ACTIVE',
          page: 1,
          limit: 10,
        }),
      );
    });
  });

  describe('GET /api/staff-accounts/roles', () => {
    test('trả về 200 với danh sách vai trò nhân viên cấp dưới (SALES, LEADERSTAFF)', async () => {
      const mockRoles = [
        { role_id: SALES_ROLE_ID, role_code: 'SALES', role_name: 'Nhân viên kinh doanh' },
        { role_id: LEADER_ROLE_ID, role_code: 'LEADERSTAFF', role_name: 'Tổ trưởng xưởng' },
      ];
      getStaffRoles.mockResolvedValue(mockRoles);

      const res = await request(app)
        .get('/api/staff-accounts/roles')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.roles).toHaveLength(2);
      expect(res.body.roles.some((r) => r.role_code === 'OWNER')).toBe(false);
    });
  });

  describe('POST /api/staff-accounts', () => {
    test('trả về 400 nếu vai trò được chọn không thuộc nhóm nhân viên cấp dưới', async () => {
      const res = await request(app)
        .post('/api/staff-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'test@gmail.com',
          password: 'password123',
          fullName: 'Test User',
          phoneNumber: '0901234567',
          roleId: OWNER_ROLE_ID, // Không cho phép tạo thêm Owner qua cổng này
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không hợp lệ');
    });

    test('trả về 201 khi tạo thành công nhân viên mới với vai trò SALES', async () => {
      findUserAccountByEmail.mockResolvedValue(null);
      createUserAccount.mockResolvedValue({
        user_account_id: 10,
        email: 'newsales@gmail.com',
        role_id: SALES_ROLE_ID,
        full_name: 'New Sales Staff',
      });

      const res = await request(app)
        .post('/api/staff-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'newsales@gmail.com',
          password: 'password123',
          fullName: 'New Sales Staff',
          phoneNumber: '0901234567',
          roleId: SALES_ROLE_ID,
        });

      expect(res.status).toBe(201);
      expect(res.body.account).toBeDefined();
      expect(res.body.account.email).toBe('newsales@gmail.com');
    });
  });

  describe('PUT /api/staff-accounts/:id', () => {
    test('trả về 200 và cập nhật email thành công', async () => {
      getStaffAccountById
        .mockResolvedValueOnce({
          user_account_id: 2,
          email: 'sales@gmail.com',
          role_id: SALES_ROLE_ID,
        })
        .mockResolvedValueOnce({
          user_account_id: 2,
          email: 'updated_sales@gmail.com',
          role_id: SALES_ROLE_ID,
        });

      findUserAccountByEmail.mockResolvedValue(null);
      updateStaffAccount.mockResolvedValue(true);

      const res = await request(app)
        .put('/api/staff-accounts/2')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'updated_sales@gmail.com',
          fullName: 'Updated Sales Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
      expect(updateStaffAccount).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          email: 'updated_sales@gmail.com',
          fullName: 'Updated Sales Name',
        }),
        expect.any(String),
      );
    });

    test('trả về 409 nếu email mới đã bị tài khoản khác sử dụng', async () => {
      getStaffAccountById.mockResolvedValue({
        user_account_id: 2,
        email: 'sales@gmail.com',
        role_id: SALES_ROLE_ID,
      });

      findUserAccountByEmail.mockResolvedValue({
        user_account_id: 99,
        email: 'taken@gmail.com',
      });

      const res = await request(app)
        .put('/api/staff-accounts/2')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'taken@gmail.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Email đã được sử dụng');
    });

    test('trả về 400 nếu email không đúng định dạng', async () => {
      getStaffAccountById.mockResolvedValue({
        user_account_id: 2,
        email: 'sales@gmail.com',
        role_id: SALES_ROLE_ID,
      });

      const res = await request(app)
        .put('/api/staff-accounts/2')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'invalid-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email không đúng định dạng');
    });

    test('trả về 400 nếu cố tình thay đổi vai trò nhân sự', async () => {
      getStaffAccountById.mockResolvedValue({
        user_account_id: 2,
        email: 'sales@gmail.com',
        role_id: SALES_ROLE_ID,
      });

      const res = await request(app)
        .put('/api/staff-accounts/2')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          roleId: LEADER_ROLE_ID,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Không được phép thay đổi vai trò');
    });
  });

  describe('PATCH /api/staff-accounts/:id/status', () => {
    test('trả về 200 khi khóa tài khoản nhân viên', async () => {
      getStaffAccountById.mockResolvedValue({
        user_account_id: 2,
        email: 'sales@gmail.com',
        status: 'ACTIVE',
      });
      updateUserAccountStatus.mockResolvedValue([1]);

      const res = await request(app)
        .patch('/api/staff-accounts/2/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('INACTIVE');
    });
  });

  describe('DELETE /api/staff-accounts/:id', () => {
    test('trả về 200 khi xóa tài khoản nhân viên cấp dưới', async () => {
      getStaffAccountById.mockResolvedValue({
        user_account_id: 2,
        email: 'sales@gmail.com',
      });
      deleteStaffAccount.mockResolvedValue(1);

      const res = await request(app)
        .delete('/api/staff-accounts/2')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
    });
  });
});
