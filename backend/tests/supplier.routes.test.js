// =========================================================
// supplier.routes.test.js
// Unit tests & Route tests cho API Quản lý Nhà cung cấp (Manage Suppliers)
// Mock Model theo đúng pattern của dự án (docs/TESTING_AND_DEBUGGING.md)
// =========================================================

// 1. Mock DB models trước khi require app
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
  generateNextSupplierCode: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const {
  findSupplierById,
  findSupplierByCode,
  getSuppliersWithPagination,
  getSupplierWithReceiptHistory,
  countMaterialReceiptsBySupplierId,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getActiveSuppliers,
  generateNextSupplierCode,
} = require('../src/models/SupplierModel');

const { findUserRoleByCode } = require('../src/models/userRole.model');

describe('Manage Suppliers API (/api/suppliers)', () => {
  const OWNER_ROLE_ID = 1;
  const SALES_ROLE_ID = 2;

  const ownerToken = jwt.sign(
    { sub: 1, email: 'owner@fssims.com', role: OWNER_ROLE_ID },
    process.env.JWT_SECRET,
  );
  const salesToken = jwt.sign(
    { sub: 2, email: 'sales@fssims.com', role: SALES_ROLE_ID },
    process.env.JWT_SECRET,
  );

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

  // =========================================================
  // Phân quyền (Authentication & Authorization)
  // =========================================================
  describe('Phân quyền truy cập (Role Authorization)', () => {
    test('trả về 401 khi không truyền Authorization header', async () => {
      const res = await request(app).get('/api/suppliers');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Yêu cầu xác thực/);
    });

    test('trả về 403 khi người dùng không có vai trò OWNER (ví dụ SALES)', async () => {
      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Bạn không có quyền truy cập chức năng này/);
    });
  });

  // =========================================================
  // 1. GET /api/suppliers - Danh sách, tìm kiếm, lọc, phân trang
  // =========================================================
  describe('GET /api/suppliers', () => {
    test('trả về 200 và danh sách nhà cung cấp kèm phân trang', async () => {
      const mockSuppliers = [
        {
          supplier_id: 1,
          supplier_code: 'NCC_ANCUONG',
          supplier_name: 'Công ty Gỗ An Cường',
          phone_number: '02838629999',
          address: 'Bình Dương',
          status: 'ACTIVE',
          createdate: '2026-01-10T08:00:00.000Z',
        },
      ];

      getSuppliersWithPagination.mockResolvedValue({
        suppliers: mockSuppliers,
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/suppliers?search=An%20Cuong&status=ACTIVE&page=1&limit=10')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Lấy danh sách nhà cung cấp thành công');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].supplier_code).toBe('NCC_ANCUONG');
      expect(res.body.pagination).toEqual({
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });
    });
  });

  // =========================================================
  // 2. GET /api/suppliers/active - Danh sách NCC đang ACTIVE
  // =========================================================
  describe('GET /api/suppliers/active', () => {
    test('trả về 200 và danh sách nhà cung cấp có status ACTIVE', async () => {
      getActiveSuppliers.mockResolvedValue([
        {
          supplier_id: 1,
          supplier_code: 'NCC_ANCUONG',
          supplier_name: 'Công ty Gỗ An Cường',
          status: 'ACTIVE',
        },
      ]);

      const res = await request(app)
        .get('/api/suppliers/active')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suppliers).toHaveLength(1);
      expect(res.body.suppliers[0].status).toBe('ACTIVE');
    });
  });

  // =========================================================
  // 2b. GET /api/suppliers/next-code - Lấy mã tự động tiếp theo
  // =========================================================
  describe('GET /api/suppliers/next-code', () => {
    test('trả về 200 và mã NCC được tự động sinh (VD: NCC001)', async () => {
      generateNextSupplierCode.mockResolvedValue('NCC001');

      const res = await request(app)
        .get('/api/suppliers/next-code')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.nextCode).toBe('NCC001');
    });
  });

  // =========================================================
  // 3. GET /api/suppliers/:id - Xem chi tiết & lịch sử phiếu nhập
  // =========================================================
  describe('GET /api/suppliers/:id', () => {
    test('trả về 400 khi id không phải số hợp lệ', async () => {
      const res = await request(app)
        .get('/api/suppliers/abc')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(400);
    });

    test('trả về 404 khi không tìm thấy nhà cung cấp', async () => {
      getSupplierWithReceiptHistory.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/suppliers/999')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Không tìm thấy thông tin/);
    });

    test('trả về 200 và chi tiết nhà cung cấp kèm lịch sử phiếu nhập', async () => {
      getSupplierWithReceiptHistory.mockResolvedValue({
        supplier_id: 1,
        supplier_code: 'NCC_ANCUONG',
        supplier_name: 'Công ty Gỗ An Cường',
        phone_number: '02838629999',
        address: 'Bình Dương',
        status: 'ACTIVE',
        materialReceiptSupplierIdRecords: [
          {
            receipt_id: 101,
            receipt_code: 'PNK_2026_001',
            receipt_date: '2026-03-01',
            total_amount: 50000000,
            status: 'CONFIRMED',
          },
        ],
      });

      const res = await request(app)
        .get('/api/suppliers/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.supplier.supplier_code).toBe('NCC_ANCUONG');
      expect(res.body.supplier.totalReceipts).toBe(1);
      expect(res.body.supplier.materialReceipts[0].receipt_code).toBe('PNK_2026_001');
    });
  });

  // =========================================================
  // 4. POST /api/suppliers - Thêm mới nhà cung cấp
  // =========================================================
  describe('POST /api/suppliers', () => {
    test('trả về 400 khi thiếu tên nhà cung cấp', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ phone_number: '0901234567' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Tên nhà cung cấp là bắt buộc/);
    });

    test('tự động sinh mã NCC khi không truyền supplier_code', async () => {
      generateNextSupplierCode.mockResolvedValue('NCC005');
      createSupplier.mockResolvedValue({
        supplier_id: 5,
        supplier_code: 'NCC005',
        supplier_name: 'NCC Tự Động Sinh Mã',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ supplier_name: 'NCC Tự Động Sinh Mã' });

      expect(res.status).toBe(201);
      expect(res.body.supplier.supplier_code).toBe('NCC005');
      expect(generateNextSupplierCode).toHaveBeenCalled();
    });

    // TEST CASE ĐẶC BIỆT: Trùng mã nhà cung cấp trả 409
    test('trả về 409 Conflict khi trùng mã nhà cung cấp (duplicate supplier_code)', async () => {
      // Giả lập mã đã tồn tại trong DB
      findSupplierByCode.mockResolvedValue({
        supplier_id: 1,
        supplier_code: 'NCC_ANCUONG',
        supplier_name: 'Công ty Gỗ An Cường',
      });

      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          supplier_code: 'NCC_ANCUONG',
          supplier_name: 'Công ty Gỗ An Cường Chi nhánh 2',
          phone_number: '02838629999',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Mã nhà cung cấp 'NCC_ANCUONG' đã tồn tại/);
    });

    test('trả về 201 Created khi dữ liệu hợp lệ và mã chưa tồn tại', async () => {
      findSupplierByCode.mockResolvedValue(null);
      createSupplier.mockResolvedValue({
        supplier_id: 2,
        supplier_code: 'NCC_MINHLONG',
        supplier_name: 'Công ty Gỗ Minh Long',
        phone_number: '02438383838',
        address: 'Hà Nội',
        note: 'Cung cấp gỗ công nghiệp',
        status: 'ACTIVE',
        createby: 'owner@fssims.com',
      });

      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          supplier_code: 'NCC_MINHLONG',
          supplier_name: 'Công ty Gỗ Minh Long',
          phone_number: '02438383838',
          address: 'Hà Nội',
          note: 'Cung cấp gỗ công nghiệp',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Tạo nhà cung cấp mới thành công');
      expect(res.body.supplier.supplier_code).toBe('NCC_MINHLONG');
      expect(res.body.supplier.status).toBe('ACTIVE');
    });
  });

  // =========================================================
  // 5. PUT /api/suppliers/:id - Cập nhật nhà cung cấp
  // =========================================================
  describe('PUT /api/suppliers/:id', () => {
    test('trả về 400 khi client cố tình sửa mã nhà cung cấp (supplier_code)', async () => {
      const res = await request(app)
        .put('/api/suppliers/1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          supplier_code: 'NEW_CODE',
          supplier_name: 'Tên mới',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không được phép thay đổi mã nhà cung cấp/);
    });

    test('trả về 404 khi không tìm thấy nhà cung cấp để cập nhật', async () => {
      findSupplierById.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/suppliers/999')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ supplier_name: 'Tên mới' });

      expect(res.status).toBe(404);
    });

    test('trả về 200 và cập nhật thành công các trường được phép', async () => {
      findSupplierById.mockResolvedValue({
        supplier_id: 1,
        supplier_code: 'NCC_ANCUONG',
        supplier_name: 'An Cường',
      });

      updateSupplier.mockResolvedValue({
        supplier_id: 1,
        supplier_code: 'NCC_ANCUONG',
        supplier_name: 'Công ty Cổ phần Gỗ An Cường',
        phone_number: '02838629999',
        address: 'Bình Dương mới',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .put('/api/suppliers/1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          supplier_name: 'Công ty Cổ phần Gỗ An Cường',
          address: 'Bình Dương mới',
        });

      expect(res.status).toBe(200);
      expect(res.body.supplier.supplier_name).toBe('Công ty Cổ phần Gỗ An Cường');
    });
  });

  // =========================================================
  // 6. DELETE /api/suppliers/:id - Xóa nhà cung cấp
  // =========================================================
  describe('DELETE /api/suppliers/:id', () => {
    test('trả về 404 khi không tìm thấy nhà cung cấp để xóa', async () => {
      findSupplierById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/suppliers/999')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    // TEST CASE ĐẶC BIỆT: Xóa khi đã có phiếu nhập -> 409 Conflict & gợi ý chuyển INACTIVE
    test('trả về 409 Conflict và gợi ý chuyển INACTIVE khi nhà cung cấp đã có phiếu nhập kho', async () => {
      findSupplierById.mockResolvedValue({
        supplier_id: 1,
        supplier_code: 'NCC_ANCUONG',
        supplier_name: 'Công ty Gỗ An Cường',
      });

      // Giả lập NCC đã có 3 phiếu nhập
      countMaterialReceiptsBySupplierId.mockResolvedValue(3);

      const res = await request(app)
        .delete('/api/suppliers/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.receiptCount).toBe(3);
      expect(res.body.suggestAction).toBe('INACTIVE');
      expect(res.body.message).toMatch(/Không thể xóa vì nhà cung cấp/);
      expect(res.body.message).toMatch(/đã phát sinh 3 phiếu nhập kho/);
      expect(res.body.message).toMatch(/chuyển trạng thái sang INACTIVE/);

      // Đảm bảo hàm delete không được gọi
      expect(deleteSupplier).not.toHaveBeenCalled();
    });

    test('trả về 200 và xóa thành công khi nhà cung cấp chưa có phiếu nhập nào', async () => {
      findSupplierById.mockResolvedValue({
        supplier_id: 2,
        supplier_code: 'NCC_MOI',
        supplier_name: 'NCC Mới Chưa Nhập Hàng',
      });

      // 0 phiếu nhập
      countMaterialReceiptsBySupplierId.mockResolvedValue(0);
      deleteSupplier.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/suppliers/2')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Xóa nhà cung cấp thành công');
      expect(deleteSupplier).toHaveBeenCalledWith(2);
    });
  });
});
