// =========================================================
// orderManagementController.js
// Bộ điều khiển cho Quản lý Đơn hàng (Owner)
// Tách biệt khỏi saleOrderController để tránh xung đột
// Tuân thủ MVC: Controller chỉ điều phối req/res, gọi qua Model và Validator
// =========================================================

const {
  getOrdersWithPagination,
  findOrderById,
  cancelOrder: cancelOrderModel,
  updateOrderStatus: updateOrderStatusModel,
} = require('../models/CustomerOrderModel');

const {
  validateUpdateStatusInput,
  toOrderManagementDTO,
} = require('../utils/orderManagementValidator');

/**
 * 1. GET /api/order-management
 * Lấy danh sách tất cả đơn hàng (Owner thấy tất cả)
 * Query: search, status, order_type, page, limit
 */
async function getOrders(req, res) {
  try {
    const { search, status, order_type, page = 1, limit = 10 } = req.query;

    const result = await getOrdersWithPagination({
      search: typeof search === 'string' ? search.trim() : '',
      status: typeof status === 'string' ? status.trim().toUpperCase() : 'ALL',
      order_type: typeof order_type === 'string' ? order_type.trim().toUpperCase() : 'ALL',
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
    });

    return res.status(200).json({
      message: 'Lấy danh sách đơn hàng thành công',
      orders: (result.orders || []).map(toOrderManagementDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[orderManagementController.getOrders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 2. GET /api/order-management/:id
 * Lấy chi tiết đơn hàng theo ID
 */
async function getOrderDetail(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết đơn hàng thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.getOrderDetail]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 3. POST /api/order-management/:id/cancel
 * Hủy đơn hàng (Owner / Sales)
 * Điều kiện: Đơn chưa COMPLETED và chưa CANCELLED
 */
async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const order = await cancelOrderModel(orderId, {
      cancelledBy: req.user?.email || 'OWNER',
    });

    return res.status(200).json({
      message: 'Hủy đơn hàng thành công.',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.cancelOrder]', error);
    const isNotFound = error.message && error.message.includes('Không tìm thấy');
    const isClientError = error.message && (
      error.message.includes('đã hoàn thành') ||
      error.message.includes('đã được hủy')
    );
    const statusCode = isNotFound ? 404 : isClientError ? 400 : 500;

    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi hủy đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 4. PATCH /api/order-management/:id/status
 * Cập nhật trạng thái đơn hàng (Owner)
 * Body: { status: 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED' }
 */
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const validation = validateUpdateStatusInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const order = await updateOrderStatusModel(orderId, validation.value.status, {
      updatedBy: req.user?.email || 'OWNER',
    });

    return res.status(200).json({
      message: 'Cập nhật trạng thái đơn hàng thành công.',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.updateOrderStatus]', error);
    const isNotFound = error.message && error.message.includes('Không tìm thấy');
    const isClientError = error.message && (
      error.message.includes('không hợp lệ') ||
      error.message.includes('đã bị hủy') ||
      error.message.includes('đã hoàn thành') ||
      error.message.includes('đã ở trạng thái')
    );
    const statusCode = isNotFound ? 404 : isClientError ? 400 : 500;

    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi cập nhật trạng thái đơn hàng',
      error: error.message,
    });
  }
}

module.exports = {
  getOrders,
  getOrderDetail,
  cancelOrder,
  updateOrderStatus,
};

