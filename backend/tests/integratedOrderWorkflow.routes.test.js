// =========================================================
// integratedOrderWorkflow.routes.test.js
// Unit tests kiểm thử xuyên suốt toàn bộ quy trình:
// SALES TẠO ORDER -> OWNER DUYỆT -> OWNER YÊU CẦU SỬA -> SALES SỬA -> OWNER CHỐT THIẾT KẾ
// -> SALES LẬP HỢP ĐỒNG -> OWNER PHÂN CÔNG LEADER -> LEADER TIẾP NHẬN -> LEADER SẢN XUẤT
// -> OWNER NGHIỆM THU (KHÔNG ĐẠT -> LÀM LẠI -> ĐẠT) -> SALES GIAO HÀNG -> COMPLETED
// =========================================================

jest.mock('../src/models/userAccount.model', () => ({
  UserAccount: {},
  getStaffLeaders: jest.fn(),
}));

jest.mock('../src/models/userRole.model', () => ({
  UserRole: {},
  findUserRoleByCode: jest.fn(),
  findUserRoleById: jest.fn(),
}));

jest.mock('../src/models/ProductModel', () => ({
  Product: {},
  findProductById: jest.fn(),
  getProductsWithPagination: jest.fn(),
  getProductMetadata: jest.fn(),
}));

jest.mock('../src/models/ContractModel', () => ({
  Contract: {},
  generateNextContractCode: jest.fn(),
  createOfflineContract: jest.fn(),
  signContract: jest.fn(),
  findContractById: jest.fn(),
  getContractsWithPagination: jest.fn(),
}));

jest.mock('../src/models/SaleRequestModel', () => ({
  getRequestsWithPagination: jest.fn(),
  findRequestById: jest.fn(),
  convertRequestToContract: jest.fn(),
  getCustomersForSales: jest.fn(),
  createSalesOrderRequest: jest.fn(),
  updateSalesOrderRequest: jest.fn(),
  reviewOrderRequest: jest.fn(),
}));

jest.mock('../src/models/CustomerOrderModel', () => ({
  CustomerOrder: {},
  generateNextOrderCode: jest.fn(),
  createOrderFromContract: jest.fn(),
  findOrderById: jest.fn(),
  getOrdersWithPagination: jest.fn(),
  cancelOrder: jest.fn(),
  updateOrderStatus: jest.fn(),
  assignLeaderToCustomerOrder: jest.fn(),
  leaderAcceptOrder: jest.fn(),
  leaderUpdateProgress: jest.fn(),
  leaderSubmitInspection: jest.fn(),
  ownerInspectOrder: jest.fn(),
  confirmDelivery: jest.fn(),
  completeDelivery: jest.fn(),
  getOrdersForLeader: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const { findUserRoleByCode } = require('../src/models/userRole.model');
const { getStaffLeaders } = require('../src/models/userAccount.model');
const {
  getCustomersForSales,
  createSalesOrderRequest,
  updateSalesOrderRequest,
  reviewOrderRequest,
  convertRequestToContract,
} = require('../src/models/SaleRequestModel');
const {
  signContract,
} = require('../src/models/ContractModel');
const {
  createOrderFromContract,
  assignLeaderToCustomerOrder,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
  ownerInspectOrder,
  confirmDelivery,
  completeDelivery,
  getOrdersForLeader,
} = require('../src/models/CustomerOrderModel');

describe('Quy trình đơn hàng tích hợp xuyên suốt FS-SIMS', () => {
  let salesToken;
  let ownerToken;
  let leaderToken;

  beforeAll(() => {
    // Role 1 = OWNER, Role 2 = SALES, Role 3 = LEADERSTAFF
    ownerToken = jwt.sign({ sub: 1, email: 'owner@fssims.local', role: 1 }, process.env.JWT_SECRET);
    salesToken = jwt.sign({ sub: 2, email: 'sales@fssims.local', role: 2 }, process.env.JWT_SECRET);
    leaderToken = jwt.sign({ sub: 3, email: 'leader@fssims.local', role: 3 }, process.env.JWT_SECRET);

    findUserRoleByCode.mockImplementation(async (code) => {
      if (code === 'OWNER') return { role_id: 1, role_code: 'OWNER' };
      if (code === 'SALES') return { role_id: 2, role_code: 'SALES' };
      if (code === 'LEADERSTAFF') return { role_id: 3, role_code: 'LEADERSTAFF' };
      return null;
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Sales lấy danh sách khách hàng phục vụ dropdown', async () => {
    getCustomersForSales.mockResolvedValue([
      { user_account_id: 11, full_name: 'Phạm Minh Khách', phone_number: '0900000011', email: 'cust1@fssims.local' },
    ]);

    const res = await request(app)
      .get('/api/sale-orders/customers')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].full_name).toBe('Phạm Minh Khách');
  });

  test('2. Sales tạo đơn đặt hàng mới với thông số kỹ thuật và hình ảnh', async () => {
    const mockCreated = {
      request_id: 101,
      request_code: 'RQ-20261106-0001',
      order_type: 'CUSTOM',
      status: 'PENDING',
      contact_name: 'Phạm Minh Khách',
      contact_phone: '0900000011',
      items: [
        { item_name: 'Bàn ăn gỗ sồi', length_cm: 180, width_cm: 90, height_cm: 75, quantity: 1, unit_price: 8000000 },
      ],
      images: [
        { image_url: 'https://res.cloudinary.com/fssims/image/upload/v1/design1.jpg' },
      ],
    };

    createSalesOrderRequest.mockResolvedValue(mockCreated);

    const res = await request(app)
      .post('/api/sale-orders/requests')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerAccountId: 11,
        contactName: 'Phạm Minh Khách',
        contactPhone: '0900000011',
        title: 'Đơn đặt bàn ăn gỗ sồi tùy chỉnh',
        items: [
          { itemName: 'Bàn ăn gỗ sồi', lengthCm: 180, widthCm: 90, heightCm: 75, quantity: 1, unitPrice: 8000000 },
        ],
        images: ['https://res.cloudinary.com/fssims/image/upload/v1/design1.jpg'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.requestCode).toBe('RQ-20261106-0001');
    expect(res.body.data.status).toBe('PENDING');
  });

  test('3. Owner xem xét yêu cầu và yêu cầu chỉnh sửa thiết kế', async () => {
    const mockReviewed = {
      request_id: 101,
      request_code: 'RQ-20261106-0001',
      status: 'REQUEST_CHANGE',
      staff_note: 'Cần bo tròn góc bàn và nâng độ dày mặt bàn',
    };

    reviewOrderRequest.mockResolvedValue(mockReviewed);

    const res = await request(app)
      .post('/api/order-management/requests/101/review')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        action: 'REQUEST_CHANGE',
        reason: 'Cần bo tròn góc bàn và nâng độ dày mặt bàn',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REQUEST_CHANGE');
  });

  test('4. Sales cập nhật lại thiết kế và gửi lại Owner duyệt', async () => {
    const mockUpdated = {
      request_id: 101,
      request_code: 'RQ-20261106-0001',
      status: 'PENDING',
      contact_name: 'Phạm Minh Khách',
      contact_phone: '0900000011',
      items: [
        { item_name: 'Bàn ăn gỗ sồi bo tròn góc', length_cm: 180, width_cm: 90, height_cm: 75, quantity: 1, unit_price: 8500000 },
      ],
    };

    updateSalesOrderRequest.mockResolvedValue(mockUpdated);

    const res = await request(app)
      .put('/api/sale-orders/requests/101')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        contactName: 'Phạm Minh Khách',
        contactPhone: '0900000011',
        title: 'Bàn ăn gỗ sồi bo tròn góc đã cập nhật',
        items: [
          { itemName: 'Bàn ăn gỗ sồi bo tròn góc', lengthCm: 180, widthCm: 90, heightCm: 75, quantity: 1, unitPrice: 8500000 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PENDING');
  });

  test('5. Owner duyệt và chốt thiết kế cuối cùng (khóa thiết kế)', async () => {
    const mockFinalized = {
      request_id: 101,
      request_code: 'RQ-20261106-0001',
      status: 'DESIGN_FINALIZED',
      approved_at: new Date(),
    };

    reviewOrderRequest.mockResolvedValue(mockFinalized);

    const res = await request(app)
      .post('/api/order-management/requests/101/review')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        action: 'FINALIZE_DESIGN',
        note: 'Chốt phương án thiết kế cuối cùng',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DESIGN_FINALIZED');
  });

  test('6. Sales lập hợp đồng từ đơn thiết kế đã chốt', async () => {
    convertRequestToContract.mockResolvedValue({
      contractId: 50,
      contractCode: 'HD-20261106-0001',
      requestCode: 'RQ-20261106-0001',
      totalAmount: 8500000,
      depositAmount: 2550000,
    });

    const res = await request(app)
      .post('/api/sale-orders/requests/101/convert-to-contract')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_name: 'Phạm Minh Khách',
        customer_phone: '0900000011',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.contractCode).toBe('HD-20261106-0001');
  });

  test('7. Ký hợp đồng và tạo Customer Order (CONFIRMED)', async () => {
    signContract.mockResolvedValue({
      contract_id: 50,
      status: 'SIGNED',
      contract_code: 'HD-20261106-0001',
      total_amount: 8500000,
    });

    const resSign = await request(app)
      .post('/api/sale-orders/contracts/50/sign')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ signed_place: 'Cửa hàng Góc Nhà' });

    expect(resSign.status).toBe(200);

    createOrderFromContract.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      order_type: 'CUSTOM',
      status: 'CONFIRMED',
      total_amount: 8500000,
    });

    const resOrder = await request(app)
      .post('/api/sale-orders/orders/from-contract/50')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(resOrder.status).toBe(201);
    expect(resOrder.body.data.orderCode).toBe('ORD-20261106-0001');
    expect(resOrder.body.data.status).toBe('CONFIRMED');
  });

  test('8. Owner phân công Tổ trưởng phụ trách đơn', async () => {
    assignLeaderToCustomerOrder.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      status: 'CONFIRMED',
      assigned_to: 3,
    });

    const res = await request(app)
      .post('/api/order-management/200/assign-leader')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ leaderId: 3 });

    expect(res.status).toBe(200);
    expect(res.body.order.assignedTo).toBe(3);
  });

  test('9. Leader xem đơn được giao và xác nhận tiếp nhận sản xuất', async () => {
    getOrdersForLeader.mockResolvedValue({
      orders: [{ order_id: 200, order_code: 'ORD-20261106-0001', status: 'CONFIRMED', assigned_to: 3 }],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
      itemsPerPage: 10,
    });

    const resList = await request(app)
      .get('/api/order-management/leader/orders')
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(resList.status).toBe(200);
    expect(resList.body.orders).toHaveLength(1);

    leaderAcceptOrder.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      status: 'IN_PRODUCTION',
      assigned_to: 3,
    });

    const resAccept = await request(app)
      .post('/api/order-management/leader/orders/200/accept')
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(resAccept.status).toBe(200);
    expect(resAccept.body.order.status).toBe('IN_PRODUCTION');
  });

  test('10. Leader gửi yêu cầu nghiệm thu lên Owner', async () => {
    leaderSubmitInspection.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      status: 'UNDER_INSPECTION',
      assigned_to: 3,
    });

    const res = await request(app)
      .post('/api/order-management/leader/orders/200/submit-inspection')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ note: 'Đã ráp xong khung và sơn hoàn thiện' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('UNDER_INSPECTION');
  });

  test('11. Owner nghiệm thu KHÔNG ĐẠT -> chuyển lại Leader sản xuất lại', async () => {
    ownerInspectOrder.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      status: 'IN_PRODUCTION',
      note: 'Nghiệm thu KHÔNG ĐẠT: Lớp sơn bóng mặt bàn chưa đều. Chuyển lại Tổ trưởng xử lý.',
    });

    const res = await request(app)
      .post('/api/order-management/200/inspection')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ result: 'FAILED', reason: 'Lớp sơn bóng mặt bàn chưa đều' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('IN_PRODUCTION');
  });

  test('12. Leader xử lý lại và gửi nghiệm thu lại', async () => {
    leaderSubmitInspection.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      status: 'UNDER_INSPECTION',
    });

    const res = await request(app)
      .post('/api/order-management/leader/orders/200/submit-inspection')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ note: 'Đã xoa nhám và sơn bóng lại 2 lớp đều màu' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('UNDER_INSPECTION');
  });

  test('13. Owner nghiệm thu ĐẠT -> chuyển đơn về Sales để giao hàng (READY_TO_DELIVER)', async () => {
    ownerInspectOrder.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      status: 'READY_TO_DELIVER',
      note: 'Nghiệm thu ĐẠT: Đạt tiêu chuẩn xuất xưởng Góc Nhà',
    });

    const res = await request(app)
      .post('/api/order-management/200/inspection')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ result: 'PASSED', note: 'Đạt tiêu chuẩn xuất xưởng Góc Nhà' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('READY_TO_DELIVER');
  });

  test('14. Sales xác nhận giao hàng (DELIVERING)', async () => {
    confirmDelivery.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      status: 'DELIVERING',
      delivery_address: '45 Lê Lợi, Quận 1, TP.HCM',
    });

    const res = await request(app)
      .post('/api/sale-orders/orders/200/deliver')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        delivered_date: '2026-11-08',
        delivery_address: '45 Lê Lợi, Quận 1, TP.HCM',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DELIVERING');
  });

  test('15. Sales xác nhận giao hàng thành công -> Hoàn tất đơn (COMPLETED)', async () => {
    completeDelivery.mockResolvedValue({
      order_id: 200,
      order_code: 'ORD-20261106-0001',
      status: 'COMPLETED',
      delivered_date: '2026-11-08',
    });

    const res = await request(app)
      .post('/api/sale-orders/orders/200/complete')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('COMPLETED');
  });
});
