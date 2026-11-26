// ==============================================================================
// leaderStaffController.test.js
// Automated Unit Tests for Leader Staff Production Order Management
// - Mock CustomerOrderModel & userRole.model completely (no real DB/Sequelize calls)
// - Verify standardized response format (buildSuccessResponse) & ApiError via next
// ==============================================================================

jest.mock('../src/models/CustomerOrderModel', () => ({
  getOrdersForLeader: jest.fn(),
  findOrderById: jest.fn(),
  leaderAcceptOrder: jest.fn(),
  leaderUpdateProgress: jest.fn(),
  leaderSubmitInspection: jest.fn(),
}));

const {
  getOrdersForLeader,
  findOrderById,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
} = require('../src/models/CustomerOrderModel');

const { ApiError } = require('../src/utils/ApiError');

const {
  getLeaderOrders,
  getLeaderOrderDetail,
  leaderAccept,
  leaderProgress,
  leaderSubmit,
  uploadInspectionImage,
} = require('../src/controllers/leaderStaffController');

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
    body: {},
    params: {},
    query: {},
    originalUrl: '/api/leader-staff/orders',
    traceId: 'trace-leader-test',
    user: {
      user_account_id: 12,
      sub: 12,
      role: 3,
      email: 'leader@fssims.local',
      full_name: 'Tổ trưởng A',
    },
    ...overrides,
  };
}

function expectApiError(next, statusCode, detail) {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
  expect(next.mock.calls[0][0]).toMatchObject({ statusCode, detail });
}

function createMockOrder(overrides = {}) {
  return {
    order_id: 101,
    order_code: 'ORD-20261125-0101',
    order_type: 'CUSTOM',
    contract_id: 55,
    customer_account_id: 9,
    contact_name: 'Nguyễn Văn Khách',
    contact_phone: '0901234567',
    delivery_address: 'Hà Nội',
    total_amount: 15000000,
    deposit_amount: 5000000,
    paid_amount: 5000000,
    status: 'CONFIRMED',
    expected_date: '2026-12-10',
    delivered_date: null,
    assigned_to: 12,
    note: null,
    createdate: '2026-11-20T10:00:00.000Z',
    modifiedate: '2026-11-25T10:00:00.000Z',
    staff: { full_name: 'Tổ trưởng A' },
    contract: { contract_code: 'HD-20261120-0055' },
    items: [],
    ...overrides,
  };
}

describe('leaderStaffController', () => {
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  describe('getLeaderOrders', () => {
    test('UTCID01 - Returns paginated orders in standardized success format with filters', async () => {
      const req = createRequest({
        query: {
          search: 'ORD',
          search_by: 'PHONE',
          order_code: 'ORD-2026',
          customer_name: 'Khách',
          status: 'CONFIRMED',
          page: '2',
          limit: '5',
        },
      });
      const res = createResponse();
      const mockOrder = createMockOrder();
      getOrdersForLeader.mockResolvedValue({
        orders: [mockOrder],
        totalItems: 11,
        totalPages: 3,
        currentPage: 2,
        itemsPerPage: 5,
      });

      await getLeaderOrders(req, res, next);

      expect(getOrdersForLeader).toHaveBeenCalledWith(12, {
        search: 'ORD',
        search_by: 'PHONE',
        order_code: 'ORD-2026',
        customer_name: 'Khách',
        status: 'CONFIRMED',
        page: '2',
        limit: '5',
      });
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: 'Lấy danh sách đơn hàng sản xuất thành công',
          data: [
            expect.objectContaining({
              orderId: 101,
              orderCode: 'ORD-20261125-0101',
              status: 'CONFIRMED',
            }),
          ],
          meta: {
            page: 2,
            limit: 5,
            total: 11,
            totalPages: 3,
          },
          instance: '/api/leader-staff/orders',
          traceId: 'trace-leader-test',
        })
      );
    });

    test('UTCID02 - Falls back to req.user.sub and default pagination when query params are omitted', async () => {
      const req = createRequest({
        user: { sub: 99 },
        query: {},
      });
      const res = createResponse();
      getOrdersForLeader.mockResolvedValue({
        orders: undefined,
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        itemsPerPage: 10,
      });

      await getLeaderOrders(req, res, next);

      expect(getOrdersForLeader).toHaveBeenCalledWith(99, {
        search: undefined,
        search_by: undefined,
        order_code: undefined,
        customer_name: undefined,
        status: undefined,
        page: 1,
        limit: 10,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          data: [],
          meta: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        })
      );
    });

    test('UTCID03 - Forwards 500 ApiError to next when getOrdersForLeader rejects', async () => {
      const req = createRequest();
      const res = createResponse();
      getOrdersForLeader.mockRejectedValue(new Error('DB connection lost'));

      await getLeaderOrders(req, res, next);

      expectApiError(next, 500, 'Lỗi máy chủ khi lấy danh sách đơn của Tổ trưởng');
    });
  });

  describe('getLeaderOrderDetail', () => {
    test('UTCID04 - Forwards 400 ApiError when order ID is invalid', async () => {
      const req = createRequest({ params: { id: 'abc' } });
      const res = createResponse();

      await getLeaderOrderDetail(req, res, next);

      expectApiError(next, 400, 'Mã đơn hàng không hợp lệ.');
      expect(findOrderById).not.toHaveBeenCalled();
    });

    test('UTCID05 - Forwards 404 ApiError when order does not exist', async () => {
      const req = createRequest({ params: { id: '999' } });
      const res = createResponse();
      findOrderById.mockResolvedValue(null);

      await getLeaderOrderDetail(req, res, next);

      expect(findOrderById).toHaveBeenCalledWith(999);
      expectApiError(next, 404, 'Không tìm thấy đơn hàng.');
    });

    test('UTCID06 - Returns 200 with standardized data payload when found', async () => {
      const req = createRequest({
        params: { id: '101' },
        originalUrl: '/api/leader-staff/orders/101',
      });
      const res = createResponse();
      findOrderById.mockResolvedValue(createMockOrder({ status: 'IN_PRODUCTION' }));

      await getLeaderOrderDetail(req, res, next);

      expect(findOrderById).toHaveBeenCalledWith(101);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: 'Lấy chi tiết đơn hàng sản xuất thành công',
          data: expect.objectContaining({
            orderId: 101,
            orderCode: 'ORD-20261125-0101',
            status: 'IN_PRODUCTION',
          }),
          instance: '/api/leader-staff/orders/101',
          traceId: 'trace-leader-test',
        })
      );
    });

    test('UTCID09 - Forwards 500 ApiError when findOrderById throws an unexpected error', async () => {
      const req = createRequest({ params: { id: '101' } });
      const res = createResponse();
      findOrderById.mockRejectedValue(new Error('Query timeout'));

      await getLeaderOrderDetail(req, res, next);

      expectApiError(next, 500, 'Lỗi máy chủ khi lấy chi tiết đơn hàng');
    });
  });

  describe('leaderAccept', () => {
    test('UTCID10 - Forwards 400 ApiError when order ID is non-positive', async () => {
      const req = createRequest({ params: { id: '0' } });
      const res = createResponse();

      await leaderAccept(req, res, next);

      expectApiError(next, 400, 'Mã đơn hàng không hợp lệ.');
      expect(leaderAcceptOrder).not.toHaveBeenCalled();
    });

    test('UTCID11 - Leader accepts order into production successfully (IN_PRODUCTION)', async () => {
      const req = createRequest({
        params: { id: '101' },
        originalUrl: '/api/leader-staff/orders/101/accept',
      });
      const res = createResponse();
      leaderAcceptOrder.mockResolvedValue(createMockOrder({ status: 'IN_PRODUCTION' }));

      await leaderAccept(req, res, next);

      expect(leaderAcceptOrder).toHaveBeenCalledWith(101, 12);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: 'Tiếp nhận đơn hàng vào sản xuất thành công',
          data: expect.objectContaining({
            orderId: 101,
            status: 'IN_PRODUCTION',
          }),
        })
      );
    });

    test('UTCID12 - Forwards 403 ApiError when leader is not assigned', async () => {
      const req = createRequest({ params: { id: '101' } });
      const res = createResponse();
      leaderAcceptOrder.mockRejectedValue(
        new Error('Bạn không được phân công phụ trách đơn hàng này.')
      );

      await leaderAccept(req, res, next);

      expectApiError(next, 403, 'Bạn không được phân công phụ trách đơn hàng này.');
    });

    test('UTCID13 - Forwards 404 ApiError when order does not exist', async () => {
      const req = createRequest({ params: { id: '999' } });
      const res = createResponse();
      leaderAcceptOrder.mockRejectedValue(new Error('Không tìm thấy đơn hàng.'));

      await leaderAccept(req, res, next);

      expectApiError(next, 404, 'Không tìm thấy đơn hàng.');
    });

    test('UTCID14 - Forwards 400 ApiError when order status is not CONFIRMED', async () => {
      const req = createRequest({ params: { id: '101' } });
      const res = createResponse();
      leaderAcceptOrder.mockRejectedValue(
        new Error('Chỉ có thể tiếp nhận đơn hàng đang ở trạng thái Chờ tiếp nhận (CONFIRMED).')
      );

      await leaderAccept(req, res, next);

      expectApiError(
        next,
        400,
        'Chỉ có thể tiếp nhận đơn hàng đang ở trạng thái Chờ tiếp nhận (CONFIRMED).'
      );
    });
  });

  describe('leaderProgress', () => {
    test('UTCID15 - Forwards 400 ApiError when order ID is invalid', async () => {
      const req = createRequest({ params: { id: '-3' } });
      const res = createResponse();

      await leaderProgress(req, res, next);

      expectApiError(next, 400, 'Mã đơn hàng không hợp lệ.');
      expect(leaderUpdateProgress).not.toHaveBeenCalled();
    });

    test('UTCID16 - Updates production progress using note and isCompleted', async () => {
      const req = createRequest({
        params: { id: '101' },
        body: { note: 'Đã hoàn thiện phần mộc', isCompleted: true },
      });
      const res = createResponse();
      leaderUpdateProgress.mockResolvedValue(
        createMockOrder({
          status: 'IN_PRODUCTION',
          note: '[PRODUCTION_DONE - 26/11/2026]: Tổ trưởng đánh dấu hoàn thành sản xuất. Đã hoàn thiện phần mộc',
        })
      );

      await leaderProgress(req, res, next);

      expect(leaderUpdateProgress).toHaveBeenCalledWith(101, 12, {
        note: 'Đã hoàn thiện phần mộc',
        isCompleted: true,
      });
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: 'Cập nhật tiến độ sản xuất thành công',
          data: expect.objectContaining({
            orderId: 101,
            isProductionCompleted: true,
          }),
        })
      );
    });

    test('UTCID17 - Falls back to progressNote and leaves isCompleted undefined when omitted', async () => {
      const req = createRequest({
        params: { id: '101' },
        body: { progressNote: 'Đang sơn PU lớp 1' },
      });
      const res = createResponse();
      leaderUpdateProgress.mockResolvedValue(createMockOrder({ status: 'IN_PRODUCTION' }));

      await leaderProgress(req, res, next);

      expect(leaderUpdateProgress).toHaveBeenCalledWith(101, 12, {
        note: 'Đang sơn PU lớp 1',
        isCompleted: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('UTCID18 - Forwards 403 ApiError when leader lacks permission', async () => {
      const req = createRequest({
        params: { id: '101' },
        body: { note: 'Test' },
      });
      const res = createResponse();
      leaderUpdateProgress.mockRejectedValue(new Error('Bạn không có quyền cập nhật tiến độ cho đơn hàng này.'));

      await leaderProgress(req, res, next);

      expectApiError(next, 403, 'Bạn không có quyền cập nhật tiến độ cho đơn hàng này.');
    });
  });

  describe('leaderSubmit', () => {
    test('UTCID19 - Forwards 400 ApiError when order ID is invalid', async () => {
      const req = createRequest({ params: { id: 'invalid' } });
      const res = createResponse();

      await leaderSubmit(req, res, next);

      expectApiError(next, 400, 'Mã đơn hàng không hợp lệ.');
      expect(leaderSubmitInspection).not.toHaveBeenCalled();
    });

    test('UTCID20 - Submits inspection request with images and note successfully (UNDER_INSPECTION)', async () => {
      const images = ['https://res.cloudinary.com/demo/image/upload/v1/product1.jpg'];
      const req = createRequest({
        params: { id: '101' },
        body: { note: 'Đã xong, mời Chủ xưởng nghiệm thu', images },
      });
      const res = createResponse();
      leaderSubmitInspection.mockResolvedValue(
        createMockOrder({
          status: 'UNDER_INSPECTION',
          inspectionImages: images.map((url) => ({ image_url: url, image_type: 'INSPECTION' })),
          note: '[Gửi nghiệm thu]: Đã xong, mời Chủ xưởng nghiệm thu',
        })
      );

      await leaderSubmit(req, res, next);

      expect(leaderSubmitInspection).toHaveBeenCalledWith(101, 12, {
        note: 'Đã xong, mời Chủ xưởng nghiệm thu',
        images,
      });
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: 'Đã gửi yêu cầu nghiệm thu lên Chủ xưởng thành công',
          data: expect.objectContaining({
            orderId: 101,
            status: 'UNDER_INSPECTION',
            inspectionImages: images,
          }),
        })
      );
    });

    test('UTCID21 - Forwards 400 ApiError when order is not IN_PRODUCTION', async () => {
      const req = createRequest({
        params: { id: '101' },
        body: { note: 'Gửi duyệt', images: [] },
      });
      const res = createResponse();
      leaderSubmitInspection.mockRejectedValue(
        new Error('Chỉ có thể gửi nghiệm thu khi đơn hàng đang trong tiến trình sản xuất (IN_PRODUCTION).')
      );

      await leaderSubmit(req, res, next);

      expectApiError(
        next,
        400,
        'Chỉ có thể gửi nghiệm thu khi đơn hàng đang trong tiến trình sản xuất (IN_PRODUCTION).'
      );
    });
  });

  describe('uploadInspectionImage', () => {
    test('UTCID22 - Returns standardized array of uploaded image URLs', () => {
      const req = createRequest({
        originalUrl: '/api/leader-staff/upload-inspection-image',
        files: [
          { path: 'https://res.cloudinary.com/demo/1.jpg' },
          { secure_url: 'https://res.cloudinary.com/demo/2.jpg' },
        ],
      });
      const res = createResponse();

      uploadInspectionImage(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: 'Tải lên hình ảnh nghiệm thu thành công',
          data: [
            'https://res.cloudinary.com/demo/1.jpg',
            'https://res.cloudinary.com/demo/2.jpg',
          ],
          instance: '/api/leader-staff/upload-inspection-image',
          traceId: 'trace-leader-test',
        })
      );
    });
  });
});
