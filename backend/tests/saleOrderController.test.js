// ==============================================================================
// saleOrderController.test.js
// Automated Unit Tests for Sale Order & POS Warehouse Management
// Enterprise / Clean Architecture Standard:
// - Standard Identifier Codes: UTCID23 -> UTCID30
// - 3-Phase Structure: Arrange - Act - Assert
// - Function-level describe blocks matching project conventions
// ==============================================================================

jest.mock('../src/models/CustomerOrderModel', () => ({
  createOrderFromContract: jest.fn(),
  findOrderById: jest.fn(),
  getOrdersWithPagination: jest.fn(),
  confirmDelivery: jest.fn(),
  completeDelivery: jest.fn(),
}));

jest.mock('../src/models/ProductModel', () => ({
  getProductsWithPagination: jest.fn(),
  findProductById: jest.fn(),
}));

const {
  createOrderFromContract: createOrderFromContractModel,
  findOrderById: findOrderByIdModel,
  getOrdersWithPagination: getOrdersModel,
  confirmDelivery: confirmDeliveryModel,
  completeDelivery: completeDeliveryModel,
} = require('../src/models/CustomerOrderModel');

const {
  getProductsWithPagination,
  findProductById,
} = require('../src/models/ProductModel');

const {
  createOrderFromContract,
  getOrders,
  getOrderById,
  deliverOrder,
  completeOrder,
  getWarehouseProducts,
  getProductDetail,
} = require('../src/controllers/saleOrderController');

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
    user: { sub: 2, email: 'sales@fssims.local', full_name: 'Sales Staff' },
    ...overrides,
  };
}

const getFutureDateString = (days = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

describe('saleOrderController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrderFromContract', () => {
    test('UTCID23 - SALE creates order from signed contract successfully', async () => {
      // Arrange
      const req = createRequest({ params: { contractId: '50' } });
      const res = createResponse();
      const mockCreatedOrder = {
        order_id: 100,
        order_code: 'ORD-20261120-0100',
        contract_id: 50,
        status: 'CONFIRMED',
        total_amount: 4000000,
        deposit_amount: 1000000,
        items: [],
      };
      createOrderFromContractModel.mockResolvedValue(mockCreatedOrder);

      // Act
      await createOrderFromContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tạo đơn hàng từ hợp đồng thành công',
          data: expect.objectContaining({ orderId: 100, orderCode: 'ORD-20261120-0100' }),
        })
      );
      expect(createOrderFromContractModel).toHaveBeenCalledWith(
        50,
        expect.objectContaining({ assignedTo: 2 })
      );
    });

    test('UTCID24 - Returns 409 Conflict when contract has already been converted to an order', async () => {
      // Arrange
      const req = createRequest({ params: { contractId: '50' } });
      const res = createResponse();
      createOrderFromContractModel.mockRejectedValue(
        new Error('Hợp đồng này đã được tạo đơn hàng (ORD-20261120-0099).')
      );

      // Act
      await createOrderFromContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('đã được tạo đơn hàng'),
        })
      );
      expect(createOrderFromContractModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrders', () => {
    test('UTCID25 - SALE retrieves paginated order list with status filter successfully', async () => {
      // Arrange
      const req = createRequest({
        query: { page: '1', limit: '10', status: 'CONFIRMED' },
      });
      const res = createResponse();
      const mockOrdersResult = {
        orders: [
          { order_id: 1, order_code: 'ORD-01', status: 'CONFIRMED', items: [] },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      };
      getOrdersModel.mockResolvedValue(mockOrdersResult);

      // Act
      await getOrders(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy danh sách đơn hàng thành công',
          pagination: expect.objectContaining({ totalItems: 1 }),
        })
      );
      expect(getOrdersModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrderById', () => {
    test('UTCID26 - SALE views order details by orderId successfully', async () => {
      // Arrange
      const req = createRequest({ params: { id: '100' } });
      const res = createResponse();
      const mockOrderDetail = {
        order_id: 100,
        order_code: 'ORD-100',
        status: 'DELIVERING',
        total_amount: 5000000,
        items: [],
      };
      findOrderByIdModel.mockResolvedValue(mockOrderDetail);

      // Act
      await getOrderById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy chi tiết đơn hàng thành công',
          data: expect.objectContaining({ orderId: 100, orderCode: 'ORD-100', status: 'DELIVERING' }),
        })
      );
      expect(findOrderByIdModel).toHaveBeenCalledWith(100);
    });
  });

  describe('deliverOrder', () => {
    test('UTCID27 - SALE confirms and activates order delivery successfully', async () => {
      // Arrange
      const req = createRequest({
        params: { id: '100' },
        body: {
          deliveryAddress: 'Số 9 Võ Văn Tần, Q3',
          deliveryDate: getFutureDateString(2),
          note: 'Deliver during office hours',
        },
      });
      const res = createResponse();
      const mockDeliveringOrder = {
        order_id: 100,
        status: 'DELIVERING',
        items: [],
      };
      confirmDeliveryModel.mockResolvedValue(mockDeliveringOrder);

      // Act
      await deliverOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Kích hoạt giao hàng thành công',
          data: expect.objectContaining({ status: 'DELIVERING', orderId: 100 }),
        })
      );
      expect(confirmDeliveryModel).toHaveBeenCalledTimes(1);
      expect(confirmDeliveryModel).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ deliveryAddress: 'Số 9 Võ Văn Tần, Q3' })
      );
    });
  });

  describe('completeOrder', () => {
    test('UTCID28 - SALE confirms customer receipt and completes order successfully', async () => {
      // Arrange
      const req = createRequest({ params: { id: '100' } });
      const res = createResponse();
      const mockCompletedOrder = {
        order_id: 100,
        status: 'COMPLETED',
        items: [],
      };
      completeDeliveryModel.mockResolvedValue(mockCompletedOrder);

      // Act
      await completeOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hoàn tất đơn hàng thành công (COMPLETED)',
          data: expect.objectContaining({ status: 'COMPLETED', orderId: 100 }),
        })
      );
      expect(completeDeliveryModel).toHaveBeenCalledTimes(1);
      expect(completeDeliveryModel).toHaveBeenCalledWith(100, expect.any(Object));
    });
  });

  describe('getWarehouseProducts', () => {
    test('UTCID29 - SALE queries POS warehouse products catalog for counter sales', async () => {
      // Arrange
      const req = createRequest({
        query: { page: '1', limit: '12', search: 'Sofa' },
      });
      const res = createResponse();
      const mockProductsData = {
        products: [
          { product_id: 1, product_name: 'Luxury Leather Sofa', stock_quantity: 8 },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 12,
      };
      getProductsWithPagination.mockResolvedValue(mockProductsData);

      // Act
      await getWarehouseProducts(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy danh sách sản phẩm trong kho thành công',
          pagination: expect.objectContaining({ totalItems: 1 }),
          data: expect.arrayContaining([
            expect.objectContaining({ productId: 1, productName: 'Luxury Leather Sofa' }),
          ]),
        })
      );
      expect(getProductsWithPagination).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProductDetail', () => {
    test('UTCID30 - SALE views counter product details by productId successfully', async () => {
      // Arrange
      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();
      const mockProduct = {
        product_id: 1,
        product_name: 'Oak Wood Tea Table',
        product_code: 'TBL-OAK-01',
        price: 2500000,
        stock_quantity: 10,
      };
      findProductById.mockResolvedValue(mockProduct);

      // Act
      await getProductDetail(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy thông tin chi tiết sản phẩm thành công',
          data: expect.objectContaining({ productId: 1, productName: 'Oak Wood Tea Table' }),
        })
      );
      expect(findProductById).toHaveBeenCalledTimes(1);
      expect(findProductById).toHaveBeenCalledWith(1);
    });
  });
});
