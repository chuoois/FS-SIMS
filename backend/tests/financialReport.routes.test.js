// =========================================================
// financialReport.routes.test.js
// Route tests cho API Quản lý Báo cáo Tài chính (Manage Financial Reports — Owner)
// =========================================================

// Mock models trước khi require app
jest.mock('../src/models/userAccount.model', () => ({
  UserAccount: {},
}));

jest.mock('../src/models/userRole.model', () => ({
  UserRole: {},
  findUserRoleByCode: jest.fn(),
}));

jest.mock('../src/models/ContractItemModel', () => ({
  ContractItem: {},
}));

jest.mock('../src/models/ProductModel', () => ({
  Product: {},
}));

jest.mock('../src/models/ContractModel', () => ({
  Contract: {},
}));

jest.mock('../src/models/CustomerOrderModel', () => ({
  CustomerOrder: {},
}));

jest.mock('../src/models/CustomerOrderItemModel', () => ({
  CustomerOrderItem: {},
}));

jest.mock('../src/models/RawMaterialModel', () => ({
  RawMaterial: {},
}));

jest.mock('../src/models/ProductionOrderModel', () => ({
  ProductionOrder: {},
}));

jest.mock('../src/models/MaterialIssueModel', () => ({
  MaterialIssue: {},
}));

jest.mock('../src/models/MaterialReceiptModel', () => ({
  MaterialReceipt: {},
}));

jest.mock('../src/models/SupplierModel', () => ({
  Supplier: {},
}));

jest.mock('../src/models/financialReportModel', () => ({
  getFinancialSummaryData: jest.fn(),
  getFinancialOrdersList: jest.fn(),
  getFinancialReceiptsList: jest.fn(),
  getFinancialExportData: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const {
  getFinancialSummaryData,
  getFinancialOrdersList,
  getFinancialReceiptsList,
  getFinancialExportData,
} = require('../src/models/financialReportModel');

const { findUserRoleByCode } = require('../src/models/userRole.model');

describe('Financial Reports API (/api/financial-reports)', () => {
  let ownerToken;
  let customerToken;

  beforeAll(() => {
    ownerToken = jwt.sign(
      { sub: 1, email: 'owner@gocnha.vn', role: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { sub: 10, email: 'customer@gmail.com', role: 5 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findUserRoleByCode.mockImplementation(async (code) => {
      if (code === 'OWNER') return { role_id: 1, role_code: 'OWNER' };
      return null;
    });
  });

  describe('GET /api/financial-reports/summary', () => {
    it('1. Trả về 401 nếu không có token xác thực', async () => {
      const res = await request(app).get('/api/financial-reports/summary');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/yêu cầu xác thực/i);
    });

    it('2. Trả về 403 nếu không phải vai trò OWNER', async () => {
      const res = await request(app)
        .get('/api/financial-reports/summary')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/không có quyền/i);
    });

    it('3. Trả về 400 nếu startDate > endDate', async () => {
      const res = await request(app)
        .get('/api/financial-reports/summary')
        .query({ startDate: '2026-12-01', endDate: '2026-11-01' })
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/startDate không thể lớn hơn endDate/i);
    });

    it('4. Trả về 200 và dữ liệu tổng hợp tài chính khi query hợp lệ', async () => {
      getFinancialSummaryData.mockResolvedValueOnce({
        startDate: '2026-01-01',
        endDate: '2026-10-31',
        totalRevenue: 100000000,
        paidRevenue: 80000000,
        totalCost: 35000000,
        ordersCount: 10,
        completedOrdersCount: 6,
        receiptsCount: 4,
        revenueByOrderType: [
          { order_type: 'CUSTOM', orders_count: 4, total_revenue: 40000000, paid_revenue: 30000000 },
          { order_type: 'READY', orders_count: 6, total_revenue: 60000000, paid_revenue: 50000000 },
        ],
        timeline: [
          { period: '2026-09', revenue: 40000000, cost: 15000000 },
          { period: '2026-10', revenue: 60000000, cost: 20000000 },
        ],
        topProducts: [
          { item_name: 'Bàn ăn gỗ sồi', quantity_sold: 4, total_revenue: 18000000 },
        ],
      });

      const res = await request(app)
        .get('/api/financial-reports/summary')
        .query({ startDate: '2026-01-01', endDate: '2026-10-31' })
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/thành công/i);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.metrics.totalRevenue).toBe(100000000);
      expect(res.body.summary.metrics.grossProfit).toBe(65000000);
      expect(res.body.summary.metrics.profitMargin).toBe(65);
    });
  });

  describe('GET /api/financial-reports/orders', () => {
    it('5. Trả về 200 và danh sách chi tiết đơn hàng kèm phân trang', async () => {
      getFinancialOrdersList.mockResolvedValueOnce({
        orders: [
          {
            order_id: 1,
            order_code: 'ORD-20261017-0001',
            order_type: 'READY',
            contact_name: 'Phạm Minh Khách',
            contact_phone: '0900000011',
            total_amount: 11200000,
            deposit_amount: 5000000,
            paid_amount: 11200000,
            status: 'COMPLETED',
            createdate: '2026-10-17T10:00:00Z',
          },
        ],
        pagination: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 10,
        },
      });

      const res = await request(app)
        .get('/api/financial-reports/orders')
        .query({ startDate: '2026-10-01', endDate: '2026-10-31', page: 1, limit: 10 })
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(1);
      expect(res.body.orders[0].order_code).toBe('ORD-20261017-0001');
      expect(res.body.orders[0].remaining_amount).toBe(0);
      expect(res.body.pagination.totalItems).toBe(1);
    });
  });

  describe('GET /api/financial-reports/receipts', () => {
    it('6. Trả về 200 và danh sách chi tiết phiếu nhập kho kèm phân trang', async () => {
      getFinancialReceiptsList.mockResolvedValueOnce({
        receipts: [
          {
            receipt_id: 1,
            receipt_code: 'RCP-20261001-0001',
            supplier_id: 1,
            supplier: { supplier_name: 'Gỗ Đức Thành' },
            receipt_date: '2026-10-01',
            total_amount: 61000000,
            status: 'CONFIRMED',
            receiver: { full_name: 'Trần Trưởng' },
            createdate: '2026-10-01T08:00:00Z',
          },
        ],
        pagination: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 10,
        },
      });

      const res = await request(app)
        .get('/api/financial-reports/receipts')
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.receipts).toHaveLength(1);
      expect(res.body.receipts[0].receipt_code).toBe('RCP-20261001-0001');
      expect(res.body.receipts[0].supplier_name).toBe('Gỗ Đức Thành');
    });
  });

  describe('GET /api/financial-reports/export', () => {
    it('7. Trả về 200 và JSON dữ liệu xuất báo cáo', async () => {
      getFinancialExportData.mockResolvedValueOnce({
        summary: {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          totalRevenue: 10000000,
          paidRevenue: 10000000,
          totalCost: 5000000,
        },
        orders: [
          {
            order_id: 1,
            order_code: 'ORD-001',
            order_type: 'CUSTOM',
            contact_name: 'Anh An',
            contact_phone: '0901234567',
            total_amount: 10000000,
            deposit_amount: 5000000,
            paid_amount: 10000000,
            status: 'COMPLETED',
            createdate: '2026-10-15T00:00:00Z',
          },
        ],
        receipts: [
          {
            receipt_id: 1,
            receipt_code: 'RCP-001',
            supplier: { supplier_name: 'NCC A' },
            receipt_date: '2026-10-10',
            total_amount: 5000000,
            status: 'CONFIRMED',
          },
        ],
      });

      const res = await request(app)
        .get('/api/financial-reports/export')
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.exportData).toBeDefined();
      expect(res.body.exportData.orders).toHaveLength(1);
      expect(res.body.exportData.receipts).toHaveLength(1);
    });

    it('8. Trả về 200 và nội dung CSV UTF-8 BOM khi format=csv', async () => {
      getFinancialExportData.mockResolvedValueOnce({
        summary: {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          totalRevenue: 10000000,
          paidRevenue: 10000000,
          totalCost: 5000000,
        },
        orders: [],
        receipts: [],
      });

      const res = await request(app)
        .get('/api/financial-reports/export')
        .query({ startDate: '2026-10-01', endDate: '2026-10-31', format: 'csv' })
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('BÁO CÁO TÀI CHÍNH');
      expect(res.text.startsWith('\uFEFF')).toBe(true);
    });
  });
});

