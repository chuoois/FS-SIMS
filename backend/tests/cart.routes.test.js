jest.mock('../src/models/userRole.model', () => ({
  findUserRoleByCode: jest.fn(),
}));

jest.mock('../src/models/cartRepository', () => ({
  findOrCreateCart: jest.fn(),
  getCartItems: jest.fn(),
  addProductToCart: jest.fn(),
  updateCartItemQuantity: jest.fn(),
  removeCartItem: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { findUserRoleByCode } = require('../src/models/userRole.model');
const cartRepository = require('../src/models/cartRepository');
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
const cart = { cart_id: 8 };
const product = {
  product_id: 21,
  product_code: 'GH-021',
  product_name: 'Ghế ăn gỗ sồi',
  product_type: 'SINGLE',
  price: 1200000,
  stock_quantity: 8,
  status: 'ACTIVE',
};

describe('Cart Routes - /api/cart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findUserRoleByCode.mockResolvedValue({ role_id: 5, role_code: 'CUSTOMER' });
    cartRepository.findOrCreateCart.mockResolvedValue(cart);
    cartRepository.addProductToCart.mockResolvedValue(cart);
    cartRepository.updateCartItemQuantity.mockResolvedValue(cart);
    cartRepository.removeCartItem.mockResolvedValue(cart);
    cartRepository.getCartItems.mockResolvedValue([
      { cartItem: { cart_item_id: 3, quantity: 2 }, product },
    ]);
  });

  test('yêu cầu đăng nhập để truy cập giỏ hàng', async () => {
    const response = await request(app).get('/api/cart');
    expect(response.status).toBe(401);
  });

  test('lấy giỏ hàng và tính tổng tiền', async () => {
    const response = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.itemCount).toBe(2);
    expect(response.body.data.subtotal).toBe(2400000);
    expect(response.body.data.items[0].product.productName).toBe('Ghế ăn gỗ sồi');
  });

  test('thêm sản phẩm vào giỏ hàng', async () => {
    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 21, quantity: 2 });

    expect(response.status).toBe(200);
    expect(cartRepository.addProductToCart).toHaveBeenCalledWith(
      17,
      21,
      2,
      'customer@example.com'
    );
  });

  test('từ chối số lượng không hợp lệ khi thêm sản phẩm', async () => {
    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 21, quantity: 0 });

    expect(response.status).toBe(400);
    expect(cartRepository.addProductToCart).not.toHaveBeenCalled();
  });

  test('cập nhật số lượng sản phẩm', async () => {
    const response = await request(app)
      .patch('/api/cart/items/21')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 4 });

    expect(response.status).toBe(200);
    expect(cartRepository.updateCartItemQuantity).toHaveBeenCalledWith(
      17,
      21,
      4,
      'customer@example.com'
    );
  });

  test('xóa sản phẩm khỏi giỏ hàng', async () => {
    const response = await request(app)
      .delete('/api/cart/items/21')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(cartRepository.removeCartItem).toHaveBeenCalledWith(
      17,
      21,
      'customer@example.com'
    );
  });
});
