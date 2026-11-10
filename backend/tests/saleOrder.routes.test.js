// =========================================================
// saleOrder.routes.test.js
// Route tests cho API Bán hàng & Tạo đơn hàng (/api/sale-orders)
// Controller riêng biệt cho Role Sale POS
// Mock Models theo đúng pattern dự án (docs/TESTING_AND_DEBUGGING.md)
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

jest.mock('../src/models/ProductModel', () => ({
  Product: {},
  findProductById: jest.fn(),
  findProductByCode: jest.fn(),
  getProductsWithPagination: jest.fn(),
  getProductMetadata: jest.fn(),
}));

jest.mock('../src/models/ContractModel', () => ({
  Contract: {},
  generateNextContractCode: jest.fn(),
  createOfflineContract: jest.fn(),
  signContract: jest.fn(),
  findContractById: jest.fn(),
  findContractByCode: jest.fn(),
  getContractsWithPagination: jest.fn(),
}));

jest.mock('../src/models/SaleRequestModel', () => ({
  getRequestsWithPagination: jest.fn(),
  findRequestById: jest.fn(),
  convertRequestToContract: jest.fn(),
  updateDesignFile: jest.fn(),
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

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const { findUserRoleByCode } = require('../src/models/userRole.model');
const { getProductsWithPagination, findProductById } = require('../src/models/ProductModel');
const { createOfflineContract, signContract } = require('../src/models/ContractModel');
const { createOrderFromContract, getOrdersWithPagination } = require('../src/models/CustomerOrderModel');
const {
  getRequestsWithPagination,
  findRequestById: findSaleRequestById,
  convertRequestToContract,
  updateDesignFile,
} = require('../src/models/SaleRequestModel');

const SALES_ROLE_ID = 2;
const salesToken = jwt.sign(
  { sub: 5, email: 'sale@fssims.com', role: SALES_ROLE_ID },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const OWNER_ROLE_ID = 1;
const ownerToken = jwt.sign(
  { sub: 1, email: 'owner@fssims.com', role: OWNER_ROLE_ID },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Sale Orders API (/api/sale-orders)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findUserRoleByCode.mockImplementation(async (code) => {
      if (code === 'SALES') return { role_id: 2, role_code: 'SALES' };
      if (code === 'OWNER') return { role_id: 1, role_code: 'OWNER' };
      return null;
    });
  });

  describe('GET /api/sale-orders/products', () => {
    test('trả về 200 và danh sách sản phẩm trong kho cho POS', async () => {
      getProductsWithPagination.mockResolvedValue({
        products: [
          {
            product_id: 1,
            product_code: 'PRD-0001',
            product_name: 'Bàn ăn cao cấp',
            price: 5000000,
            stock_quantity: 10,
            status: 'ACTIVE',
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 12,
      });

      const res = await request(app)
        .get('/api/sale-orders/products')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].productCode).toBe('PRD-0001');
      expect(res.body.data[0].stockQuantity).toBe(10);
    });
  });

  describe('GET /api/sale-orders/products/:id', () => {
    test('trả về 200 và chi tiết sản phẩm cho POS', async () => {
      findProductById.mockResolvedValue({
        product_id: 1,
        product_code: 'PRD-0001',
        product_name: 'Bàn ăn cao cấp',
        price: 5000000,
        stock_quantity: 10,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .get('/api/sale-orders/products/1')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.productName).toBe('Bàn ăn cao cấp');
    });

    test('trả về 404 khi không tìm thấy sản phẩm', async () => {
      findProductById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/sale-orders/products/999')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Không tìm thấy sản phẩm/);
    });
  });

  describe('POST /api/sale-orders/contracts', () => {
    test('trả về 400 nếu dữ liệu khách hàng không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/sale-orders/contracts')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ customer_name: '', customer_phone: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Họ tên khách hàng là bắt buộc/);
    });

    test('trả về 201 khi tạo hợp đồng tại quầy thành công', async () => {
      const mockContract = {
        contract_id: 10,
        contract_code: 'HD-20261028-0001',
        source: 'OFFLINE',
        contract_type: 'READY',
        customer_name: 'Nguyễn Văn A',
        customer_phone: '0912345678',
        total_amount: 5000000,
        deposit_amount: 1000000,
        status: 'DRAFT',
        items: [
          {
            contract_item_id: 1,
            product_id: 1,
            item_name: 'Bàn ăn cao cấp',
            quantity: 1,
            unit_price: 5000000,
          },
        ],
      };

      createOfflineContract.mockResolvedValue(mockContract);

      const res = await request(app)
        .post('/api/sale-orders/contracts')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customer_name: 'Nguyễn Văn A',
          customer_phone: '0912345678',
          deposit_amount: 1000000,
          items: [{ product_id: 1, quantity: 1, unit_price: 5000000 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.contractCode).toBe('HD-20261028-0001');
      expect(res.body.data.status).toBe('DRAFT');
    });
  });

  describe('POST /api/sale-orders/contracts/:id/sign', () => {
    test('trả về 200 khi chốt và ký hợp đồng thành công', async () => {
      const mockSigned = {
        contract_id: 10,
        contract_code: 'HD-20261028-0001',
        status: 'SIGNED',
        signed_date: '2026-10-28',
        customer_name: 'Nguyễn Văn A',
        customer_phone: '0912345678',
        total_amount: 5000000,
        deposit_amount: 1000000,
        items: [],
      };

      signContract.mockResolvedValue(mockSigned);

      const res = await request(app)
        .post('/api/sale-orders/contracts/10/sign')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ signed_place: 'Cửa hàng Góc Nhà' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SIGNED');
    });
  });

  describe('POST /api/sale-orders/orders/from-contract/:contractId', () => {
    test('trả về 201 khi tạo đơn hàng từ hợp đồng đã ký', async () => {
      const mockOrder = {
        order_id: 100,
        order_code: 'ORD-20261028-0001',
        order_type: 'READY',
        contract_id: 10,
        contact_name: 'Nguyễn Văn A',
        contact_phone: '0912345678',
        total_amount: 5000000,
        deposit_amount: 1000000,
        paid_amount: 1000000,
        status: 'CONFIRMED',
        items: [],
      };

      createOrderFromContract.mockResolvedValue(mockOrder);

      const res = await request(app)
        .post('/api/sale-orders/orders/from-contract/10')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.orderCode).toBe('ORD-20261028-0001');
      expect(res.body.data.status).toBe('CONFIRMED');
    });
  });

  describe('GET /api/sale-orders/orders', () => {
    test('trả về 200 và danh sách đơn hàng', async () => {
      getOrdersWithPagination.mockResolvedValue({
        orders: [
          {
            order_id: 100,
            order_code: 'ORD-20261028-0001',
            contact_name: 'Nguyễn Văn A',
            contact_phone: '0912345678',
            total_amount: 5000000,
            status: 'CONFIRMED',
            items: [],
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/sale-orders/orders')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/sale-orders/requests', () => {
    test('trả về 200 và danh sách yêu cầu của khách hàng', async () => {
      getRequestsWithPagination.mockResolvedValue({
        requests: [
          {
            request_id: 1,
            request_code: 'RQ-20261103-0001',
            order_type: 'READY',
            contact_name: 'Nguyễn Văn A',
            contact_phone: '0912345678',
            status: 'PENDING',
            createdate: '2026-11-03T10:00:00.000Z',
            items: [],
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/sale-orders/requests')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].requestCode).toBe('RQ-20261103-0001');
    });
  });

  describe('GET /api/sale-orders/requests/:id', () => {
    test('trả về 200 và chi tiết yêu cầu', async () => {
      findSaleRequestById.mockResolvedValue({
        request_id: 1,
        request_code: 'RQ-20261103-0001',
        order_type: 'READY',
        contact_name: 'Nguyễn Văn A',
        contact_phone: '0912345678',
        status: 'PENDING',
        items: [],
      });

      const res = await request(app)
        .get('/api/sale-orders/requests/1')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.requestCode).toBe('RQ-20261103-0001');
    });

    test('trả về 404 khi không tìm thấy yêu cầu', async () => {
      findSaleRequestById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/sale-orders/requests/999')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/sale-orders/requests/:id/convert-to-contract', () => {
    test('trả về 201 khi chuyển đổi yêu cầu thành hợp đồng thành công', async () => {
      convertRequestToContract.mockResolvedValue({
        contractId: 50,
        contractCode: 'HD-20261103-0050',
        requestCode: 'RQ-20261103-0001',
        totalAmount: 15000000,
        depositAmount: 4500000,
      });

      const res = await request(app)
        .post('/api/sale-orders/requests/1/convert-to-contract')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          deposit_amount: 4500000,
          signed_place: 'Cửa hàng Góc Nhà',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.contractCode).toBe('HD-20261103-0050');
    });
  });

  describe('PATCH /api/sale-orders/requests/:id/design', () => {
    test('trả về 200 khi Chủ xưởng cập nhật bản thiết kế và mô tả thành công', async () => {
      updateDesignFile.mockResolvedValue({
        request_id: 1,
        description: 'Bản vẽ CAD hoàn chỉnh',
        images: [{ imageId: 1, imageUrl: 'https://cloudinary.com/design.png' }],
      });

      const res = await request(app)
        .patch('/api/sale-orders/requests/1/design')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          description: 'Bản vẽ CAD hoàn chỉnh',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Bản vẽ CAD hoàn chỉnh');
    });

    test('trả về 200 khi Chủ xưởng gửi bản thiết kế và mô tả cho từng sản phẩm (request_item_id)', async () => {
      updateDesignFile.mockResolvedValue({
        request_id: 1,
        items: [
          {
            request_item_id: 101,
            item_name: 'Bàn ăn 6 ghế',
            description: 'Khung gỗ sồi, mặt đá vân mây 180x90cm',
            images: [{ request_image_id: 1, image_url: 'https://cloudinary.com/item101-design.png', sort_order: 1 }],
          },
        ],
      });

      const res = await request(app)
        .patch('/api/sale-orders/requests/1/design')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          request_item_id: 101,
          description: 'Khung gỗ sồi, mặt đá vân mây 180x90cm',
        });

      expect(res.status).toBe(200);
      expect(updateDesignFile).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          requestItemId: 101,
          description: 'Khung gỗ sồi, mặt đá vân mây 180x90cm',
        })
      );
      expect(res.body.data.items[0].itemName).toBe('Bàn ăn 6 ghế');
      expect(res.body.data.items[0].images).toHaveLength(1);
    });

    test('trả về 403 khi Sale cố tình gọi API gửi bản thiết kế', async () => {
      const res = await request(app)
        .patch('/api/sale-orders/requests/1/design')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          design_note: 'Thử gửi',
        });

      expect(res.status).toBe(403);
    });

    test('trả về 400 khi mã request id không hợp lệ', async () => {
      const res = await request(app)
        .patch('/api/sale-orders/requests/invalid-id/design')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });
  });
});

