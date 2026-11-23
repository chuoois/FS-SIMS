jest.mock('../src/models/ProductionOrderModel', () => ({
  findProductionOrderById: jest.fn(),
  getAllProductionOrders: jest.fn(),
  createProductionOrder: jest.fn(),
  assignLeaderToOrder: jest.fn(),
  cancelProductionOrder: jest.fn(),
  getEligibleCustomerOrders: jest.fn(),
}));

jest.mock('../src/models/userAccount.model', () => ({
  getStaffLeaders: jest.fn(),
}));

jest.mock('../src/models/CustomerOrderModel', () => ({
  findOrderById: jest.fn(),
  ownerInspectOrder: jest.fn(),
}));

const {
  findProductionOrderById,
  getAllProductionOrders,
  createProductionOrder,
  assignLeaderToOrder,
  cancelProductionOrder,
  getEligibleCustomerOrders,
} = require('../src/models/ProductionOrderModel');

const { getStaffLeaders } = require('../src/models/userAccount.model');

const {
  getProductionOrders,
  getEligibleOrders,
  getStaffLeadersList,
  createProductionOrderHandler,
  assignLeader,
} = require('../src/controllers/productionOrderController');

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
    user: { full_name: 'Test Owner', email: 'owner@example.com' },
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

describe('productionOrderController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProductionOrderHandler', () => {
    it('returns 400 when order_id is missing', async () => {
      const req = createRequest({
        body: { planned_start: '2026-11-25', planned_end: '2026-12-05' },
      });
      const res = createResponse();

      await createProductionOrderHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Vui lòng chọn đơn hàng') }),
      );
    });

    it('returns 400 when planned_end < planned_start', async () => {
      const req = createRequest({
        body: { order_id: 1, planned_start: '2026-12-05', planned_end: '2026-11-25' },
      });
      const res = createResponse();

      await createProductionOrderHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('phải lớn hơn hoặc bằng') }),
      );
    });

    it('creates production order successfully with assigned_to provided', async () => {
      createProductionOrder.mockResolvedValue({ production_id: 101 });
      findProductionOrderById.mockResolvedValue({
        production_id: 101,
        production_code: 'LGC-202611-0001',
        production_type: 'CUSTOM',
        order_id: 1,
        status: 'ASSIGNED',
        assigned_to: 5,
        planned_start: '2026-11-25',
        planned_end: '2026-12-05',
      });

      const req = createRequest({
        body: {
          order_id: 1,
          planned_start: '2026-11-25',
          planned_end: '2026-12-05',
          assigned_to: 5,
        },
      });
      const res = createResponse();

      await createProductionOrderHandler(req, res);

      expect(createProductionOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 1,
          plannedStart: '2026-11-25',
          plannedEnd: '2026-12-05',
          assignedTo: 5,
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tạo lệnh gia công thành công.',
          productionOrder: expect.objectContaining({ production_id: 101 }),
        }),
      );
    });

    it('creates production order successfully without assigned_to (assignedTo is undefined/null)', async () => {
      createProductionOrder.mockResolvedValue({ production_id: 102 });
      findProductionOrderById.mockResolvedValue({
        production_id: 102,
        production_code: 'LGC-202611-0002',
        production_type: 'READY',
        order_id: 2,
        status: 'ASSIGNED',
        assigned_to: null,
        planned_start: '2026-11-25',
        planned_end: '2026-12-05',
      });

      const req = createRequest({
        body: {
          order_id: 2,
          planned_start: '2026-11-25',
          planned_end: '2026-12-05',
        },
      });
      const res = createResponse();

      await createProductionOrderHandler(req, res);

      expect(createProductionOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 2,
          plannedStart: '2026-11-25',
          plannedEnd: '2026-12-05',
          assignedTo: null,
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tạo lệnh gia công thành công.',
          productionOrder: expect.objectContaining({ production_id: 102 }),
        }),
      );
    });
  });
});
