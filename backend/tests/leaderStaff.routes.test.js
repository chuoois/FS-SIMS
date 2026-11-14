// =========================================================
// leaderStaff.routes.test.js
// Unit & Route tests cho API Quản lý Sản xuất của Tổ trưởng xưởng (LEADERSTAFF)
// Tuân thủ pattern mock của dự án (docs/TESTING_AND_DEBUGGING.md)
// =========================================================

// Mock models TRƯỚC khi require app
jest.mock('../src/models/userAccount.model', () => ({
  UserAccount: {},
  createUserAccount: jest.fn(),
  findUserAccountByEmail: jest.fn(),
  findUserAccountById: jest.fn(),
  getStaffLeaders: jest.fn(),
}));

jest.mock('../src/models/userRole.model', () => ({
  UserRole: {},
  findUserRoleByCode: jest.fn(),
  findUserRoleById: jest.fn(),
  getStaffRoles: jest.fn(),
}));

jest.mock('../src/models/CustomerOrderModel', () => ({
  CustomerOrder: {},
  getOrdersForLeader: jest.fn(),
  findOrderById: jest.fn(),
  leaderAcceptOrder: jest.fn(),
  leaderUpdateProgress: jest.fn(),
  leaderSubmitInspection: jest.fn(),
}));

jest.mock('../src/models/CustomerOrderImageModel', () => ({
  CustomerOrderImage: {},
}));

jest.mock('../src/models/ContractModel', () => ({
  Contract: {},
}));

jest.mock('../src/models/ContractItemModel', () => ({
  ContractItem: {},
}));

jest.mock('../src/models/CustomerOrderItemModel', () => ({
  CustomerOrderItem: {},
}));

jest.mock('../src/models/ProductModel', () => ({
  Product: {},
}));

jest.mock('../src/models/ProductionOrderModel', () => ({
  ProductionOrder: {},
}));

jest.mock('../src/models/MaterialIssueModel', () => ({
  MaterialIssue: {},
}));

jest.mock('../src/models/RawMaterialModel', () => ({
  RawMaterial: {},
}));

jest.mock('../src/models/OrderRequestModel', () => ({
  OrderRequest: {},
}));

jest.mock('../src/models/OrderRequestItemModel', () => ({
  OrderRequestItem: {},
}));

jest.mock('../src/models/OrderRequestImageModel', () => ({
  OrderRequestImage: {},
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const {
  getOrdersForLeader,
  findOrderById,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
} = require('../src/models/CustomerOrderModel');

// Helper mock order
function mockLeaderOrder(overrides = {}) {
  return {
    order_id: 1,
    order_code: 'ORD-20261114-0001',
    order_type: 'CUSTOM',
    contract_id: 10,
    contract: { contract_code: 'CON-20261114-0001' },
    contact_name: 'Nguyễn Văn Khách',
    contact_phone: '0901234567',
    delivery_address: '123 Đường Xưởng Mộc',
    total_amount: 25000000,
    deposit_amount: 10000000,
    paid_amount: 10000000,
    status: 'CONFIRMED',
    expected_date: '2026-12-01',
    assigned_to: 3,
    note: null,
    items: [
      {
        order_item_id: 101,
        item_name: 'Bàn ăn gỗ sồi 6 ghế',
        length_cm: 180,
        width_cm: 90,
        height_cm: 75,
        quantity: 1,
        unit_price: 25000000,
        material: { material_name: 'Gỗ Sồi Nga' },
        color: { color_name: 'Tự nhiên', hex_value: '#D2B48C' },
        description: 'Sơn PU 3 lớp chống thấm',
      },
    ],
    ...overrides,
  };
}

describe('Leader Staff API (/api/leader-staff)', () => {
  let leaderToken;
  let ownerToken;
  let unauthorizedRoleToken;

  beforeAll(() => {
    // Role 3 = LEADERSTAFF
    leaderToken = jwt.sign(
      { sub: 3, user_account_id: 3, email: 'leader@gocnha.vn', role: 3 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Role 1 = OWNER (cũng có quyền giám sát xưởng)
    ownerToken = jwt.sign(
      { sub: 1, user_account_id: 1, email: 'owner@gocnha.vn', role: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Role 99 = Vai trò không được phép truy cập xưởng
    unauthorizedRoleToken = jwt.sign(
      { sub: 99, user_account_id: 99, email: 'guest@gocnha.vn', role: 99 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Kiểm tra xác thực & phân quyền ────────────────────────
  describe('Xác thực & Phân quyền', () => {
    test('401 khi không gửi token', async () => {
      const res = await request(app).get('/api/leader-staff/orders');
      expect(res.status).toBe(401);
    });

    test('403 khi role không phải LEADERSTAFF hay OWNER', async () => {
      const res = await request(app)
        .get('/api/leader-staff/orders')
        .set('Authorization', `Bearer ${unauthorizedRoleToken}`);
      expect(res.status).toBe(403);
    });

    test('200 khi truy cập với token LEADERSTAFF hợp lệ', async () => {
      getOrdersForLeader.mockResolvedValueOnce({
        orders: [mockLeaderOrder()],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/leader-staff/orders')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/thành công/i);
      expect(res.body.orders).toHaveLength(1);
      expect(res.body.orders[0].orderCode).toBe('ORD-20261114-0001');
    });
  });

  // ── 2. GET /api/leader-staff/orders ──────────────────────────
  describe('GET /api/leader-staff/orders - Xem danh sách đơn hàng', () => {
    test('lọc theo trạng thái và tìm kiếm', async () => {
      getOrdersForLeader.mockResolvedValueOnce({
        orders: [mockLeaderOrder({ status: 'IN_PRODUCTION' })],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/leader-staff/orders?status=IN_PRODUCTION&search=Bàn')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(200);
      expect(getOrdersForLeader).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ status: 'IN_PRODUCTION', search: 'Bàn' })
      );
    });

    test('500 khi model ném lỗi', async () => {
      getOrdersForLeader.mockRejectedValueOnce(new Error('Lỗi truy vấn cơ sở dữ liệu'));

      const res = await request(app)
        .get('/api/leader-staff/orders')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Lỗi máy chủ/i);
    });
  });

  // ── 3. GET /api/leader-staff/orders/:id ───────────────────────
  describe('GET /api/leader-staff/orders/:id - Chi tiết bản vẽ & thông số', () => {
    test('400 khi mã đơn hàng không hợp lệ (NaN hoặc âm)', async () => {
      const res = await request(app)
        .get('/api/leader-staff/orders/abc')
        .set('Authorization', `Bearer ${leaderToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/không hợp lệ/i);
    });

    test('404 khi không tìm thấy đơn hàng', async () => {
      findOrderById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/leader-staff/orders/999')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Không tìm thấy/i);
    });

    test('200 trả về chi tiết sản phẩm, kích thước (DxRxC), chất liệu, màu sắc', async () => {
      findOrderById.mockResolvedValueOnce(mockLeaderOrder());

      const res = await request(app)
        .get('/api/leader-staff/orders/1')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.items[0].lengthCm).toBe(180);
      expect(res.body.order.items[0].widthCm).toBe(90);
      expect(res.body.order.items[0].heightCm).toBe(75);
      expect(res.body.order.items[0].materialName).toBe('Gỗ Sồi Nga');
      expect(res.body.order.items[0].colorName).toBe('Tự nhiên');
    });
  });

  // ── 4. POST /api/leader-staff/orders/:id/accept ──────────────
  describe('POST /api/leader-staff/orders/:id/accept - Tiếp nhận sản xuất', () => {
    test('400 khi ID đơn không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/leader-staff/orders/invalid/accept')
        .set('Authorization', `Bearer ${leaderToken}`);
      expect(res.status).toBe(400);
    });

    test('200 tiếp nhận sản xuất thành công', async () => {
      leaderAcceptOrder.mockResolvedValueOnce(
        mockLeaderOrder({ status: 'IN_PRODUCTION' })
      );

      const res = await request(app)
        .post('/api/leader-staff/orders/1/accept')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/thành công/i);
      expect(res.body.order.status).toBe('IN_PRODUCTION');
      expect(leaderAcceptOrder).toHaveBeenCalledWith(1, 3);
    });

    test('400 khi model ném lỗi nghiệp vụ (ví dụ đơn không ở trạng thái CONFIRMED)', async () => {
      leaderAcceptOrder.mockRejectedValueOnce(
        new Error('Chỉ có thể tiếp nhận đơn hàng đang ở trạng thái Chờ tiếp nhận (CONFIRMED).')
      );

      const res = await request(app)
        .post('/api/leader-staff/orders/1/accept')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Chỉ có thể tiếp nhận/i);
    });
  });

  // ── 5. POST /api/leader-staff/orders/:id/progress ────────────
  describe('POST /api/leader-staff/orders/:id/progress - Cập nhật tiến độ sản xuất', () => {
    test('200 đánh dấu ĐÃ HOÀN THÀNH gia công', async () => {
      leaderUpdateProgress.mockResolvedValueOnce(
        mockLeaderOrder({
          status: 'IN_PRODUCTION',
          note: '[PRODUCTION_DONE - 14/11/2026]: Tổ trưởng đánh dấu hoàn thành sản xuất. Đã sơn lót xong',
        })
      );

      const res = await request(app)
        .post('/api/leader-staff/orders/1/progress')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          isCompleted: true,
          progressNote: 'Đã sơn lót xong',
        });

      expect(res.status).toBe(200);
      expect(res.body.order.isProductionCompleted).toBe(true);
      expect(leaderUpdateProgress).toHaveBeenCalledWith(1, 3, {
        note: 'Đã sơn lót xong',
        isCompleted: true,
      });
    });

    test('200 đánh dấu CHƯA HOÀN THÀNH gia công', async () => {
      leaderUpdateProgress.mockResolvedValueOnce(
        mockLeaderOrder({
          status: 'IN_PRODUCTION',
          note: '[PRODUCTION_PENDING - 14/11/2026]: Chưa hoàn thành. Đang lắp bản lề',
        })
      );

      const res = await request(app)
        .post('/api/leader-staff/orders/1/progress')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          isCompleted: false,
          progressNote: 'Đang lắp bản lề',
        });

      expect(res.status).toBe(200);
      expect(res.body.order.isProductionCompleted).toBe(false);
    });
  });

  // ── 6. POST /api/leader-staff/orders/:id/submit-inspection ────
  describe('POST /api/leader-staff/orders/:id/submit-inspection - Nộp nghiệm thu / Nộp lại', () => {
    test('200 gửi yêu cầu nghiệm thu kèm ảnh thành phẩm thành công', async () => {
      leaderSubmitInspection.mockResolvedValueOnce(
        mockLeaderOrder({
          status: 'UNDER_INSPECTION',
          note: '[Gửi nghiệm thu]: Đã hoàn thiện xong toàn bộ',
        })
      );

      const res = await request(app)
        .post('/api/leader-staff/orders/1/submit-inspection')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          note: 'Đã hoàn thiện xong toàn bộ',
          images: ['https://cdn.example.com/finish-photo-1.jpg'],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/nghiệm thu/i);
      expect(res.body.order.status).toBe('UNDER_INSPECTION');
      expect(leaderSubmitInspection).toHaveBeenCalledWith(1, 3, {
        note: 'Đã hoàn thiện xong toàn bộ',
        images: ['https://cdn.example.com/finish-photo-1.jpg'],
      });
    });

    test('400 khi nộp nghiệm thu lúc đơn không ở trạng thái IN_PRODUCTION', async () => {
      leaderSubmitInspection.mockRejectedValueOnce(
        new Error('Chỉ có thể gửi nghiệm thu khi đơn hàng đang trong tiến trình sản xuất (IN_PRODUCTION).')
      );

      const res = await request(app)
        .post('/api/leader-staff/orders/1/submit-inspection')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ note: 'Thử gửi khi trạng thái sai' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Chỉ có thể gửi nghiệm thu/i);
    });
  });
});

