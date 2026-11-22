jest.mock('../src/models/ProductModel', () => ({
  findProductById: jest.fn(),
  findProductByCode: jest.fn(),
  getProductsWithPagination: jest.fn(),
  countProductUsage: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  updateProductSetItems: jest.fn(),
  deleteProduct: jest.fn(),
  generateNextProductCode: jest.fn(),
  getProductMetadata: jest.fn(),
  getProductStockSummary: jest.fn(),
}));

jest.mock('../src/models/ProductMaterialModel', () => ({
  createProductMaterial: jest.fn(),
}));

jest.mock('../src/models/ProductColorModel', () => ({
  createProductColor: jest.fn(),
}));

jest.mock('../src/services/cloudinaryService', () => ({
  deleteImage: jest.fn().mockResolvedValue(true),
  getPublicIdFromUrl: jest.fn().mockReturnValue('sample_public_id'),
}));

const {
  findProductById,
  findProductByCode,
  getProductsWithPagination,
  countProductUsage,
  createProduct: createProductModel,
  updateProduct: updateProductModel,
  updateProductSetItems,
  deleteProduct: deleteProductModel,
  generateNextProductCode,
  getProductMetadata: getProductMetadataModel,
  getProductStockSummary: getProductStockSummaryModel,
} = require('../src/models/ProductModel');

const { createProductMaterial: createProductMaterialModel } = require('../src/models/ProductMaterialModel');
const { createProductColor: createProductColorModel } = require('../src/models/ProductColorModel');
const { deleteImage } = require('../src/services/cloudinaryService');

const {
  getProducts,
  getProductMetadata,
  getProductStockSummary,
  getNextProductCode,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductMaterial,
  createProductColor,
} = require('../src/controllers/productManagerController');

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function createRequest(overrides = {}) {
  return {
    query: {},
    params: {},
    body: {},
    user: { email: 'manager@test.com' },
    ...overrides,
  };
}

describe('productManagerController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    test('returns products list and pagination on success', async () => {
      const mockResult = {
        products: [
          {
            product_id: 1,
            product_code: 'PRD-0001',
            product_name: 'Bàn ăn',
            product_type: 'SINGLE',
            price: 5000000,
            stock_quantity: 10,
            hold_quantity: 2,
            status: 'ACTIVE',
            toJSON: () => ({
              product_id: 1,
              product_code: 'PRD-0001',
              product_name: 'Bàn ăn',
              product_type: 'SINGLE',
              price: 5000000,
              stock_quantity: 10,
              hold_quantity: 2,
              status: 'ACTIVE',
            }),
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      };
      getProductsWithPagination.mockResolvedValue(mockResult);

      const req = createRequest({ query: { page: '1', limit: '10' } });
      const res = createResponse();

      await getProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy danh sách sản phẩm thành công',
          pagination: {
            totalItems: 1,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: 10,
          },
        })
      );
    });

    test('returns 500 when model throws error', async () => {
      getProductsWithPagination.mockRejectedValue(new Error('DB Error'));

      const req = createRequest();
      const res = createResponse();

      await getProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lỗi máy chủ khi lấy danh sách sản phẩm',
        })
      );
    });
  });

  describe('getProductMetadata', () => {
    test('returns metadata on success', async () => {
      const mockMeta = { categories: [], rooms: [], materials: [], colors: [] };
      getProductMetadataModel.mockResolvedValue(mockMeta);

      const req = createRequest();
      const res = createResponse();

      await getProductMetadata(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Lấy thông tin danh mục thành công',
        data: mockMeta,
      });
    });

    test('returns 500 on error', async () => {
      getProductMetadataModel.mockRejectedValue(new Error('Meta error'));

      const req = createRequest();
      const res = createResponse();

      await getProductMetadata(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lỗi máy chủ khi lấy metadata sản phẩm',
        })
      );
    });
  });

  describe('getProductStockSummary', () => {
    test('returns stock summary on success', async () => {
      const mockSummary = {
        totalProducts: 5,
        inStock: 4,
        outOfStock: 1,
        lowStock: 1,
        totalQuantity: 20,
        totalHoldQuantity: 3,
        totalAvailableQuantity: 17,
      };
      getProductStockSummaryModel.mockResolvedValue(mockSummary);

      const req = createRequest();
      const res = createResponse();

      await getProductStockSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Lấy thống kê tồn kho sản phẩm thành công',
        data: mockSummary,
      });
    });

    test('returns 500 on error', async () => {
      getProductStockSummaryModel.mockRejectedValue(new Error('Summary error'));

      const req = createRequest();
      const res = createResponse();

      await getProductStockSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getNextProductCode', () => {
    test('returns next product code successfully', async () => {
      generateNextProductCode.mockResolvedValue('PRD-0005');

      const req = createRequest();
      const res = createResponse();

      await getNextProductCode(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Lấy mã sản phẩm tiếp theo thành công',
        data: { nextCode: 'PRD-0005' },
      });
    });

    test('returns 500 on error', async () => {
      generateNextProductCode.mockRejectedValue(new Error('Gen error'));

      const req = createRequest();
      const res = createResponse();

      await getNextProductCode(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getProductById', () => {
    test('returns product details and usage when product exists', async () => {
      const mockProduct = {
        product_id: 1,
        product_code: 'PRD-0001',
        product_name: 'Bàn ăn',
        price: 5000000,
        stock_quantity: 10,
        hold_quantity: 2,
        toJSON: () => ({
          product_id: 1,
          product_code: 'PRD-0001',
          product_name: 'Bàn ăn',
          price: 5000000,
          stock_quantity: 10,
          hold_quantity: 2,
        }),
      };
      const mockUsage = { totalUsage: 0, cartCount: 0 };
      findProductById.mockResolvedValue(mockProduct);
      countProductUsage.mockResolvedValue(mockUsage);

      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();

      await getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy chi tiết sản phẩm thành công',
          usage: mockUsage,
        })
      );
    });

    test('returns 404 when product is not found', async () => {
      findProductById.mockResolvedValue(null);

      const req = createRequest({ params: { id: '999' } });
      const res = createResponse();

      await getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Không tìm thấy sản phẩm yêu cầu',
      });
    });

    test('returns 500 on error', async () => {
      findProductById.mockRejectedValue(new Error('Detail error'));

      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();

      await getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createProduct', () => {
    const validBody = {
      product_name: 'Ghế gỗ sồi',
      category_id: 1,
      room_id: 1,
      material_id: 1,
      color_id: 1,
      price: 1500000,
      stock_quantity: 5,
    };

    test('creates product successfully with auto-generated product_code and hold_quantity = 0', async () => {
      generateNextProductCode.mockResolvedValue('PRD-0002');
      createProductModel.mockResolvedValue({ product_id: 2 });
      findProductById.mockResolvedValue({
        product_id: 2,
        product_code: 'PRD-0002',
        product_name: 'Ghế gỗ sồi',
        price: 1500000,
        stock_quantity: 5,
        hold_quantity: 0,
        toJSON: () => ({
          product_id: 2,
          product_code: 'PRD-0002',
          product_name: 'Ghế gỗ sồi',
          price: 1500000,
          stock_quantity: 5,
          hold_quantity: 0,
        }),
      });

      const req = createRequest({ body: validBody });
      const res = createResponse();

      await createProduct(req, res);

      expect(createProductModel).toHaveBeenCalledWith(
        expect.objectContaining({
          product_code: 'PRD-0002',
          hold_quantity: 0,
          createby: 'manager@test.com',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Thêm mới sản phẩm thành công',
        })
      );
    });

    test('auto-creates material and color when name is provided without valid id', async () => {
      createProductMaterialModel.mockResolvedValue({ material_id: 10 });
      createProductColorModel.mockResolvedValue({ color_id: 20 });
      generateNextProductCode.mockResolvedValue('PRD-0003');
      createProductModel.mockResolvedValue({ product_id: 3 });
      findProductById.mockResolvedValue({
        product_id: 3,
        product_code: 'PRD-0003',
        product_name: 'Bàn làm việc mới',
        price: 3000000,
        toJSON: () => ({ product_id: 3, product_code: 'PRD-0003', price: 3000000 }),
      });

      const req = createRequest({
        body: {
          product_name: 'Bàn làm việc mới',
          category_id: 1,
          room_id: 1,
          material_name: 'Gỗ tràm',
          color_name: 'Xanh navy',
          price: 3000000,
          stock_quantity: 2,
        },
      });
      const res = createResponse();

      await createProduct(req, res);

      expect(createProductMaterialModel).toHaveBeenCalledWith(
        expect.objectContaining({ material_name: 'Gỗ tràm' })
      );
      expect(createProductColorModel).toHaveBeenCalledWith(
        expect.objectContaining({ color_name: 'Xanh navy' })
      );
      expect(createProductModel).toHaveBeenCalledWith(
        expect.objectContaining({ material_id: 10, color_id: 20 })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('returns 400 when validation fails and cleans up uploaded image', async () => {
      const req = createRequest({
        body: { product_name: '' }, // invalid: empty name
        file: { path: 'https://cloudinary.com/test.jpg' },
      });
      const res = createResponse();

      await createProduct(req, res);

      expect(deleteImage).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 409 when product_code already exists', async () => {
      findProductByCode.mockResolvedValue({ product_id: 100, product_code: 'PRD-0001' });

      const req = createRequest({
        body: {
          ...validBody,
          product_code: 'PRD-0001',
        },
      });
      const res = createResponse();

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Mã sản phẩm "PRD-0001" đã tồn tại trên hệ thống',
        })
      );
    });
  });

  describe('updateProduct', () => {
    test('updates product successfully', async () => {
      findProductById
        .mockResolvedValueOnce({
          product_id: 1,
          product_name: 'Bàn ăn cũ',
          hold_quantity: 2,
          stock_quantity: 10,
          image_url: 'old_url',
        })
        .mockResolvedValueOnce({
          product_id: 1,
          product_name: 'Bàn ăn mới',
          hold_quantity: 2,
          stock_quantity: 12,
          toJSON: () => ({
            product_id: 1,
            product_name: 'Bàn ăn mới',
            hold_quantity: 2,
            stock_quantity: 12,
          }),
        });

      updateProductModel.mockResolvedValue(true);

      const req = createRequest({
        params: { id: '1' },
        body: {
          product_name: 'Bàn ăn mới',
          stock_quantity: 12,
        },
      });
      const res = createResponse();

      await updateProduct(req, res);

      expect(updateProductModel).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          product_name: 'Bàn ăn mới',
          stock_quantity: 12,
          modifieby: 'manager@test.com',
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cập nhật thông tin sản phẩm thành công',
        })
      );
    });

    test('returns 404 when product to update does not exist', async () => {
      findProductById.mockResolvedValue(null);

      const req = createRequest({
        params: { id: '999' },
        body: { product_name: 'Không tồn tại' },
      });
      const res = createResponse();

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when stock_quantity is set less than hold_quantity', async () => {
      findProductById.mockResolvedValue({
        product_id: 1,
        hold_quantity: 5,
        stock_quantity: 10,
      });

      const req = createRequest({
        params: { id: '1' },
        body: { stock_quantity: 3 }, // 3 < hold_quantity 5
      });
      const res = createResponse();

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('không được nhỏ hơn số lượng đang giữ chỗ'),
        })
      );
    });
  });

  describe('deleteProduct', () => {
    test('deletes product successfully when not in use and hold_quantity is 0', async () => {
      findProductById.mockResolvedValue({
        product_id: 1,
        hold_quantity: 0,
        image_url: 'https://cloudinary.com/test.jpg',
      });
      countProductUsage.mockResolvedValue({ totalUsage: 0 });
      deleteProductModel.mockResolvedValue(true);

      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();

      await deleteProduct(req, res);

      expect(deleteImage).toHaveBeenCalled();
      expect(deleteProductModel).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Xóa sản phẩm thành công',
      });
    });

    test('returns 404 when product to delete is not found', async () => {
      findProductById.mockResolvedValue(null);

      const req = createRequest({ params: { id: '999' } });
      const res = createResponse();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when hold_quantity > 0', async () => {
      findProductById.mockResolvedValue({
        product_id: 1,
        hold_quantity: 3,
      });

      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('đang được giữ chỗ'),
        })
      );
      expect(deleteProductModel).not.toHaveBeenCalled();
    });

    test('returns 400 when product has transactions / usage in orders or contracts', async () => {
      findProductById.mockResolvedValue({
        product_id: 1,
        hold_quantity: 0,
      });
      countProductUsage.mockResolvedValue({
        totalUsage: 2,
        customerOrderCount: 1,
        contractCount: 1,
      });

      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Không thể xóa sản phẩm do đã có đơn hàng'),
        })
      );
      expect(deleteProductModel).not.toHaveBeenCalled();
    });
  });

  describe('createProductMaterial', () => {
    test('creates material successfully with valid input', async () => {
      createProductMaterialModel.mockResolvedValue({
        material_id: 1,
        material_name: 'Gỗ căm xe',
        material_code: 'GO_CAM_XE',
      });

      const req = createRequest({
        body: { material_name: 'Gỗ căm xe' },
      });
      const res = createResponse();

      await createProductMaterial(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Thêm mới chất liệu thành công',
          data: expect.objectContaining({ material_name: 'Gỗ căm xe' }),
        })
      );
    });

    test('returns 400 when material_name is empty', async () => {
      const req = createRequest({ body: { material_name: '' } });
      const res = createResponse();

      await createProductMaterial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('createProductColor', () => {
    test('creates color successfully with valid input', async () => {
      createProductColorModel.mockResolvedValue({
        color_id: 1,
        color_name: 'Trắng sứ',
        color_code: 'TRANG_SU',
        hex_value: '#FFFFFF',
      });

      const req = createRequest({
        body: { color_name: 'Trắng sứ', hex_value: '#FFFFFF' },
      });
      const res = createResponse();

      await createProductColor(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Thêm mới màu sắc thành công',
          data: expect.objectContaining({ color_name: 'Trắng sứ' }),
        })
      );
    });

    test('returns 400 when color_name is missing', async () => {
      const req = createRequest({ body: {} });
      const res = createResponse();

      await createProductColor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
