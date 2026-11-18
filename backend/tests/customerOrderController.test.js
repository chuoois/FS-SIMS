jest.mock('../src/models/CustomerOrderModel', () => ({
  getCustomerOrdersWithPagination: jest.fn(),
  findCustomerOrderById: jest.fn(),
  findCustomerOrderRequestById: jest.fn(),
}));

jest.mock('../src/utils/saleOrderValidator', () => ({
  toOrderDTO: jest.fn(),
}));

const {
  getCustomerOrdersWithPagination,
  findCustomerOrderById,
  findCustomerOrderRequestById,
} = require('../src/models/CustomerOrderModel');
const { toOrderDTO } = require('../src/utils/saleOrderValidator');
const { ApiError } = require('../src/utils/ApiError');
const {
  getMyOrders,
  getMyOrderById,
  getMyOrderRequestById,
} = require('../src/controllers/customerOrderController');

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
    user: { sub: '9' },
    query: {},
    params: {},
    originalUrl: '/api/customer-orders',
    traceId: 'trace-customer-order-test',
    ...overrides,
  };
}

function expectApiError(next, statusCode, detail) {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
  expect(next.mock.calls[0][0]).toMatchObject({ statusCode, detail });
}

describe('customerOrderController', () => {
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  describe('getMyOrders', () => {
    test('returns orders in the standardized response format with pagination metadata', async () => {
      const order = { order_id: 21 };
      const request = {
        request_id: 34,
        request_code: 'REQ-34',
        title: 'Custom table',
        items: [{ request_item_id: 1, item_name: 'Table', quantity: 2 }],
      };
      getCustomerOrdersWithPagination.mockResolvedValue({
        orders: [
          { recordType: 'ORDER', record: order },
          { recordType: 'REQUEST', record: request },
        ],
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });
      toOrderDTO.mockReturnValue({ orderId: 21 });
      const req = createRequest({ query: { page: '1', limit: '10' } });
      const res = createResponse();

      await getMyOrders(req, res, next);

      expect(getCustomerOrdersWithPagination).toHaveBeenCalledWith(9, {
        page: '1',
        limit: '10',
      });
      expect(toOrderDTO).toHaveBeenCalledWith(order);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Lấy danh sách đơn hàng của bạn thành công',
        data: [
          { orderId: 21 },
          {
            requestId: 34,
            requestCode: 'REQ-34',
            title: 'Custom table',
            description: undefined,
            contactName: undefined,
            contactPhone: undefined,
            deliveryAddress: undefined,
            status: undefined,
            expectedDate: undefined,
            budgetMin: undefined,
            budgetMax: undefined,
            quotedPrice: undefined,
            rejectReason: undefined,
            createdAt: undefined,
            items: [{
              requestItemId: 1,
              itemName: 'Table',
              quantity: 2,
              unitPrice: undefined,
              description: undefined,
              lengthCm: undefined,
              widthCm: undefined,
              heightCm: undefined,
            }],
          },
        ],
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
        instance: '/api/customer-orders',
        traceId: 'trace-customer-order-test',
        timestamp: expect.any(String),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects requests without a valid customer account', async () => {
      await getMyOrders(createRequest({ user: undefined }), createResponse(), next);

      expectApiError(next, 401, 'Tài khoản khách hàng không hợp lệ.');
      expect(getCustomerOrdersWithPagination).not.toHaveBeenCalled();
    });

    test('passes model errors to error middleware without exposing internal details', async () => {
      const error = new Error('database unavailable');
      getCustomerOrdersWithPagination.mockRejectedValue(error);

      await getMyOrders(createRequest(), createResponse(), next);

      expectApiError(next, 500, 'Lỗi máy chủ khi lấy đơn hàng của bạn.');
      expect(next.mock.calls[0][0].cause).toBe(error);
    });
  });

  describe('getMyOrderRequestById', () => {
    test('rejects invalid IDs without querying the model', async () => {
      await getMyOrderRequestById(
        createRequest({ params: { id: '0' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 400, 'Mã yêu cầu không hợp lệ.');
      expect(findCustomerOrderRequestById).not.toHaveBeenCalled();
    });

    test('returns the request in the standardized response format', async () => {
      const request = { request_id: 34, request_code: 'REQ-34', title: 'Custom table' };
      findCustomerOrderRequestById.mockResolvedValue(request);
      const req = createRequest({
        params: { id: '34' },
        originalUrl: '/api/customer-orders/requests/34',
      });
      const res = createResponse();

      await getMyOrderRequestById(req, res, next);

      expect(findCustomerOrderRequestById).toHaveBeenCalledWith(34, 9);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Lấy chi tiết yêu cầu thành công',
        data: expect.objectContaining({ requestId: 34, requestCode: 'REQ-34' }),
        instance: '/api/customer-orders/requests/34',
        traceId: 'trace-customer-order-test',
        timestamp: expect.any(String),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('forwards missing requests to error middleware', async () => {
      findCustomerOrderRequestById.mockResolvedValue(null);

      await getMyOrderRequestById(
        createRequest({ params: { id: '34' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 404, 'Không tìm thấy yêu cầu.');
    });
  });

  describe('getMyOrderById', () => {
    test('rejects invalid IDs without querying the model', async () => {
      await getMyOrderById(
        createRequest({ params: { id: 'invalid' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 400, 'Mã đơn hàng không hợp lệ.');
      expect(findCustomerOrderById).not.toHaveBeenCalled();
    });

    test('returns the order in the standardized response format', async () => {
      const order = { order_id: 21 };
      findCustomerOrderById.mockResolvedValue(order);
      toOrderDTO.mockReturnValue({ orderId: 21 });
      const req = createRequest({
        params: { id: '21' },
        originalUrl: '/api/customer-orders/21',
      });
      const res = createResponse();

      await getMyOrderById(req, res, next);

      expect(findCustomerOrderById).toHaveBeenCalledWith(21, 9);
      expect(toOrderDTO).toHaveBeenCalledWith(order);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Lấy chi tiết đơn hàng thành công',
        data: { orderId: 21 },
        instance: '/api/customer-orders/21',
        traceId: 'trace-customer-order-test',
        timestamp: expect.any(String),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('forwards missing orders to error middleware', async () => {
      findCustomerOrderById.mockResolvedValue(null);

      await getMyOrderById(
        createRequest({ params: { id: '21' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 404, 'Không tìm thấy đơn hàng.');
    });
  });
});
