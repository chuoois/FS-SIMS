const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-fssims';

// Mock các model và dependencies
jest.mock('../src/models/userRole.model', () => ({
  findUserRoleByCode: jest.fn(),
  UserRole: {
    findOne: jest.fn(),
  },
}));

jest.mock('../src/models/userAccount.model', () => ({
  UserAccount: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../src/models/OrderRequestModel', () => {
  const actual = jest.requireActual('../src/models/OrderRequestModel');
  return {
    ...actual,
    OrderRequest: {
      ...actual.OrderRequest,
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAndCountAll: jest.fn(),
      create: jest.fn(),
      hasMany: jest.fn(),
      belongsTo: jest.fn(),
    },
  };
});

jest.mock('../src/models/OrderRequestItemModel', () => {
  const m = {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn(),
  };
  return { OrderRequestItem: m };
});

jest.mock('../src/models/OrderRequestImageModel', () => {
  const m = {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn(),
  };
  return { OrderRequestImage: m };
});

jest.mock('../src/models/ContractModel', () => {
  const m = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
  };
  return {
    Contract: m,
    generateNextContractCode: jest.fn().mockResolvedValue('HD-20261106-0001'),
    findContractById: jest.fn(),
    signContract: jest.fn(),
  };
});

jest.mock('../src/models/ContractItemModel', () => {
  const m = {
    bulkCreate: jest.fn(),
    findAll: jest.fn(),
  };
  return { ContractItem: m };
});

jest.mock('../src/models/CustomerOrderModel', () => {
  const actual = jest.requireActual('../src/models/CustomerOrderModel');
  return {
    ...actual,
    createOrderFromContract: jest.fn(),
    findOrderById: jest.fn(),
  };
});

const { UserAccount } = require('../src/models/userAccount.model');
const { UserRole } = require('../src/models/userRole.model');
const { OrderRequest } = require('../src/models/OrderRequestModel');
const { OrderRequestItem } = require('../src/models/OrderRequestItemModel');
const { OrderRequestImage } = require('../src/models/OrderRequestImageModel');
const { Contract } = require('../src/models/ContractModel');
const { ContractItem } = require('../src/models/ContractItemModel');
const CustomerOrderModel = require('../src/models/CustomerOrderModel');

const saleOrderRoutes = require('../src/routes/saleOrderRoutes');
const orderManagementRoutes = require('../src/routes/orderManagementRoutes');

const app = express();
app.use(express.json());
app.use('/api/sale-orders', saleOrderRoutes);
app.use('/api/order-management', orderManagementRoutes);

// Tạo tokens cho các vai trò
const salesToken = jwt.sign(
  { sub: 2, email: 'sales@fssims.local', full_name: 'Trần Thị Bán Hàng', role: 2 },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const ownerToken = jwt.sign(
  { sub: 1, email: 'owner@fssims.local', full_name: 'Nguyễn Văn Chủ', role: 1 },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const leaderToken = jwt.sign(
  { sub: 3, email: 'leader@fssims.local', full_name: 'Lê Văn Tổ Trưởng', role: 3 },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Quy trình đơn hàng tích hợp xuyên suốt FS-SIMS', () => {
  const mockCustomer = {
    user_account_id: 11,
    full_name: 'Phạm Minh Khách',
    phone_number: '0900000011',
    email: 'customer1@fssims.local',
    address: '45 Lê Lợi, Quận 1, TP.HCM',
  };

  const mockLeaderStaff = {
    user_account_id: 3,
    full_name: 'Lê Văn Tổ Trưởng',
    email: 'leader@fssims.local',
    phone_number: '0900000003',
  };

  let createdRequestId = 101;
  let mockRequestInstance;
  let mockOrderInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    const { findUserRoleByCode } = require('../src/models/userRole.model');
    findUserRoleByCode.mockImplementation((code) => {
      if (code === 'OWNER') return Promise.resolve({ role_id: 1, role_code: 'OWNER' });
      if (code === 'SALES') return Promise.resolve({ role_id: 2, role_code: 'SALES' });
      if (code === 'LEADERSTAFF') return Promise.resolve({ role_id: 3, role_code: 'LEADERSTAFF' });
      if (code === 'CUSTOMER') return Promise.resolve({ role_id: 4, role_code: 'CUSTOMER' });
      return Promise.resolve(null);
    });

    mockRequestInstance = {
      request_id: createdRequestId,
      request_code: 'RQ-20261106-0001',
      order_type: 'CUSTOM',
      customer_account_id: 11,
      contact_name: 'Phạm Minh Khách',
      contact_phone: '0900000011',
      contact_email: 'customer1@fssims.local',
      delivery_address: '45 Lê Lợi, Quận 1, TP.HCM',
      title: 'Tủ rượu gỗ sồi âm tường thiết kế',
      description: 'Làm theo kích thước phòng khách',
      status: 'PENDING',
      createdate: new Date(),
      modifiedate: new Date(),
      items: [
        {
          request_item_id: 1,
          request_id: createdRequestId,
          item_name: 'Tủ rượu gỗ sồi âm tường',
          length_cm: 200,
          width_cm: 60,
          height_cm: 220,
          quantity: 1,
          unit_price: 18000000,
          description: 'Gỗ sồi Mỹ, sơn PU bóng mờ',
        },
      ],
      images: [
        {
          request_image_id: 1,
          request_id: createdRequestId,
          image_url: 'https://example.com/drawing1.jpg',
          sort_order: 0,
        },
      ],
      update: jest.fn().mockImplementation(function (data) {
        Object.assign(this, data);
        return Promise.resolve(this);
      }),
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      toJSON: function () {
        return { ...this };
      },
    };

    mockOrderInstance = {
      order_id: 202,
      order_code: 'ORD-20261106-0001',
      order_type: 'CUSTOM',
      contract_id: 55,
      customer_account_id: 11,
      contact_name: 'Phạm Minh Khách',
      contact_phone: '0900000011',
      delivery_address: '45 Lê Lợi, Quận 1, TP.HCM',
      total_amount: 18000000,
      deposit_amount: 5400000,
      paid_amount: 5400000,
      status: 'CONFIRMED',
      assigned_to: null,
      note: '',
      items: [
        {
          order_item_id: 1,
          item_name: 'Tủ rượu gỗ sồi âm tường',
          length_cm: 200,
          width_cm: 60,
          height_cm: 220,
          quantity: 1,
          unit_price: 18000000,
        },
      ],
      update: jest.fn().mockImplementation(function (data) {
        Object.assign(this, data);
        return Promise.resolve(this);
      }),
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      toJSON: function () {
        return { ...this };
      },
    };
  });

  // 1. Sales lấy danh sách khách hàng
  test('1. Sales lấy danh sách khách hàng phục vụ dropdown', async () => {
    UserRole.findOne.mockResolvedValue({ role_id: 4, role_code: 'CUSTOMER' });
    UserAccount.findAll.mockResolvedValue([mockCustomer]);

    const res = await request(app)
      .get('/api/sale-orders/customers')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].fullName).toBe('Phạm Minh Khách');
  });

  // 2. Sales tạo Order Request mới
  test('2. Sales tạo đơn đặt hàng mới với thông số kỹ thuật và hình ảnh', async () => {
    OrderRequest.findOne.mockResolvedValue(null);
    OrderRequest.create.mockResolvedValue({ request_id: createdRequestId });
    OrderRequest.findByPk.mockResolvedValue(mockRequestInstance);

    const res = await request(app)
      .post('/api/sale-orders/requests')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerAccountId: 11,
        contactName: 'Phạm Minh Khách',
        contactPhone: '0900000011',
        deliveryAddress: '45 Lê Lợi, Quận 1, TP.HCM',
        title: 'Tủ rượu gỗ sồi âm tường thiết kế',
        description: 'Làm theo kích thước phòng khách',
        orderType: 'CUSTOM',
        items: [
          {
            itemName: 'Tủ rượu gỗ sồi âm tường',
            lengthCm: 200,
            widthCm: 60,
            heightCm: 220,
            quantity: 1,
            unitPrice: 18000000,
            technicalNotes: 'Gỗ sồi Mỹ, sơn PU bóng mờ',
          },
        ],
        images: ['https://example.com/drawing1.jpg'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].lengthCm).toBe(200);
  });

  // 3. Owner yêu cầu chỉnh sửa thiết kế
  test('3. Owner xem xét yêu cầu và yêu cầu chỉnh sửa thiết kế', async () => {
    OrderRequest.findByPk.mockResolvedValue(mockRequestInstance);

    const res = await request(app)
      .post(`/api/order-management/owner/requests/${createdRequestId}/review`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        action: 'REQUEST_CHANGE',
        reason: 'Cần giảm chiều cao tủ từ 220cm xuống 210cm để vừa trần thạch cao.',
      });

    expect(res.status).toBe(200);
    expect(mockRequestInstance.status).toBe('REQUEST_CHANGE');
    expect(mockRequestInstance.reject_reason).toContain('giảm chiều cao tủ từ 220cm xuống 210cm');
  });

  // 4. Sales cập nhật lại thiết kế
  test('4. Sales cập nhật lại thiết kế và gửi lại Owner duyệt', async () => {
    OrderRequest.findByPk.mockResolvedValue(mockRequestInstance);

    const res = await request(app)
      .put(`/api/sale-orders/requests/${createdRequestId}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        items: [
          {
            itemName: 'Tủ rượu gỗ sồi âm tường (đã hạ trần)',
            lengthCm: 200,
            widthCm: 60,
            heightCm: 210, // đã sửa theo yêu cầu
            quantity: 1,
            unitPrice: 17500000,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(mockRequestInstance.status).toBe('PENDING'); // Chuyển lại PENDING để Owner duyệt lại
  });

  // 5. Owner duyệt và chốt thiết kế cuối cùng
  test('5. Owner duyệt và chốt thiết kế cuối cùng (khóa thiết kế)', async () => {
    OrderRequest.findByPk.mockResolvedValue(mockRequestInstance);

    const res = await request(app)
      .post(`/api/order-management/owner/requests/${createdRequestId}/review`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        action: 'FINALIZE_DESIGN',
        note: 'Đã chuẩn quy cách trần, duyệt sản xuất theo bản vẽ số 2.',
      });

    expect(res.status).toBe(200);
    expect(mockRequestInstance.status).toBe('DESIGN_FINALIZED');
  });

  // 6. Sales lập hợp đồng từ đơn thiết kế đã chốt
  test('6. Sales lập hợp đồng từ đơn thiết kế đã chốt', async () => {
    mockRequestInstance.status = 'DESIGN_FINALIZED';
    OrderRequest.findByPk.mockResolvedValue(mockRequestInstance);
    Contract.create.mockResolvedValue({
      contract_id: 55,
      contract_code: 'HD-20261106-0001',
    });

    const res = await request(app)
      .post(`/api/sale-orders/requests/${createdRequestId}/convert-to-contract`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        depositAmount: 5400000,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.contractCode).toBe('HD-20261106-0001');
    expect(mockRequestInstance.status).toBe('CONVERTED');
  });

  // 7. Ký hợp đồng và tạo Customer Order
  test('7. Ký hợp đồng và tạo Customer Order (CONFIRMED)', async () => {
    CustomerOrderModel.createOrderFromContract.mockResolvedValue(mockOrderInstance);

    const res = await request(app)
      .post('/api/sale-orders/orders/from-contract/55')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  // 8. Owner phân công Leader phụ trách
  test('8. Owner phân công Tổ trưởng phụ trách đơn', async () => {
    CustomerOrderModel.CustomerOrder.findByPk = jest.fn().mockResolvedValue(mockOrderInstance);
    CustomerOrderModel.findOrderById = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ...mockOrderInstance,
        assigned_to: 3,
        leader: mockLeaderStaff,
      });
    });
    UserAccount.findByPk.mockResolvedValue(mockLeaderStaff);

    const res = await request(app)
      .post('/api/order-management/orders/202/assign-leader')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ leaderId: 3 });

    expect(res.status).toBe(200);
    expect(mockOrderInstance.assigned_to).toBe(3);
  });

  // 9. Leader tiếp nhận sản xuất
  test('9. Leader xem đơn được giao và xác nhận tiếp nhận sản xuất', async () => {
    mockOrderInstance.assigned_to = 3;
    CustomerOrderModel.CustomerOrder.findByPk = jest.fn().mockResolvedValue(mockOrderInstance);
    CustomerOrderModel.findOrderById = jest.fn().mockImplementation(() => {
      return Promise.resolve(mockOrderInstance);
    });

    const res = await request(app)
      .post('/api/order-management/leader/orders/202/accept')
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(res.status).toBe(200);
    expect(mockOrderInstance.status).toBe('IN_PRODUCTION');
  });

  // 10. Leader gửi yêu cầu nghiệm thu
  test('10. Leader gửi yêu cầu nghiệm thu lên Owner', async () => {
    mockOrderInstance.status = 'IN_PRODUCTION';
    mockOrderInstance.assigned_to = 3;
    CustomerOrderModel.CustomerOrder.findByPk = jest.fn().mockResolvedValue(mockOrderInstance);
    CustomerOrderModel.findOrderById = jest.fn().mockImplementation(() => {
      return Promise.resolve(mockOrderInstance);
    });

    const res = await request(app)
      .post('/api/order-management/leader/orders/202/submit-inspection')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ note: 'Đã hoàn thiện mộc và sơn lót, xin nghiệm thu đợt 1' });

    expect(res.status).toBe(200);
    expect(mockOrderInstance.status).toBe('UNDER_INSPECTION');
  });

  // 11. Owner từ chối nghiệm thu
  test('11. Owner nghiệm thu KHÔNG ĐẠT -> chuyển lại Leader sản xuất lại', async () => {
    mockOrderInstance.status = 'UNDER_INSPECTION';
    CustomerOrderModel.CustomerOrder.findByPk = jest.fn().mockResolvedValue(mockOrderInstance);
    CustomerOrderModel.findOrderById = jest.fn().mockImplementation(() => {
      return Promise.resolve(mockOrderInstance);
    });

    const res = await request(app)
      .post('/api/order-management/orders/202/inspect')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        passed: false,
        rejectReason: 'Nước sơn còn vệt mờ ở cạnh hông phải, cần đánh bóng lại.',
      });

    expect(res.status).toBe(200);
    expect(mockOrderInstance.status).toBe('IN_PRODUCTION');
    expect(mockOrderInstance.note).toContain('Nghiệm thu KHÔNG ĐẠT');
  });

  // 12. Leader gửi nghiệm thu lại
  test('12. Leader xử lý lại và gửi nghiệm thu lại', async () => {
    mockOrderInstance.status = 'IN_PRODUCTION';
    mockOrderInstance.assigned_to = 3;
    CustomerOrderModel.CustomerOrder.findByPk = jest.fn().mockResolvedValue(mockOrderInstance);
    CustomerOrderModel.findOrderById = jest.fn().mockImplementation(() => {
      return Promise.resolve(mockOrderInstance);
    });

    const res = await request(app)
      .post('/api/order-management/leader/orders/202/submit-inspection')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ note: 'Đã chà nhám và phun bóng lại cạnh hông đạt chuẩn.' });

    expect(res.status).toBe(200);
    expect(mockOrderInstance.status).toBe('UNDER_INSPECTION');
  });

  // 13. Owner duyệt nghiệm thu ĐẠT
  test('13. Owner nghiệm thu ĐẠT -> chuyển đơn về Sales để giao hàng (READY_TO_DELIVER)', async () => {
    mockOrderInstance.status = 'UNDER_INSPECTION';
    CustomerOrderModel.CustomerOrder.findByPk = jest.fn().mockResolvedValue(mockOrderInstance);
    CustomerOrderModel.findOrderById = jest.fn().mockImplementation(() => {
      return Promise.resolve(mockOrderInstance);
    });

    const res = await request(app)
      .post('/api/order-management/orders/202/inspect')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ passed: true });

    expect(res.status).toBe(200);
    expect(mockOrderInstance.status).toBe('READY_TO_DELIVER');
  });

  // 14. Sales xác nhận giao hàng
  test('14. Sales xác nhận giao hàng (DELIVERING)', async () => {
    mockOrderInstance.status = 'READY_TO_DELIVER';
    CustomerOrderModel.CustomerOrder.findByPk = jest.fn().mockResolvedValue(mockOrderInstance);
    CustomerOrderModel.findOrderById = jest.fn().mockImplementation(() => {
      return Promise.resolve(mockOrderInstance);
    });

    const res = await request(app)
      .post('/api/sale-orders/orders/202/deliver')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        deliveryAddress: '45 Lê Lợi, Quận 1, TP.HCM',
        deliveryDate: '2026-11-08',
        note: 'Giao buổi sáng',
      });

    expect(res.status).toBe(200);
    expect(mockOrderInstance.status).toBe('DELIVERING');
  });

  // 15. Sales xác nhận giao thành công -> COMPLETED
  test('15. Sales xác nhận giao hàng thành công -> Hoàn tất đơn (COMPLETED)', async () => {
    mockOrderInstance.status = 'DELIVERING';
    CustomerOrderModel.CustomerOrder.findByPk = jest.fn().mockResolvedValue(mockOrderInstance);
    CustomerOrderModel.findOrderById = jest.fn().mockImplementation(() => {
      return Promise.resolve(mockOrderInstance);
    });

    const res = await request(app)
      .post('/api/sale-orders/orders/202/complete')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(mockOrderInstance.status).toBe('COMPLETED');
  });
});
