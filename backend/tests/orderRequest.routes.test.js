jest.mock('../src/models/userRole.model', () => ({
  findUserRoleByCode: jest.fn(),
}));
jest.mock('../src/models/OrderRequestModel', () => ({
  createReadyOrderRequestFromCart: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { findUserRoleByCode } = require('../src/models/userRole.model');
const { createReadyOrderRequestFromCart } = require('../src/models/OrderRequestModel');
const cartRoutes = require('../src/routes/cartRoutes');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = express();
app.use(express.json());
app.use('/api/cart', cartRoutes);

const token = jwt.sign(
  { sub: 17, email: 'customer@example.com', role: 5 },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('POST /api/cart/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findUserRoleByCode.mockResolvedValue({ role_id: 5, role_code: 'CUSTOMER' });
    createReadyOrderRequestFromCart.mockResolvedValue({
      requestId: 14,
      requestCode: 'RQ-20261103-AB12CD34',
      status: 'PENDING',
      title: 'Yêu cầu mua hàng (1 sản phẩm)',
    });
  });

  test('yêu cầu đăng nhập', async () => {
    const response = await request(app)
      .post('/api/cart/requests')
      .send({ contactName: 'Nguyễn Văn A', contactPhone: '0901234567' });

    expect(response.status).toBe(401);
  });

  test('từ chối thông tin liên hệ không hợp lệ', async () => {
    const response = await request(app)
      .post('/api/cart/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ contactName: '', contactPhone: 'abc' });

    expect(response.status).toBe(400);
    expect(createReadyOrderRequestFromCart).not.toHaveBeenCalled();
  });

  test('tạo yêu cầu READY từ giỏ hàng của khách đã đăng nhập', async () => {
    const response = await request(app)
      .post('/api/cart/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contactName: 'Nguyễn Văn A',
        contactPhone: '0901234567',
        deliveryAddress: '12 Lê Lợi',
        description: 'Giao giờ hành chính',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      requestCode: 'RQ-20261103-AB12CD34',
      status: 'PENDING',
    });
    expect(createReadyOrderRequestFromCart).toHaveBeenCalledWith({
      customerAccountId: 17,
      contactName: 'Nguyễn Văn A',
      contactPhone: '0901234567',
      contactEmail: 'customer@example.com',
      deliveryAddress: '12 Lê Lợi',
      description: 'Giao giờ hành chính',
      createBy: 'customer@example.com',
    });
  });
});
