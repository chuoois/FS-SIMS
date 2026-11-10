// =========================================================
// productionOrderController.js
// Controller Quản lý Lệnh Gia Công (Manage Production Orders)
// Tuân thủ kiến trúc MVC chuẩn:
// routes/ -> controllers/ -> models/
// Không viết SQL/query Sequelize trực tiếp tại controller
// =========================================================

const {
  findProductionOrderById,
  getAllProductionOrders,
  createProductionOrder,
  assignLeaderToOrder,
  cancelProductionOrder,
  getEligibleCustomerOrders,
} = require('../models/ProductionOrderModel');

const { getStaffLeaders } = require('../models/userAccount.model');

const {
  validateCreateProductionOrderInput,
  validateAssignLeaderInput,
  toProductionOrderDTO,
} = require('../utils/productionOrderValidator');

/**
 * GET /api/production-orders
 * Lấy danh sách lệnh gia công có tìm kiếm, lọc trạng thái và phân trang
 */
async function getProductionOrders(req, res) {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const result = await getAllProductionOrders({
      page: Number(page),
      limit: Number(limit),
      status,
      search,
    });

    return res.status(200).json({
      message: 'Lấy danh sách lệnh gia công thành công',
      productionOrders: (result.productionOrders || []).map(toProductionOrderDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[productionOrderController.getProductionOrders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách lệnh gia công',
      error: error.message,
    });
  }
}

/**
 * GET /api/production-orders/eligible-orders
 * Lấy danh sách đơn hàng CONFIRMED + CUSTOM chưa có lệnh gia công
 */
async function getEligibleOrders(req, res) {
  try {
    const orders = await getEligibleCustomerOrders();
    return res.status(200).json({
      message: 'Lấy danh sách đơn hàng đủ điều kiện thành công',
      data: orders,
    });
  } catch (error) {
    console.error('[productionOrderController.getEligibleOrders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách đơn hàng',
      error: error.message,
    });
  }
}

/**
 * GET /api/production-orders/staff-leaders
 * Lấy danh sách người dùng có role LEADERSTAFF (trưởng nhóm)
 */
async function getStaffLeadersList(req, res) {
  try {
    const leaders = await getStaffLeaders();
    return res.status(200).json({
      message: 'Lấy danh sách trưởng nhóm thành công',
      data: leaders,
    });
  } catch (error) {
    console.error('[productionOrderController.getStaffLeadersList]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách trưởng nhóm',
      error: error.message,
    });
  }
}

/**
 * POST /api/production-orders
 * Tạo mới lệnh gia công từ đơn hàng khách hàng CONFIRMED + CUSTOM
 */
async function createProductionOrderHandler(req, res) {
  try {
    const validation = validateCreateProductionOrderInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { order_id, planned_start, planned_end } = validation.value;
    const userEmail = req.user ? req.user.email : 'system';

    const po = await createProductionOrder({
      orderId: order_id,
      plannedStart: planned_start,
      plannedEnd: planned_end,
      createBy: userEmail,
    });

    const poDetail = await findProductionOrderById(po.production_id);


    return res.status(201).json({
      message: 'Tạo lệnh gia công thành công.',
      productionOrder: toProductionOrderDTO(poDetail),
    });
  } catch (error) {
    console.error('[productionOrderController.createProductionOrderHandler]', error);
    // Business logic errors return 400
    const clientErrors = [
      'Đơn hàng không tồn tại',
      'phải ở trạng thái CONFIRMED',
      'Chỉ đơn hàng loại CUSTOM',
      'đã có lệnh gia công',
    ];
    const isClientError = clientErrors.some((msg) => error.message && error.message.includes(msg));
    return res.status(isClientError ? 400 : 500).json({
      message: error.message || 'Lỗi máy chủ khi tạo lệnh gia công',
      error: error.message,
    });
  }
}

/**
 * PATCH /api/production-orders/:id/assign-leader
 * Gán trưởng nhóm sản xuất cho lệnh gia công
 */
async function assignLeader(req, res) {
  const { id } = req.params;
  const productionId = Number(id);

  if (!productionId || isNaN(productionId) || productionId <= 0) {
    return res.status(400).json({ message: 'ID lệnh gia công không hợp lệ.' });
  }

  try {
    // Kiểm tra lệnh gia công tồn tại
    const existing = await findProductionOrderById(productionId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh gia công.' });
    }

    const validation = validateAssignLeaderInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { assigned_to } = validation.value;
    const userEmail = req.user ? req.user.email : 'system';

    const updated = await assignLeaderToOrder(productionId, assigned_to, userEmail);

    return res.status(200).json({
      message: 'Gán trưởng nhóm thành công.',
      productionOrder: toProductionOrderDTO(updated),
    });
  } catch (error) {
    console.error('[productionOrderController.assignLeader]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi gán trưởng nhóm',
      error: error.message,
    });
  }
}

/**
 * POST /api/production-orders/:id/cancel
 * Hủy lệnh gia công (DRAFT hoặc IN_PROGRESS)
 */
async function cancelProductionOrderHandler(req, res) {
  const { id } = req.params;
  const productionId = Number(id);

  if (!productionId || isNaN(productionId) || productionId <= 0) {
    return res.status(400).json({ message: 'ID lệnh gia công không hợp lệ.' });
  }

  try {
    const existing = await findProductionOrderById(productionId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh gia công.' });
    }

    const userEmail = req.user ? req.user.email : 'system';
    await cancelProductionOrder(productionId, userEmail);


    return res.status(200).json({
      message: 'Hủy lệnh gia công thành công. Đơn hàng liên kết đã được hoàn trả về trạng thái CONFIRMED.',
    });
  } catch (error) {
    console.error('[productionOrderController.cancelProductionOrderHandler]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi hủy lệnh gia công',
      error: error.message,
    });
  }
}


module.exports = {
  getProductionOrders,
  getEligibleOrders,
  getStaffLeadersList,
  createProductionOrderHandler,
  assignLeader,
  cancelProductionOrderHandler,
};

