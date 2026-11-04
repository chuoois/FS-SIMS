// =========================================================
// orderManagement.routes.test.js
// Unit & Route tests cho API Quản lý Đơn hàng (Manage Orders — Owner)
// Tuân thủ pattern mock của dự án (docs/TESTING_AND_DEBUGGING.md)
// =========================================================

// Mock models TRƯỚC khi require app
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
  getCustomerOrdersWithPagination: jest.fn(),
  findCustomerOrderById: jest.fn(),
  cancelOrder: jest.fn(),
  updateOrderStatus: jest.fn(),
  VALID_STATUSES: ['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'],
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
  getOrdersWithPagination,
  findOrderById,
  cancelOrder: cancelOrderModel,
  updateOrderStatus: updateOrderStatusModel,
} = require('../src/models/CustomerOrderModel');

const { findUserRoleByCode } = require('../src/models/userRole.model');

// ─── Mock DTO helper ─────────────────────────────────────────────────
function mockOrderDTO(overrides = {}) {
  return {
    orderId: 1,
    orderCode: 'ORD-20261101-0001',
    orderType: 'CUSTOM',
    orderTypeLabel: 'Đặt theo yêu cầu',
    contractId: 10,
    contractCode: 'CON-20261101-0001',
    customerAccountId: null,
    contactName: 'Nguyễn Văn Khách',
    contactPhone: '0901234567',
    deliveryAddress: '123 Đường ABC',
    totalAmount: 15000000,
    depositAmount: 5000000,
    paidAmount: 5000000,
    remainingAmount: 10000000,
    status: 'CONFIRMED',
    statusLabel: 'Đã xác nhận',
    expectedDate: '2026-12-01',
    deliveredDate: null,
    assignedTo: 2,
    staffName: 'Nguyễn Nhân Viên',
    note: null,
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-01T08:00:00Z',
    items: [],
    ...overrides,
  };
}

describe('Manage Orders API (/api/order-management)', () => {
  let ownerToken;
  let salesToken;
  let guestToken;

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

    guestToken = jwt.sign(
      { sub: 99, email: 'guest@gocnha.vn', role: 99 },
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

  // ── 1. Xác thực & Phân quyền ────────────────────────────────────────
  describe('Xác thực & Phân quyền', () => {
    test('401 khi không gửi token (GET /)', async () => {
      const res = await request(app).get('/api/order-management');
      expect(res.status).toBe(401);
    });

    test('403 khi role không phải OWNER/SALES (GET /)', async () => {
      const res = await request(app)
        .get('/api/order-management')
        .set('Authorization', `Bearer ${guestToken}`);
      expect(res.status).toBe(403);
    });

    test('403 khi Sales cố PATCH /:id/status', async () => {
      const res = await request(app)
        .patch('/api/order-management/1/status')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ status: 'CONFIRMED' });
      expect(res.status).toBe(403);
    });
  });

  // ── 2. GET /api/order-management ────────────────────────────────────
  describe('GET /api/order-management (Danh sách đơn hàng)', () => {
    test('Owner lấy danh sách thành công (200)', async () => {
      getOrdersWithPagination.mockResolvedValueOnce({
        orders: [mockOrderDTO()],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/order-management')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/thành công/i);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    test('Sales lấy danh sách thành công (200)', async () => {
      getOrdersWithPagination.mockResolvedValueOnce({
        orders: [],
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/order-management')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.orders)).toBe(true);
    });

    test('500 khi model ném lỗi', async () => {
      getOrdersWithPagination.mockRejectedValueOnce(new Error('DB lỗi'));

      const res = await request(app)
        .get('/api/order-management')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── 3. GET /api/order-management/:id ────────────────────────────────
  describe('GET /api/order-management/:id (Chi tiết đơn hàng)', () => {
    test('Lấy chi tiết thành công (200)', async () => {
      const dto = mockOrderDTO();
      const mockOrder = {
        order_id: dto.orderId,
        order_code: dto.orderCode,
        order_type: dto.orderType,
        contract_id: dto.contractId,
        customer_account_id: null,
        contact_name: dto.contactName,
        contact_phone: dto.contactPhone,
        delivery_address: dto.deliveryAddress,
        total_amount: dto.totalAmount,
        deposit_amount: dto.depositAmount,
        paid_amount: dto.paidAmount,
        status: dto.status,
        expected_date: dto.expectedDate,
        delivered_date: null,
        assigned_to: dto.assignedTo,
        note: null,
        createdate: dto.createdAt,
        modifiedate: dto.updatedAt,
        contract: { contract_code: dto.contractCode },
        staff: { full_name: dto.staffName },
        items: [],
        toJSON() {
          return {
            order_id: this.order_id,
            order_code: this.order_code,
            order_type: this.order_type,
            contract_id: this.contract_id,
            customer_account_id: this.customer_account_id,
            contact_name: this.contact_name,
            contact_phone: this.contact_phone,
            delivery_address: this.delivery_address,
            total_amount: this.total_amount,
            deposit_amount: this.deposit_amount,
            paid_amount: this.paid_amount,
            status: this.status,
            expected_date: this.expected_date,
            delivered_date: this.delivered_date,
            assigned_to: this.assigned_to,
            note: this.note,
            createdate: this.createdate,
            modifiedate: this.modifiedate,
            contract: this.contract,
            staff: this.staff,
            items: this.items,
          };
        },
      };
      findOrderById.mockResolvedValueOnce(mockOrder);

      const res = await request(app)
        .get('/api/order-management/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.orderCode).toBe('ORD-20261101-0001');
    });

    test('404 khi không tìm thấy đơn hàng', async () => {
      findOrderById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/order-management/9999')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    test('400 khi id không hợp lệ', async () => {
      const res = await request(app)
        .get('/api/order-management/abc')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ── 4. POST /api/order-management/:id/cancel ────────────────────────
  describe('POST /api/order-management/:id/cancel (Hủy đơn hàng)', () => {
    test('Hủy thành công (200)', async () => {
      const mockOrder = {
        ...mockOrderDTO({ status: 'CANCELLED', statusLabel: 'Đã hủy' }),
        toJSON: function() { return { ...this }; },
      };
      cancelOrderModel.mockResolvedValueOnce(mockOrder);

      const res = await request(app)
        .post('/api/order-management/1/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/hủy/i);
    });

    test('400 khi đơn hàng đã hoàn thành', async () => {
      cancelOrderModel.mockRejectedValueOnce(new Error('Không thể hủy đơn hàng đã hoàn thành.'));

      const res = await request(app)
        .post('/api/order-management/1/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });

    test('404 khi không tìm thấy đơn hàng', async () => {
      cancelOrderModel.mockRejectedValueOnce(new Error('Không tìm thấy đơn hàng.'));

      const res = await request(app)
        .post('/api/order-management/9999/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    test('400 khi id không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/order-management/abc/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ── 5. PATCH /api/order-management/:id/status ───────────────────────
  describe('PATCH /api/order-management/:id/status (Cập nhật trạng thái)', () => {
    test('Cập nhật thành công (200)', async () => {
      const mockOrder = {
        ...mockOrderDTO({ status: 'IN_PRODUCTION', statusLabel: 'Đang sản xuất' }),
        toJSON: function() { return { ...this }; },
      };
      updateOrderStatusModel.mockResolvedValueOnce(mockOrder);

      const res = await request(app)
        .patch('/api/order-management/1/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'IN_PRODUCTION' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('IN_PRODUCTION');
    });

    test('400 khi trạng thái không hợp lệ', async () => {
      const res = await request(app)
        .patch('/api/order-management/1/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
    });

    test('400 khi thiếu trường status', async () => {
      const res = await request(app)
        .patch('/api/order-management/1/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    test('404 khi không tìm thấy đơn hàng', async () => {
      updateOrderStatusModel.mockRejectedValueOnce(new Error('Không tìm thấy đơn hàng.'));

      const res = await request(app)
        .patch('/api/order-management/9999/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(404);
    });

    test('400 khi đơn đã bị hủy', async () => {
      updateOrderStatusModel.mockRejectedValueOnce(
        new Error('Không thể cập nhật trạng thái đơn hàng đã bị hủy.')
      );

      const res = await request(app)
        .patch('/api/order-management/1/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(400);
    });

    test('400 khi id không hợp lệ', async () => {
      const res = await request(app)
        .patch('/api/order-management/abc/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(400);
    });
  });
});
