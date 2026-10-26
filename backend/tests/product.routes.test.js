// =========================================================
// product.routes.test.js
// Route tests cho API Quản lý Sản phẩm (Manage Products)
// Mock Model & Upload middleware theo đúng pattern dự án
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
  countProductUsage: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  updateProductSetItems: jest.fn().mockResolvedValue(true),
  deleteProduct: jest.fn(),
  generateNextProductCode: jest.fn(),
  getProductMetadata: jest.fn(),
  getProductStockSummary: jest.fn(),
}));

jest.mock('../src/models/ProductMaterialModel', () => {
  const actual = jest.requireActual('../src/models/ProductMaterialModel');
  return {
    ...actual,
    createProductMaterial: jest.fn(),
    findProductMaterialByName: jest.fn(),
    findProductMaterialById: jest.fn(),
    getAllProductMaterials: jest.fn(),
  };
});

jest.mock('../src/models/ProductColorModel', () => {
  const actual = jest.requireActual('../src/models/ProductColorModel');
  return {
    ...actual,
    createProductColor: jest.fn(),
    findProductColorByName: jest.fn(),
    findProductColorById: jest.fn(),
    getAllProductColors: jest.fn(),
  };
});

jest.mock('../src/services/cloudinaryService', () => ({
  deleteImage: jest.fn().mockResolvedValue({ result: 'ok' }),
  getPublicIdFromUrl: jest.fn().mockReturnValue('folder/image'),
}));

jest.mock('../src/middlewares/uploadMiddleware', () => ({
  single: () => (req, res, next) => next(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../src/app');

const { findUserRoleByCode } = require('../src/models/userRole.model');
const {
  findProductById,
  findProductByCode,
  getProductsWithPagination,
  countProductUsage,
  createProduct,
  updateProduct,
  deleteProduct,
  generateNextProductCode,
  getProductMetadata,
  getProductStockSummary,
} = require('../src/models/ProductModel');
const { createProductMaterial } = require('../src/models/ProductMaterialModel');
const { createProductColor } = require('../src/models/ProductColorModel');

const OWNER_ROLE_ID = 1;
const SALES_ROLE_ID = 2;

const ownerToken = jwt.sign(
  { sub: 1, email: 'owner@fssims.com', role: OWNER_ROLE_ID },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const salesToken = jwt.sign(
  { sub: 2, email: 'sales@fssims.com', role: SALES_ROLE_ID },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Product Routes - /api/products', () => {
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

  describe('GET /api/products', () => {
    test('trả về 401 khi không có token', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });

    test('trả về 403 khi role không phải OWNER', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });

    test('trả về danh sách sản phẩm thành công với role OWNER', async () => {
      getProductsWithPagination.mockResolvedValue({
        products: [
          {
            product_id: 1,
            product_code: 'TB-001',
            product_name: 'Bàn ăn gỗ sồi',
            price: 4500000,
            stock_quantity: 5,
            status: 'ACTIVE',
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/thành công/);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].productCode).toBe('TB-001');
    });
  });

  describe('GET /api/products/metadata', () => {
    test('trả về metadata danh mục, phòng, chất liệu, màu sắc', async () => {
      getProductMetadata.mockResolvedValue({
        categories: [{ category_id: 1, category_name: 'Bàn' }],
        rooms: [{ room_id: 1, room_name: 'Phòng ăn' }],
        materials: [{ material_id: 1, material_name: 'Gỗ sồi' }],
        colors: [{ color_id: 1, color_name: 'Tự nhiên' }],
      });

      const res = await request(app)
        .get('/api/products/metadata')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.categories).toHaveLength(1);
    });
  });

  describe('POST /api/products', () => {
    const validBody = {
      product_code: 'TB-001',
      product_name: 'Bàn ăn gỗ sồi 6 người',
      category_id: 1,
      room_id: 1,
      material_id: 1,
      color_id: 1,
      price: 4500000,
      stock_quantity: 10,
    };

    test('trả về 400 khi thiếu thông tin bắt buộc', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ product_code: 'TB-001' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Tên sản phẩm là bắt buộc/);
    });

    test('trả về 409 khi mã sản phẩm bị trùng', async () => {
      findProductByCode.mockResolvedValue({ product_id: 99, product_code: 'TB-001' });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/đã tồn tại/);
    });

    test('tạo sản phẩm thành công và trả về 201', async () => {
      findProductByCode.mockResolvedValue(null);
      createProduct.mockResolvedValue({ product_id: 1, ...validBody });
      findProductById.mockResolvedValue({
        product_id: 1,
        ...validBody,
        category: { category_name: 'Bàn' },
      });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Thêm mới sản phẩm thành công/);
      expect(res.body.data.productCode).toBe('TB-001');
    });
  });

  describe('DELETE /api/products/:id', () => {
    test('trả về 404 khi không tìm thấy sản phẩm', async () => {
      findProductById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/products/999')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    test('trả về 400 khi sản phẩm đang được sử dụng trong đơn hàng/hợp đồng', async () => {
      findProductById.mockResolvedValue({ product_id: 1, product_code: 'TB-001' });
      countProductUsage.mockResolvedValue({ totalUsage: 3, contractCount: 3 });

      const res = await request(app)
        .delete('/api/products/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không thể xóa sản phẩm do đã có đơn hàng/);
    });

    test('xóa thành công và trả về 200 khi chưa sử dụng', async () => {
      findProductById.mockResolvedValue({ product_id: 1, product_code: 'TB-001', image_url: null });
      countProductUsage.mockResolvedValue({ totalUsage: 0 });
      deleteProduct.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/products/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Xóa sản phẩm thành công/);
    });
  });

  describe('POST /api/products/materials', () => {
    test('trả về 400 nếu thiếu tên chất liệu', async () => {
      const res = await request(app)
        .post('/api/products/materials')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Tên chất liệu là bắt buộc/);
    });

    test('tạo chất liệu mới thành công và trả về 201', async () => {
      createProductMaterial.mockResolvedValue({
        material_id: 10,
        material_code: 'GO_HUONG',
        material_name: 'Gỗ hương',
        description: null,
      });

      const res = await request(app)
        .post('/api/products/materials')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ material_name: 'Gỗ hương' });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Thêm mới chất liệu thành công/);
      expect(res.body.data.material_name).toBe('Gỗ hương');
    });
  });

  describe('POST /api/products/colors', () => {
    test('trả về 400 nếu thiếu tên màu sắc', async () => {
      const res = await request(app)
        .post('/api/products/colors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Tên màu sắc là bắt buộc/);
    });

    test('tạo màu sắc mới thành công và trả về 201', async () => {
      createProductColor.mockResolvedValue({
        color_id: 20,
        color_code: 'XANH_REU',
        color_name: 'Xanh rêu',
        hex_value: '#2E7D32',
      });

      const res = await request(app)
        .post('/api/products/colors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ color_name: 'Xanh rêu', hex_value: '#2E7D32' });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Thêm mới màu sắc thành công/);
      expect(res.body.data.color_name).toBe('Xanh rêu');
      expect(res.body.data.hex_value).toBe('#2E7D32');
    });
  });
});
