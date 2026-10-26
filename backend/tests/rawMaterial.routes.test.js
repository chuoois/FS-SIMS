// =========================================================
// rawMaterial.routes.test.js
// Route tests cho API Quản lý Nguyên vật liệu (Manage Raw Materials)
// Mock Model theo đúng pattern dự án
// =========================================================

jest.mock('../src/models/userAccount.model', () => ({
  UserAccount: {},
  createUserAccount: jest.fn(),
  findUserAccountByEmail: jest.fn(),
  updateUserAccountStatus: jest.fn(),
  getStaffAccounts: jest.fn(),
  getStaffAccountById: jest.fn(),
  updateStaffAccount: jest.fn(),
  deleteStaffAccount: jest.fn(),
}));

jest.mock('../src/models/userRole.model', () => ({
  UserRole: {},
  findUserRoleByCode: jest.fn(),
  findUserRoleById: jest.fn(),
  getStaffRoles: jest.fn(),
}));

jest.mock('../src/models/RawMaterialModel', () => ({
  RawMaterial: {},
  findRawMaterialById: jest.fn(),
  findRawMaterialByCode: jest.fn(),
  getRawMaterialsWithPagination: jest.fn(),
  countRawMaterialUsage: jest.fn(),
  createRawMaterial: jest.fn(),
  updateRawMaterial: jest.fn(),
  deleteRawMaterial: jest.fn(),
  generateNextRawMaterialCode: jest.fn(),
  getRawMaterialStockSummary: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const { findUserRoleByCode } = require('../src/models/userRole.model');
const {
  findRawMaterialById,
  findRawMaterialByCode,
  getRawMaterialsWithPagination,
  countRawMaterialUsage,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  generateNextRawMaterialCode,
  getRawMaterialStockSummary,
} = require('../src/models/RawMaterialModel');

const OWNER_ROLE_ID = 1;
const SALES_ROLE_ID = 2;

const ownerToken = jwt.sign(
  { sub: 1, email: 'owner@fssims.com', role: OWNER_ROLE_ID },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const salesToken = jwt.sign(
  { sub: 2, email: 'sales@fssims.com', role: SALES_ROLE_ID },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('RawMaterial Routes - /api/raw-materials', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    findUserRoleByCode.mockImplementation(async (code) => {
      if (code === 'OWNER') {
        return { role_id: OWNER_ROLE_ID, role_code: 'OWNER', role_name: 'Chủ xưởng' };
      }
      if (code === 'SALES') {
        return { role_id: SALES_ROLE_ID, role_code: 'SALES', role_name: 'Nhân viên kinh doanh' };
      }
      return null;
    });
  });

  describe('GET /api/raw-materials', () => {
    test('trả về 401 khi không có token', async () => {
      const res = await request(app).get('/api/raw-materials');
      expect(res.status).toBe(401);
    });

    test('trả về danh sách nguyên vật liệu thành công với role OWNER', async () => {
      getRawMaterialsWithPagination.mockResolvedValue({
        materials: [
          {
            raw_material_id: 1,
            raw_code: 'WOOD-OAK',
            raw_name: 'Gỗ sồi xẻ',
            unit: 'BOARD',
            quantity_on_hand: 50,
            min_quantity: 20,
            status: 'ACTIVE',
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/raw-materials')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/thành công/);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].rawCode).toBe('WOOD-OAK');
    });
  });

  describe('GET /api/raw-materials/stock-summary', () => {
    test('trả về thống kê tồn kho nguyên vật liệu', async () => {
      getRawMaterialStockSummary.mockResolvedValue({
        totalMaterials: 10,
        lowStockMaterials: 2,
        outOfStockMaterials: 1,
        totalQuantity: 250,
      });

      const res = await request(app)
        .get('/api/raw-materials/stock-summary')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.lowStockMaterials).toBe(2);
    });
  });

  describe('POST /api/raw-materials', () => {
    const validBody = {
      raw_code: 'WOOD-OAK',
      raw_name: 'Gỗ sồi xẻ',
      unit: 'BOARD',
      quantity_on_hand: 50,
      min_quantity: 20,
    };

    test('trả về 400 khi thiếu thông tin bắt buộc', async () => {
      const res = await request(app)
        .post('/api/raw-materials')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ raw_code: 'WOOD-OAK' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Tên nguyên vật liệu là bắt buộc/);
    });

    test('trả về 409 khi mã nguyên vật liệu bị trùng', async () => {
      findRawMaterialByCode.mockResolvedValue({ raw_material_id: 10, raw_code: 'WOOD-OAK' });

      const res = await request(app)
        .post('/api/raw-materials')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/đã tồn tại/);
    });

    test('tạo nguyên vật liệu thành công và trả về 201', async () => {
      findRawMaterialByCode.mockResolvedValue(null);
      createRawMaterial.mockResolvedValue({ raw_material_id: 1, ...validBody });
      findRawMaterialById.mockResolvedValue({ raw_material_id: 1, ...validBody });

      const res = await request(app)
        .post('/api/raw-materials')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Thêm mới nguyên vật liệu thành công/);
      expect(res.body.data.rawCode).toBe('WOOD-OAK');
    });
  });

  describe('DELETE /api/raw-materials/:id', () => {
    test('trả về 404 khi không tìm thấy nguyên vật liệu', async () => {
      findRawMaterialById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/raw-materials/999')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    test('trả về 400 khi nguyên vật liệu đã có phiếu nhập/xuất kho', async () => {
      findRawMaterialById.mockResolvedValue({ raw_material_id: 1, raw_code: 'WOOD-OAK' });
      countRawMaterialUsage.mockResolvedValue({ totalUsage: 2, receiptCount: 2 });

      const res = await request(app)
        .delete('/api/raw-materials/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không thể xóa nguyên vật liệu do đã có phiếu nhập kho/);
    });

    test('xóa thành công và trả về 200 khi chưa sử dụng', async () => {
      findRawMaterialById.mockResolvedValue({ raw_material_id: 1, raw_code: 'WOOD-OAK' });
      countRawMaterialUsage.mockResolvedValue({ totalUsage: 0 });
      deleteRawMaterial.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/raw-materials/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Xóa nguyên vật liệu thành công/);
    });
  });
});
