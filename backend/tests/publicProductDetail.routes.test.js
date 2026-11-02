jest.mock('../src/models/ProductModel', () => ({
  findProductById: jest.fn(),
  getProductsWithPagination: jest.fn(),
  getProductMetadata: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { findProductById } = require('../src/models/ProductModel');
const productRoutes = require('../src/routes/productRoutes');

const app = express();
app.use('/api/products', productRoutes);

describe('GET /api/products/:id (Public)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('trả chi tiết sản phẩm đang kinh doanh mà không cần đăng nhập', async () => {
    findProductById.mockResolvedValue({
      product_id: 1,
      product_code: 'TB-001',
      product_name: 'Bàn ăn gỗ sồi',
      product_type: 'SINGLE',
      price: 4500000,
      stock_quantity: 5,
      status: 'ACTIVE',
    });

    const response = await request(app).get('/api/products/1');

    expect(response.status).toBe(200);
    expect(response.body.data.productName).toBe('Bàn ăn gỗ sồi');
    expect(findProductById).toHaveBeenCalledWith(1);
  });

  test('từ chối mã sản phẩm không hợp lệ', async () => {
    const response = await request(app).get('/api/products/not-a-number');

    expect(response.status).toBe(400);
    expect(findProductById).not.toHaveBeenCalled();
  });

  test('không trả về sản phẩm không tồn tại hoặc đã ngừng kinh doanh', async () => {
    findProductById.mockResolvedValueOnce(null).mockResolvedValueOnce({
      product_id: 2,
      product_name: 'Sản phẩm ngừng bán',
      status: 'INACTIVE',
    });

    const missingResponse = await request(app).get('/api/products/2');
    const inactiveResponse = await request(app).get('/api/products/2');

    expect(missingResponse.status).toBe(404);
    expect(inactiveResponse.status).toBe(404);
  });
});
