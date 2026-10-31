// =========================================================
// purchaseReceipt.routes.test.js
// Unit & Route tests cho API Quản lý Phiếu Nhập Kho (Manage Purchase Receipts)
// Tuân thủ pattern mock của dự án (docs/TESTING_AND_DEBUGGING.md)
// =========================================================

// Mock models trước khi require app
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
  UserRole: {},
  findUserRoleByCode: jest.fn(),
  findUserRoleById: jest.fn(),
  getStaffRoles: jest.fn(),
}));

jest.mock('../src/models/SupplierModel', () => ({
  Supplier: {},
  findSupplierById: jest.fn(),
  findSupplierByCode: jest.fn(),
  getSuppliersWithPagination: jest.fn(),
  getSupplierWithReceiptHistory: jest.fn(),
  countMaterialReceiptsBySupplierId: jest.fn(),
  createSupplier: jest.fn(),
  updateSupplier: jest.fn(),
  deleteSupplier: jest.fn(),
  getActiveSuppliers: jest.fn(),
  validateSupplierForReceipt: jest.fn(),
  generateNextSupplierCode: jest.fn(),
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

jest.mock('../src/models/MaterialReceiptModel', () => ({
  MaterialReceipt: {},
  findReceiptById: jest.fn(),
  findReceiptByCode: jest.fn(),
  getReceiptsWithPagination: jest.fn(),
  getReceiptStatistics: jest.fn(),
  generateNextReceiptCode: jest.fn(),
  createReceiptWithItems: jest.fn(),
  updateReceiptWithItems: jest.fn(),
  deleteReceipt: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const {
  findReceiptById,
  findReceiptByCode,
  getReceiptsWithPagination,
  getReceiptStatistics,
  generateNextReceiptCode,
  createReceiptWithItems,
  updateReceiptWithItems,
  deleteReceipt,
} = require('../src/models/MaterialReceiptModel');

const { validateSupplierForReceipt } = require('../src/models/SupplierModel');
const { findRawMaterialById } = require('../src/models/RawMaterialModel');
const { findUserRoleByCode } = require('../src/models/userRole.model');

describe('Manage Purchase Receipts API (/api/purchase-receipts)', () => {
  let ownerToken;
  let salesToken;

  const mockReceiptDetail = {
    receipt_id: 1,
    receipt_code: 'RCP-20261027-0001',
    supplier_id: 2,
    receipt_date: '2026-10-27',
    total_amount: 3500000,
    status: 'DRAFT',
    received_by: 1,
    note: 'Nhập thử nghiệm',
    createdate: '2026-10-27T08:00:00Z',
    supplier: {
      supplier_id: 2,
      supplier_code: 'SUP-001',
      supplier_name: 'Công ty Gỗ Sài Gòn',
      phone_number: '0281234567',
      address: 'KCN Tân Bình',
      status: 'ACTIVE',
    },
    receiver: {
      user_account_id: 1,
      full_name: 'Nguyễn Văn Chủ',
      email: 'owner@fssims.local',
    },
    items: [
      {
        receipt_item_id: 1,
        receipt_id: 1,
        raw_material_id: 10,
        quantity: 10,
        unit_price: 350000,
        rawMaterial: {
          raw_material_id: 10,
          raw_code: 'WOOD-OAK',
          raw_name: 'Gỗ sồi xẻ',
          unit: 'BOARD',
          quantity_on_hand: 50,
        },
      },
    ],
  };

  beforeAll(() => {
    // Giả lập role OWNER có role_id = 1, SALES có role_id = 2
    findUserRoleByCode.mockImplementation(async (code) => {
      if (code === 'OWNER') return { role_id: 1, role_code: 'OWNER' };
      if (code === 'SALES') return { role_id: 2, role_code: 'SALES' };
      return null;
    });

    ownerToken = jwt.sign(
      { sub: 1, email: 'owner@fssims.local', role: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    salesToken = jwt.sign(
      { sub: 2, email: 'sales@fssims.local', role: 2 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Phân quyền truy cập', () => {
    test('trả về 401 khi không gửi token', async () => {
      const res = await request(app).get('/api/purchase-receipts');
      expect(res.status).toBe(401);
    });

    test('trả về 403 khi đăng nhập bằng role khác OWNER (vd: SALES)', async () => {
      const res = await request(app)
        .get('/api/purchase-receipts')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('2. GET /api/purchase-receipts (Danh sách phiếu nhập)', () => {
    test('trả về danh sách phân trang thành công', async () => {
      getReceiptsWithPagination.mockResolvedValueOnce({
        receipts: [mockReceiptDetail],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/purchase-receipts?page=1&limit=10')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].receipt_code).toBe('RCP-20261027-0001');
      expect(res.body.pagination.totalItems).toBe(1);
    });
  });

  describe('3. GET /api/purchase-receipts/summary', () => {
    test('trả về thống kê phiếu nhập', async () => {
      getReceiptStatistics.mockResolvedValueOnce({
        totalReceipts: 5,
        draftCount: 2,
        confirmedCount: 2,
        cancelledCount: 1,
        confirmedTotalAmount: 71800000,
      });

      const res = await request(app)
        .get('/api/purchase-receipts/summary')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalReceipts).toBe(5);
      expect(res.body.summary.confirmedTotalAmount).toBe(71800000);
    });
  });

  describe('4. GET /api/purchase-receipts/next-code', () => {
    test('trả về mã phiếu nhập tiếp theo', async () => {
      generateNextReceiptCode.mockResolvedValueOnce('RCP-20261027-0002');

      const res = await request(app)
        .get('/api/purchase-receipts/next-code?date=2026-10-27')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.nextCode).toBe('RCP-20261027-0002');
    });
  });

  describe('5. GET /api/purchase-receipts/:id (Chi tiết phiếu nhập)', () => {
    test('trả về 400 khi id không hợp lệ', async () => {
      const res = await request(app)
        .get('/api/purchase-receipts/abc')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(400);
    });

    test('trả về 404 khi không tìm thấy phiếu nhập', async () => {
      findReceiptById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/purchase-receipts/999')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    test('trả về 200 kèm chi tiết mặt hàng khi tìm thấy', async () => {
      findReceiptById.mockResolvedValueOnce(mockReceiptDetail);

      const res = await request(app)
        .get('/api/purchase-receipts/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.receipt.receipt_code).toBe('RCP-20261027-0001');
      expect(res.body.receipt.items).toHaveLength(1);
      expect(res.body.receipt.items[0].raw_code).toBe('WOOD-OAK');
    });
  });

  describe('6. POST /api/purchase-receipts (Tạo mới phiếu nhập)', () => {
    const validBody = {
      supplier_id: 2,
      receipt_date: '2026-10-27',
      status: 'DRAFT',
      note: 'Nhập gỗ mới',
      items: [
        { raw_material_id: 10, quantity: 10, unit_price: 350000 },
      ],
    };

    test('trả về 400 khi dữ liệu đầu vào không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/purchase-receipts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ supplier_id: 0 });

      expect(res.status).toBe(400);
    });

    test('trả về 400 khi nhà cung cấp không hợp lệ hoặc đã ngừng hoạt động', async () => {
      validateSupplierForReceipt.mockResolvedValueOnce({
        isValid: false,
        message: 'Nhà cung cấp đang ở trạng thái ngừng hoạt động',
      });

      const res = await request(app)
        .post('/api/purchase-receipts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/ngừng hoạt động/);
    });

    test('trả về 400 khi nguyên vật liệu không tồn tại hoặc đã ngừng hoạt động', async () => {
      validateSupplierForReceipt.mockResolvedValueOnce({ isValid: true });
      findRawMaterialById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/purchase-receipts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/không tồn tại/);
    });

    test('trả về 409 khi mã phiếu nhập tự nhập đã tồn tại', async () => {
      validateSupplierForReceipt.mockResolvedValueOnce({ isValid: true });
      findRawMaterialById.mockResolvedValueOnce({ raw_material_id: 10, status: 'ACTIVE' });
      findReceiptByCode.mockResolvedValueOnce({ receipt_id: 1 });

      const res = await request(app)
        .post('/api/purchase-receipts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...validBody, receipt_code: 'RCP-DUPLICATE' });

      expect(res.status).toBe(409);
    });

    test('tạo phiếu nhập thành công (201)', async () => {
      validateSupplierForReceipt.mockResolvedValueOnce({ isValid: true });
      findRawMaterialById.mockResolvedValueOnce({ raw_material_id: 10, status: 'ACTIVE' });
      generateNextReceiptCode.mockResolvedValueOnce('RCP-20261027-0001');
      createReceiptWithItems.mockResolvedValueOnce(mockReceiptDetail);

      const res = await request(app)
        .post('/api/purchase-receipts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.receipt.receipt_code).toBe('RCP-20261027-0001');
    });
  });

  describe('6. PUT /api/purchase-receipts/:id (Cập nhật phiếu nhập nháp)', () => {
    test('trả về 404 khi không tìm thấy phiếu nhập', async () => {
      findReceiptById.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/purchase-receipts/999')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Cập nhật ghi chú' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Không tìm thấy/);
    });

    test('trả về 400 khi cố gắng sửa phiếu không phải trạng thái nháp (DRAFT)', async () => {
      findReceiptById.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .put('/api/purchase-receipts/1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Cố gắng sửa phiếu đã nhập kho' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Chỉ được phép chỉnh sửa phiếu nhập khi ở trạng thái nháp/);
    });

    test('cập nhật thành công phiếu nhập nháp (200)', async () => {
      findReceiptById.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'DRAFT',
      });
      findRawMaterialById.mockResolvedValueOnce({ raw_material_id: 10, status: 'ACTIVE' });
      updateReceiptWithItems.mockResolvedValueOnce({
        ...mockReceiptDetail,
        note: 'Đã cập nhật sau kiểm đếm',
      });

      const res = await request(app)
        .put('/api/purchase-receipts/1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          note: 'Đã cập nhật sau kiểm đếm',
          items: [{ raw_material_id: 10, quantity: 9, unit_price: 350000 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Cập nhật phiếu nhập/);
      expect(res.body.receipt.note).toBe('Đã cập nhật sau kiểm đếm');
    });
  });

  describe('7. POST /api/purchase-receipts/:id/confirm (Xác nhận nhập kho)', () => {
    test('trả về 400 nếu phiếu đã CONFIRMED trước đó', async () => {
      findReceiptById.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post('/api/purchase-receipts/1/confirm')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/đã được xác nhận/);
    });

    test('xác nhận nhập kho thành công (200)', async () => {
      findReceiptById.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'DRAFT',
      });
      updateReceiptWithItems.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post('/api/purchase-receipts/1/confirm')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.receipt.status).toBe('CONFIRMED');
    });
  });

  describe('8. POST /api/purchase-receipts/:id/cancel (Hủy phiếu nhập)', () => {
    test('trả về 400 nếu cố gắng hủy phiếu đã CONFIRMED', async () => {
      findReceiptById.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post('/api/purchase-receipts/1/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/không thể hủy/);
    });

    test('hủy phiếu nhập nháp thành công (200)', async () => {
      findReceiptById.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'DRAFT',
      });
      updateReceiptWithItems.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'CANCELLED',
      });

      const res = await request(app)
        .post('/api/purchase-receipts/1/cancel')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Hủy phiếu do NCC hết hàng' });

      expect(res.status).toBe(200);
      expect(res.body.receipt.status).toBe('CANCELLED');
    });
  });

  describe('9. DELETE /api/purchase-receipts/:id (Xóa phiếu nhập)', () => {
    test('trả về 400 khi cố gắng xóa phiếu đã CONFIRMED', async () => {
      findReceiptById.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .delete('/api/purchase-receipts/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không thể xóa phiếu nhập đã xác nhận/);
    });

    test('xóa thành công phiếu DRAFT (200)', async () => {
      findReceiptById.mockResolvedValueOnce({
        ...mockReceiptDetail,
        status: 'DRAFT',
      });
      deleteReceipt.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/purchase-receipts/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Xóa phiếu nhập thành công/);
    });
  });
});
