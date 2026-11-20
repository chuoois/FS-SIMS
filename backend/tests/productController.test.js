jest.mock('../src/models/ProductModel', () => ({
  getProductsWithPagination: jest.fn(),
  findProductById: jest.fn(),
  getProductMetadata: jest.fn(),
}));

jest.mock('../src/utils/productValidator', () => ({
  validateProductQueryParams: jest.fn(),
  toProductDTO: jest.fn(),
}));

const {
  getProductsWithPagination,
  findProductById,
  getProductMetadata,
} = require('../src/models/ProductModel');
const {
  validateProductQueryParams,
  toProductDTO,
} = require('../src/utils/productValidator');
const { ApiError } = require('../src/utils/ApiError');
const {
  getProducts,
  getProductById,
  getProductMetadata: getProductMetadataController,
} = require('../src/controllers/productController');

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
    originalUrl: '/api/products',
    traceId: 'trace-product-test',
    ...overrides,
  };
}

function expectApiError(next, statusCode, detail) {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
  expect(next.mock.calls[0][0]).toMatchObject({ statusCode, detail });
}

describe('productController', () => {
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  describe('getProducts', () => {
    test('validates query parameters, defaults status, and returns standardized data and pagination', async () => {
      const product = { product_id: 1, status: 'ACTIVE' };
      validateProductQueryParams.mockReturnValue({ page: 2, limit: 10 });
      getProductsWithPagination.mockResolvedValue({
        products: [product],
        totalItems: 1,
        totalPages: 1,
        currentPage: 2,
        itemsPerPage: 10,
      });
      toProductDTO.mockReturnValue({ id: 1, status: 'ACTIVE' });
      const req = createRequest({ query: { page: '2', limit: '10' } });
      const res = createResponse();

      await getProducts(req, res, next);

      expect(validateProductQueryParams).toHaveBeenCalledWith({ page: '2', limit: '10' });
      expect(getProductsWithPagination).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'ACTIVE',
      });
      expect(toProductDTO).toHaveBeenCalledWith(product, { showAvailableStock: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Lấy danh sách sản phẩm thành công',
        data: [{ id: 1, status: 'ACTIVE' }],
        meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
        instance: '/api/products',
        traceId: 'trace-product-test',
        timestamp: expect.any(String),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('returns an empty data array when the model omits products', async () => {
      validateProductQueryParams.mockReturnValue({});
      getProductsWithPagination.mockResolvedValue({});
      const res = createResponse();

      await getProducts(createRequest(), res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
      expect(next).not.toHaveBeenCalled();
    });

    test('passes validation and query errors to the error middleware without exposing details', async () => {
      const error = new Error('database unavailable');
      validateProductQueryParams.mockReturnValue({});
      getProductsWithPagination.mockRejectedValue(error);

      await getProducts(createRequest(), createResponse(), next);

      expectApiError(next, 500, 'Lỗi máy chủ khi lấy danh sách sản phẩm');
      expect(next.mock.calls[0][0].cause).toBe(error);
    });
  });

  describe('getProductById', () => {
    test('passes invalid IDs to the error middleware without querying the model', async () => {
      const res = createResponse();

      await getProductById(createRequest({ params: { id: '0' } }), res, next);

      expectApiError(next, 400, 'Mã sản phẩm không hợp lệ.');
      expect(findProductById).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('returns an active product in the standard response format', async () => {
      const product = { product_id: 12, status: 'ACTIVE' };
      findProductById.mockResolvedValue(product);
      toProductDTO.mockReturnValue({ id: 12, status: 'ACTIVE' });
      const req = createRequest({
        params: { id: '12' },
        originalUrl: '/api/products/12',
      });
      const res = createResponse();

      await getProductById(req, res, next);

      expect(findProductById).toHaveBeenCalledWith(12);
      expect(toProductDTO).toHaveBeenCalledWith(product, { showAvailableStock: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Lấy chi tiết sản phẩm thành công',
        data: { id: 12, status: 'ACTIVE' },
        instance: '/api/products/12',
        traceId: 'trace-product-test',
        timestamp: expect.any(String),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test.each([
      ['missing product', null],
      ['inactive product', { id: 12, status: 'INACTIVE' }],
    ])('passes a %s as not found', async (_description, product) => {
      findProductById.mockResolvedValue(product);
      toProductDTO.mockReturnValue(product);
      const res = createResponse();

      await getProductById(createRequest({ params: { id: '12' } }), res, next);

      expectApiError(next, 404, 'Không tìm thấy sản phẩm yêu cầu.');
      expect(res.status).not.toHaveBeenCalled();
    });

    test('passes lookup failures to the error middleware without exposing details', async () => {
      const error = new Error('database unavailable');
      findProductById.mockRejectedValue(error);

      await getProductById(
        createRequest({ params: { id: '12' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 500, 'Lỗi máy chủ khi lấy chi tiết sản phẩm');
      expect(next.mock.calls[0][0].cause).toBe(error);
    });
  });

  describe('getProductMetadata', () => {
    test('returns metadata in the standard success response format', async () => {
      const metadata = { categories: [], rooms: [], materials: [], colors: [] };
      getProductMetadata.mockResolvedValue(metadata);
      const req = createRequest({ originalUrl: '/api/products/metadata' });
      const res = createResponse();

      await getProductMetadataController(req, res, next);

      expect(getProductMetadata).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Lấy metadata sản phẩm thành công',
        data: metadata,
        instance: '/api/products/metadata',
        traceId: 'trace-product-test',
        timestamp: expect.any(String),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('passes metadata errors to the error middleware without exposing details', async () => {
      const error = new Error('database unavailable');
      getProductMetadata.mockRejectedValue(error);

      await getProductMetadataController(createRequest(), createResponse(), next);

      expectApiError(next, 500, 'Lỗi máy chủ khi lấy metadata sản phẩm');
      expect(next.mock.calls[0][0].cause).toBe(error);
    });
  });
});
