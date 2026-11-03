// =========================================================
// productionOrder.routes.test.js
// Unit & Route tests cho API Quản lý Lệnh Gia Công (Manage Production Orders)
// Tuân thủ pattern mock của dự án (docs/TESTING_AND_DEBUGGING.md)
// =========================================================

// Mock models trước khi require app
jest.mock('../src/models/userAccount.model', () => ({
  UserAccount: {},
  createUserAccount: jest.fn(),
  findUserAccountByEmail: jest.fn(),
  findUserAccountById: jest.fn(),
  updateUserAccountStatus: jest.fn(),
  getStaffAccounts: jest.fn(),
  getStaffAccountById: jest.fn(),
  updateStaffAccount: jest.fn(),
  deleteStaffAccount: jest.fn(),
  getStaffLeaders: jest.fn(),
}));

jest.mock('../src/models/userRole.model', () => ({
  UserRole: {},
  findUserRoleByCode: jest.fn(),
  findUserRoleById: jest.fn(),
  getStaffRoles: jest.fn(),
}));

jest.mock('../src/models/ContractItemModel', () => ({
  ContractItem: {},
}));

jest.mock('../src/models/ProductModel', () => ({
  Product: {},
  findProductById: jest.fn(),
  getProductsWithPagination: jest.fn(),
  getProductMetadata: jest.fn(),
}));

jest.mock('../src/models/ContractModel', () => ({
  Contract: {},
  createOfflineContract: jest.fn(),
  signContract: jest.fn(),
  findContractById: jest.fn(),
  getContractsWithPagination: jest.fn(),
}));

jest.mock('../src/models/CustomerOrderModel', () => ({
  CustomerOrder: {},
  generateNextOrderCode: jest.fn(),
  createOrderFromContract: jest.fn(),
  findOrderById: jest.fn(),
  findOrderByCode: jest.fn(),
  findOrderByContractId: jest.fn(),
  getOrdersWithPagination: jest.fn(),
}));

jest.mock('../src/models/CustomerOrderItemModel', () => ({
  CustomerOrderItem: {},
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

jest.mock('../src/models/ProductionOrderModel', () => ({
  ProductionOrder: {},
  findProductionOrderById: jest.fn(),
  findProductionOrderByCode: jest.fn(),
  getProductionOrdersForExport: jest.fn(),
  getAllProductionOrders: jest.fn(),
  generateNextProductionOrderCode: jest.fn(),
  createProductionOrder: jest.fn(),
  assignLeaderToOrder: jest.fn(),
  cancelProductionOrder: jest.fn(),
  getEligibleCustomerOrders: jest.fn(),
}));

jest.mock('../src/models/MaterialIssueModel', () => ({
  MaterialIssue: {},
  findIssueById: jest.fn(),
  findIssueByCode: jest.fn(),
  getIssuesWithPagination: jest.fn(),
  getIssueStatistics: jest.fn(),
  generateNextIssueCode: jest.fn(),
  createIssueWithItems: jest.fn(),
  updateIssueWithItems: jest.fn(),
  deleteIssue: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const {
  getAllProductionOrders,
  findProductionOrderById,
  createProductionOrder,
  assignLeaderToOrder,
  cancelProductionOrder,
  getEligibleCustomerOrders,
} = require('../src/models/ProductionOrderModel');

const { getStaffLeaders } = require('../src/models/userAccount.model');
const { findUserRoleByCode } = require('../src/models/userRole.model');

describe('Manage Production Orders API (/api/production-orders)', () => {
  let ownerToken;
  let salesToken;

  const mockProductionOrder = {
    production_id: 1,
    production_code: 'PO-20261031-0001',
    production_type: 'CUSTOM',
    order_id: 5,
    status: 'DRAFT',
    planned_start: '2026-11-01',
    planned_end: '2026-11-30',
    completed_date: null,
    assigned_to: null,
    note: null,
    createby: 'owner@gocnha.vn',
    createdate: '2026-10-31T08:00:00Z',
    customerOrder: {
      order_id: 5,
      order_code: 'ORD-20261028-0005',
      order_type: 'CUSTOM',
      status: 'IN_PRODUCTION',
      contact_name: 'Khách hàng ABC',
    },
    supervisor: null,
    get: function(opts) {
      return this;
    },
  };

  const mockStaffLeaders = [
    { user_account_id: 10, full_name: 'Nguyễn Văn Trưởng', email: 'leader@gocnha.vn', phone_number: '0901111222' },
    { user_account_id: 11, full_name: 'Trần Thị Nhóm', email: 'leader2@gocnha.vn', phone_number: '0902222333' },
  ];

  const mockEligibleOrders = [
    { order_id: 5, order_code: 'ORD-20261028-0005', order_type: 'CUSTOM', status: 'CONFIRMED', contact_name: 'Khách ABC' },
    { order_id: 6, order_code: 'ORD-20261028-0006', order_type: 'CUSTOM', status: 'CONFIRMED', contact_name: 'Khách XYZ' },
  ];

  beforeAll(() => {
    ownerToken = jwt.sign(
      { sub: 1, email: 'owner@gocnha.vn', role: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    salesToken = jwt.sign(
      { sub: 2, email: 'sale@gocnha.vn', role: 2 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findUserRoleByCode.mockImplementation(async (code) => {
      if (code === 'OWNER') return { role_id: 1, role_code: 'OWNER' };
      if (code === 'SALES') return { role_id: 2, role_code: 'SALES' };
      return null;
    });
  });

  // ── Phân quyền & Xác thực ──────────────────────────────────
  describe('Phân quyền & Xác thực', () => {
    test('trả về 401 khi không gửi token', async () => {
      const res = await request(app).get('/api/production-orders');
      expect(res.status).toBe(401);
    });

    test('trả về 403 khi role không phải OWNER (ví dụ SALES)', async () => {
      const res = await request(app)
        .get('/api/production-orders')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ── 1. GET /api/production-orders ───────────────────────────
  describe('1. GET /api/production-orders (Danh sách)', () => {
    test('lấy danh sách lệnh gia công thành công (200)', async () => {
      getAllProductionOrders.mockResolvedValueOnce({
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
        productionOrders: [mockProductionOrder],
      });

      const res = await request(app)
        .get('/api/production-orders?page=1&limit=10')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.productionOrders).toHaveLength(1);
      expect(res.body.productionOrders[0].production_code).toBe('PO-20261031-0001');
      expect(res.body.pagination.totalItems).toBe(1);
    });

    test('trả về danh sách rỗng khi không có lệnh gia công', async () => {
      getAllProductionOrders.mockResolvedValueOnce({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
        productionOrders: [],
      });

      const res = await request(app)
        .get('/api/production-orders')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.productionOrders).toHaveLength(0);
    });
  });

  // ── 2. GET /api/production-orders/eligible-orders ──────────
  describe('2. GET /api/production-orders/eligible-orders (Đơn hàng đủ điều kiện)', () => {
    test('lấy danh sách đơn hàng đủ điều kiện thành công (200)', async () => {
      getEligibleCustomerOrders.mockResolvedValueOnce(mockEligibleOrders);

      const res = await request(app)
        .get('/api/production-orders/eligible-orders')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].order_code).toBe('ORD-20261028-0005');
    });
  });

  // ── 3. GET /api/production-orders/staff-leaders ────────────
  describe('3. GET /api/production-orders/staff-leaders (Trưởng nhóm)', () => {
    test('lấy danh sách trưởng nhóm thành công (200)', async () => {
      getStaffLeaders.mockResolvedValueOnce(mockStaffLeaders);

      const res = await request(app)
        .get('/api/production-orders/staff-leaders')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].full_name).toBe('Nguyễn Văn Trưởng');
    });
  });

  // ── 4. POST /api/production-orders (Tạo mới) ───────────────
  describe('4. POST /api/production-orders (Tạo mới)', () => {
    const validBody = {
      order_id: 5,
      planned_start: '2026-11-01',
      planned_end: '2026-11-30',
    };

    test('trả về 400 khi thiếu order_id', async () => {
      const res = await request(app)
        .post('/api/production-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ planned_start: '2026-11-01', planned_end: '2026-11-30' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/đơn hàng/i);
    });

    test('trả về 400 khi thiếu planned_start', async () => {
      const res = await request(app)
        .post('/api/production-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ order_id: 5, planned_end: '2026-11-30' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Ngày bắt đầu/i);
    });

    test('trả về 400 khi planned_end < planned_start', async () => {
      const res = await request(app)
        .post('/api/production-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ order_id: 5, planned_start: '2026-11-30', planned_end: '2026-11-01' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/kết thúc/i);
    });

    test('trả về 400 khi đơn hàng không tồn tại', async () => {
      createProductionOrder.mockRejectedValueOnce(new Error('Đơn hàng không tồn tại.'));

      const res = await request(app)
        .post('/api/production-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Đơn hàng không tồn tại/);
    });

    test('tạo lệnh gia công thành công (201)', async () => {
      createProductionOrder.mockResolvedValueOnce({
        production_id: 1,
        production_code: 'PO-20261031-0001',
      });
      findProductionOrderById.mockResolvedValueOnce(mockProductionOrder);

      const res = await request(app)
        .post('/api/production-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.productionOrder.production_code).toBe('PO-20261031-0001');
      expect(res.body.message).toMatch(/Tạo lệnh gia công thành công/);
    });
  });

  // ── 5. PATCH /api/production-orders/:id/assign-leader ──────
  describe('5. PATCH /api/production-orders/:id/assign-leader (Gán trưởng nhóm)', () => {
    test('trả về 400 khi thiếu assigned_to', async () => {
      findProductionOrderById.mockResolvedValueOnce(mockProductionOrder);

      const res = await request(app)
        .patch('/api/production-orders/1/assign-leader')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/trưởng nhóm/i);
    });

    test('trả về 404 khi không tìm thấy lệnh gia công', async () => {
      findProductionOrderById.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/production-orders/999/assign-leader')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ assigned_to: 10 });

      expect(res.status).toBe(404);
    });

    test('gán trưởng nhóm thành công (200)', async () => {
      findProductionOrderById.mockResolvedValueOnce(mockProductionOrder);
      assignLeaderToOrder.mockResolvedValueOnce({
        ...mockProductionOrder,
        assigned_to: 10,
        supervisor: { user_account_id: 10, full_name: 'Nguyễn Văn Trưởng', email: 'leader@gocnha.vn', phone_number: '0901111222' },
      });

      const res = await request(app)
        .patch('/api/production-orders/1/assign-leader')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ assigned_to: 10 });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Gán trưởng nhóm thành công/);
    });
  });

  // ── 6. POST /api/production-orders/:id/cancel ──────────────
  describe('6. POST /api/production-orders/:id/cancel (Hủy lệnh)', () => {
    test('trả về 404 khi không tìm thấy lệnh gia công', async () => {
      findProductionOrderById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/production-orders/999/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Không tìm thấy/);
    });

    test('trả về 400 khi cố gắng hủy lệnh đã COMPLETED', async () => {
      findProductionOrderById.mockResolvedValueOnce({
        ...mockProductionOrder,
        status: 'COMPLETED',
      });
      cancelProductionOrder.mockRejectedValueOnce(new Error('Không thể hủy lệnh gia công đã hoàn thành.'));

      const res = await request(app)
        .post('/api/production-orders/1/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });

    test('hủy lệnh gia công thành công (200)', async () => {
      findProductionOrderById.mockResolvedValueOnce(mockProductionOrder);
      cancelProductionOrder.mockResolvedValueOnce({ ...mockProductionOrder, status: 'CANCELLED' });

      const res = await request(app)
        .post('/api/production-orders/1/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Hủy lệnh gia công thành công/);
    });
  });
});
