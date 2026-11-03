jest.mock('../src/models/userRole.model', () => ({
  findUserRoleByCode: jest.fn(),
}));

jest.mock('../src/models/CustomerOrderModel', () => ({
  getCustomerOrdersWithPagination: jest.fn(),
  findCustomerOrderById: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { findUserRoleByCode } = require('../src/models/userRole.model');
const {
  getCustomerOrdersWithPagination,
  findCustomerOrderById,
} = require('../src/models/CustomerOrderModel');
const customerOrderRoutes = require('../src/routes/customerOrderRoutes');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = express();
app.use('/api/customer-orders', customerOrderRoutes);

const customerToken = jwt.sign(
  { sub: 17, email: 'customer@example.com', role: 4 },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const ownerToken = jwt.sign(
  { sub: 1, email: 'owner@example.com', role: 1 },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Customer Order Routes - /api/customer-orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findUserRoleByCode.mockImplementation(async (code) => {
      if (code === 'CUSTOMER') return { role_id: 4, role_code: 'CUSTOMER' };
      return null;
    });
    getCustomerOrdersWithPagination.mockResolvedValue({
      orders: [{
        order_id: 31,
        order_code: 'ORD-20261102-0001',
        customer_account_id: 17,
        order_type: 'READY',
        status: 'CONFIRMED',
        total_amount: 2500000,
        paid_amount: 500000,
        items: [],
      }],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
      itemsPerPage: 10,
    });
    findCustomerOrderById.mockResolvedValue({
      order_id: 31,
      order_code: 'ORD-20261102-0001',
      customer_account_id: 17,
      order_type: 'READY',
      status: 'CONFIRMED',
      total_amount: 2500000,
      paid_amount: 500000,
      items: [],
    });
  });

  test('khách hàng chỉ nhận danh sách đơn hàng theo customer id trong token', async () => {
    const response = await request(app)
      .get('/api/customer-orders?page=2&limit=5')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].orderCode).toBe('ORD-20261102-0001');
    expect(getCustomerOrdersWithPagination).toHaveBeenCalledWith(17, {
      page: '2',
      limit: '5',
    });
  });

  test('không cho nhân viên truy cập danh sách đơn của khách hàng', async () => {
    const response = await request(app)
      .get('/api/customer-orders')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(403);
    expect(getCustomerOrdersWithPagination).not.toHaveBeenCalled();
  });

  test('chi tiết đơn hàng được truy vấn đồng thời theo mã đơn và khách hàng', async () => {
    const response = await request(app)
      .get('/api/customer-orders/31')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.orderCode).toBe('ORD-20261102-0001');
    expect(findCustomerOrderById).toHaveBeenCalledWith(31, 17);
  });

  test('không tiết lộ đơn hàng của khách hàng khác', async () => {
    findCustomerOrderById.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/customer-orders/99')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(404);
    expect(findCustomerOrderById).toHaveBeenCalledWith(99, 17);
  });

  test('từ chối mã đơn hàng không hợp lệ', async () => {
    const response = await request(app)
      .get('/api/customer-orders/not-an-id')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(400);
    expect(findCustomerOrderById).not.toHaveBeenCalled();
  });
});
