// =========================================================
// materialExport.routes.test.js
// Unit & Route tests cho API Quản lý Phiếu Xuất Kho Nguyên Vật Liệu (Manage Material Export Slips)
// Tuân thủ pattern mock của dự án (docs/TESTING_AND_DEBUGGING.md)
// =========================================================

// Mock models trước khi require app
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

jest.mock('../src/models/ProductionOrderModel', () => ({
  ProductionOrder: {},
  findProductionOrderById: jest.fn(),
  findProductionOrderByCode: jest.fn(),
  getProductionOrdersForExport: jest.fn(),
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
  findIssueById,
  findIssueByCode,
  getIssuesWithPagination,
  getIssueStatistics,
  generateNextIssueCode,
  createIssueWithItems,
  updateIssueWithItems,
  deleteIssue,
} = require('../src/models/MaterialIssueModel');

const {
  findProductionOrderById,
  getProductionOrdersForExport,
} = require('../src/models/ProductionOrderModel');

const { findRawMaterialById } = require('../src/models/RawMaterialModel');
const { findUserRoleByCode } = require('../src/models/userRole.model');

describe('Manage Material Export Slips API (/api/material-exports)', () => {
  let ownerToken;
  let salesToken;

  const mockIssueDetail = {
    issue_id: 1,
    issue_code: 'EXP-20261027-0001',
    production_id: 10,
    issue_date: '2026-10-27',
    status: 'DRAFT',
    issued_by: 1,
    note: 'Xuất gỗ cho đơn PRD-001',
    createdate: '2026-10-27T08:00:00Z',
    productionOrder: {
      production_id: 10,
      production_code: 'PRD-20261021-0001',
      production_type: 'CUSTOM',
      status: 'IN_PROGRESS',
      planned_start: '2026-10-22',
      planned_end: '2026-10-30',
      note: 'Gia công bàn họp',
    },
    issuer: {
      user_account_id: 1,
      full_name: 'Nguyễn Văn Chủ',
      email: 'owner@gocnha.vn',
      phone_number: '0901234567',
    },
    items: [
      {
        issue_item_id: 1,
        raw_material_id: 5,
        rawMaterial: {
          raw_material_id: 5,
          raw_code: 'WOOD-OAK',
          raw_name: 'Gỗ sồi Mỹ xẻ sấy',
          unit: 'BOARD',
          quantity_on_hand: 100,
        },
        quantity: 15,
        note: 'Tấm dày 3cm',
      },
    ],
  };

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
      const res = await request(app).get('/api/material-exports');
      expect(res.status).toBe(401);
    });

    test('trả về 403 khi role không phải OWNER (ví dụ SALES)', async () => {
      const res = await request(app)
        .get('/api/material-exports')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ── 1. GET /api/material-exports/summary ───────────────────
  describe('1. GET /api/material-exports/summary (Thống kê)', () => {
    test('lấy thống kê thành công (200)', async () => {
      getIssueStatistics.mockResolvedValueOnce({
        totalIssues: 12,
        draftCount: 4,
        confirmedCount: 7,
        cancelledCount: 1,
        totalQuantityIssued: 230,
      });

      const res = await request(app)
        .get('/api/material-exports/summary')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalIssues).toBe(12);
      expect(res.body.summary.confirmedCount).toBe(7);
      expect(res.body.summary.totalQuantityIssued).toBe(230);
    });
  });

  // ── 2. GET /api/material-exports/next-code ─────────────────
  describe('2. GET /api/material-exports/next-code (Sinh mã)', () => {
    test('sinh mã phiếu xuất tiếp theo thành công (200)', async () => {
      generateNextIssueCode.mockResolvedValueOnce('EXP-20261027-0005');

      const res = await request(app)
        .get('/api/material-exports/next-code?date=2026-10-27')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.nextCode).toBe('EXP-20261027-0005');
      expect(generateNextIssueCode).toHaveBeenCalledWith('2026-10-27');
    });
  });

  // ── 3. GET /api/material-exports/production-orders ─────────
  describe('3. GET /api/material-exports/production-orders', () => {
    test('lấy danh sách lệnh gia công thành công (200)', async () => {
      getProductionOrdersForExport.mockResolvedValueOnce([
        { production_id: 1, production_code: 'PRD-001', production_type: 'CUSTOM', status: 'IN_PROGRESS' },
        { production_id: 2, production_code: 'PRD-002', production_type: 'STOCK', status: 'DRAFT' },
      ]);

      const res = await request(app)
        .get('/api/material-exports/production-orders')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].production_code).toBe('PRD-001');
    });
  });

  // ── 4. GET /api/material-exports ───────────────────────────
  describe('4. GET /api/material-exports (Danh sách)', () => {
    test('lấy danh sách phiếu xuất có phân trang thành công (200)', async () => {
      getIssuesWithPagination.mockResolvedValueOnce({
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
        issues: [mockIssueDetail],
      });

      const res = await request(app)
        .get('/api/material-exports?page=1&limit=10&status=DRAFT')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].issue_code).toBe('EXP-20261027-0001');
      expect(res.body.data[0].production_code).toBe('PRD-20261021-0001');
      expect(res.body.pagination.totalItems).toBe(1);
    });
  });

  // ── 5. GET /api/material-exports/:id ───────────────────────
  describe('5. GET /api/material-exports/:id (Chi tiết)', () => {
    test('trả về 400 nếu ID không hợp lệ', async () => {
      const res = await request(app)
        .get('/api/material-exports/invalid-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });

    test('trả về 404 khi không tìm thấy phiếu xuất', async () => {
      findIssueById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/material-exports/999')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    test('lấy chi tiết phiếu xuất thành công (200)', async () => {
      findIssueById.mockResolvedValueOnce(mockIssueDetail);

      const res = await request(app)
        .get('/api/material-exports/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.issue.issue_code).toBe('EXP-20261027-0001');
      expect(res.body.issue.items).toHaveLength(1);
      expect(res.body.issue.items[0].raw_name).toBe('Gỗ sồi Mỹ xẻ sấy');
    });
  });

  // ── 6. POST /api/material-exports (Tạo mới) ────────────────
  describe('6. POST /api/material-exports (Tạo mới)', () => {
    const validBody = {
      production_id: 10,
      issue_date: '2026-10-27',
      status: 'DRAFT',
      note: 'Xuất gỗ làm bàn',
      items: [
        { raw_material_id: 5, quantity: 10, note: 'Gỗ sồi' },
      ],
    };

    test('trả về 400 khi thiếu production_id', async () => {
      const res = await request(app)
        .post('/api/material-exports')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...validBody, production_id: undefined });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/lệnh gia công/);
    });

    test('trả về 400 khi danh sách items rỗng', async () => {
      const res = await request(app)
        .post('/api/material-exports')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...validBody, items: [] });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/ít nhất 1/);
    });

    test('trả về 400 khi lệnh gia công không tồn tại', async () => {
      findProductionOrderById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/material-exports')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Lệnh gia công với ID .* không tồn tại/);
    });

    test('trả về 400 khi nguyên vật liệu không tồn tại', async () => {
      findProductionOrderById.mockResolvedValueOnce({ production_id: 10 });
      findRawMaterialById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/material-exports')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/không tồn tại/);
    });

    test('trả về 400 khi tạo CONFIRMED ngay mà tồn kho không đủ', async () => {
      findProductionOrderById.mockResolvedValueOnce({ production_id: 10 });
      findRawMaterialById.mockResolvedValueOnce({
        raw_material_id: 5,
        raw_name: 'Gỗ sồi',
        status: 'ACTIVE',
        quantity_on_hand: 5, // Chỉ có 5 mà xuất 10
      });

      const res = await request(app)
        .post('/api/material-exports')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...validBody, status: 'CONFIRMED' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không đủ tồn kho để xuất/);
    });

    test('trả về 409 khi mã phiếu xuất trùng lặp', async () => {
      findProductionOrderById.mockResolvedValueOnce({ production_id: 10 });
      findRawMaterialById.mockResolvedValueOnce({ raw_material_id: 5, status: 'ACTIVE' });
      findIssueByCode.mockResolvedValueOnce({ issue_id: 1 });

      const res = await request(app)
        .post('/api/material-exports')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...validBody, issue_code: 'EXP-DUPLICATE' });

      expect(res.status).toBe(409);
    });

    test('tạo phiếu xuất kho nháp thành công (201)', async () => {
      findProductionOrderById.mockResolvedValueOnce({ production_id: 10 });
      findRawMaterialById.mockResolvedValueOnce({ raw_material_id: 5, status: 'ACTIVE' });
      generateNextIssueCode.mockResolvedValueOnce('EXP-20261027-0001');
      createIssueWithItems.mockResolvedValueOnce(mockIssueDetail);

      const res = await request(app)
        .post('/api/material-exports')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.issue.issue_code).toBe('EXP-20261027-0001');
      expect(res.body.message).toMatch(/Tạo phiếu xuất kho nháp thành công/);
    });
  });

  // ── 7. PUT /api/material-exports/:id (Chỉnh sửa) ───────────
  describe('7. PUT /api/material-exports/:id (Chỉnh sửa phiếu nháp)', () => {
    test('trả về 404 khi không tìm thấy phiếu xuất', async () => {
      findIssueById.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/material-exports/999')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Cập nhật ghi chú' });

      expect(res.status).toBe(404);
    });

    test('trả về 400 khi cố gắng sửa phiếu không phải DRAFT (ví dụ CONFIRMED)', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .put('/api/material-exports/1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Sửa phiếu đã xuất' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Chỉ được phép chỉnh sửa phiếu xuất kho khi ở trạng thái nháp/);
    });

    test('cập nhật thành công phiếu xuất nháp (200)', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'DRAFT',
      });
      findRawMaterialById.mockResolvedValueOnce({ raw_material_id: 5, status: 'ACTIVE' });
      updateIssueWithItems.mockResolvedValueOnce({
        ...mockIssueDetail,
        note: 'Đã cập nhật sau kiểm đếm',
      });

      const res = await request(app)
        .put('/api/material-exports/1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          note: 'Đã cập nhật sau kiểm đếm',
          items: [{ raw_material_id: 5, quantity: 12 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Cập nhật phiếu xuất kho/);
      expect(res.body.issue.note).toBe('Đã cập nhật sau kiểm đếm');
    });
  });

  // ── 8. POST /api/material-exports/:id/confirm (Xác nhận xuất)
  describe('8. POST /api/material-exports/:id/confirm (Xác nhận xuất kho)', () => {
    test('trả về 400 nếu phiếu đã CONFIRMED trước đó', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post('/api/material-exports/1/confirm')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/đã được xác nhận/);
    });

    test('trả về 400 nếu tồn kho không đủ khi xác nhận', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'DRAFT',
        items: [{ raw_material_id: 5, quantity: 50 }],
      });
      findRawMaterialById.mockResolvedValueOnce({
        raw_material_id: 5,
        raw_name: 'Gỗ sồi',
        quantity_on_hand: 20, // Chỉ có 20 mà xuất 50
      });

      const res = await request(app)
        .post('/api/material-exports/1/confirm')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không đủ tồn kho để xuất/);
    });

    test('xác nhận xuất kho thành công (200)', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'DRAFT',
        items: [{ raw_material_id: 5, quantity: 15 }],
      });
      findRawMaterialById.mockResolvedValueOnce({
        raw_material_id: 5,
        raw_name: 'Gỗ sồi',
        quantity_on_hand: 100,
      });
      updateIssueWithItems.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post('/api/material-exports/1/confirm')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.issue.status).toBe('CONFIRMED');
      expect(res.body.message).toMatch(/Xác nhận xuất kho thành công/);
    });
  });

  // ── 9. POST /api/material-exports/:id/cancel (Hủy phiếu) ──
  describe('9. POST /api/material-exports/:id/cancel (Hủy phiếu xuất kho)', () => {
    test('trả về 400 nếu cố gắng hủy phiếu đã CONFIRMED', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post('/api/material-exports/1/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/không thể hủy/);
    });

    test('hủy phiếu xuất kho nháp thành công (200)', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'DRAFT',
      });
      updateIssueWithItems.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'CANCELLED',
      });

      const res = await request(app)
        .post('/api/material-exports/1/cancel')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Hủy phiếu xuất do hoãn sản xuất' });

      expect(res.status).toBe(200);
      expect(res.body.issue.status).toBe('CANCELLED');
    });
  });

  // ── 10. DELETE /api/material-exports/:id (Xóa phiếu) ───────
  describe('10. DELETE /api/material-exports/:id (Xóa phiếu)', () => {
    test('trả về 400 khi cố gắng xóa phiếu đã CONFIRMED', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .delete('/api/material-exports/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không thể xóa phiếu xuất kho đã xác nhận/);
    });

    test('xóa thành công phiếu DRAFT (200)', async () => {
      findIssueById.mockResolvedValueOnce({
        ...mockIssueDetail,
        status: 'DRAFT',
      });
      deleteIssue.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/material-exports/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Xóa phiếu xuất kho thành công/);
    });
  });
});
