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
  assignLeaderToCustomerOrder,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
  ownerInspectOrder,
  getOrdersForLeader,
} = require('../models/CustomerOrderModel');

const {
  getRequestsWithPagination,
  findRequestById,
  reviewOrderRequest,
} = require('../models/SaleRequestModel');

const { UserAccount } = require('../models/userAccount.model');
const { UserRole } = require('../models/userRole.model');
const { toRequestDTO } = require('../utils/saleOrderValidator');

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
      error.message.includes('đã ở trạng thái') ||
      error.message.includes('Không thể chuyển') ||
      error.message.includes('kế tiếp')
    );
    const statusCode = isNotFound ? 404 : isClientError ? 400 : 500;

    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi cập nhật trạng thái đơn hàng',
      error: error.message,
    });
  }
}


/**
 * GET /api/order-management/owner/requests
 * Owner xem danh sách các Order Request cần thẩm định
 */
async function getOwnerRequests(req, res) {
  try {
    const { page = 1, limit = 10, status, search, order_type } = req.query;
    const result = await getRequestsWithPagination({
      page,
      limit,
      status,
      search,
      order_type,
    });

    return res.status(200).json({
      message: 'Lấy danh sách yêu cầu thiết kế thành công',
      data: (result.requests || []).map(toRequestDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[orderManagementController.getOwnerRequests]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách yêu cầu',
      error: error.message,
    });
  }
}

/**
 * GET /api/order-management/owner/requests/:id
 * Owner xem chi tiết một Order Request
 */
async function getOwnerRequestDetail(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const request = await findRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu thiết kế.' });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết yêu cầu thiết kế thành công',
      data: toRequestDTO(request),
    });
  } catch (error) {
    console.error('[orderManagementController.getOwnerRequestDetail]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết yêu cầu',
      error: error.message,
    });
  }
}

/**
 * POST /api/order-management/owner/requests/:id/review
 * Owner thẩm định: REQUEST_CHANGE, REJECT, APPROVE, FINALIZE_DESIGN
 */
async function reviewRequest(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const { action, reason, note } = req.body;
    const reviewedBy = req.user?.email || req.user?.full_name || 'Owner';

    const request = await reviewOrderRequest(requestId, action, {
      reason,
      note,
      reviewedBy,
    });

    return res.status(200).json({
      message: 'Thẩm định và cập nhật trạng thái yêu cầu thiết kế thành công',
      data: toRequestDTO(request),
    });
  } catch (error) {
    console.error('[orderManagementController.reviewRequest]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi thẩm định yêu cầu thiết kế',
      error: error.message,
    });
  }
}

/**
 * GET /api/order-management/leaders
 * Lấy danh sách nhân viên có vai trò Tổ trưởng xưởng (Role LEADERSTAFF)
 */
async function getStaffLeaders(req, res) {
  try {
    const leaderRole = await UserRole.findOne({ where: { role_code: 'LEADERSTAFF' } });
    const roleId = leaderRole ? leaderRole.role_id : 3;

    const leaders = await UserAccount.findAll({
      where: { role_id: roleId, status: 'ACTIVE' },
      attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
      order: [['full_name', 'ASC']],
    });

    return res.status(200).json({
      message: 'Lấy danh sách Tổ trưởng thành công',
      data: leaders.map((l) => ({
        userAccountId: l.user_account_id,
        fullName: l.full_name,
        email: l.email,
        phoneNumber: l.phone_number,
      })),
    });
  } catch (error) {
    console.error('[orderManagementController.getStaffLeaders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách Tổ trưởng',
      error: error.message,
    });
  }
}

/**
 * POST /api/order-management/orders/:id/assign-leader
 * Owner phân công Tổ trưởng phụ trách đơn
 */
async function assignLeader(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    const { leaderId } = req.body;

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }
    if (!leaderId) {
      return res.status(400).json({ message: 'Vui lòng chọn Tổ trưởng phụ trách.' });
    }

    const assignedBy = req.user?.email || req.user?.full_name || 'Owner';
    const order = await assignLeaderToCustomerOrder(orderId, leaderId, { assignedBy });

    return res.status(200).json({
      message: 'Phân công Tổ trưởng thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.assignLeader]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi phân công Tổ trưởng',
      error: error.message,
    });
  }
}

/**
 * POST /api/order-management/orders/:id/inspect
 * Owner nghiệm thu sản phẩm (Đạt hoặc Không đạt)
 */
async function inspectOrder(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    const { passed, rejectReason } = req.body;

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const inspectedBy = req.user?.email || req.user?.full_name || 'Owner';
    const order = await ownerInspectOrder(orderId, {
      passed: Boolean(passed),
      rejectReason,
      inspectedBy,
    });

    return res.status(200).json({
      message: passed ? 'Nghiệm thu đạt yêu cầu' : 'Đã từ chối nghiệm thu, chuyển lại cho Tổ trưởng xử lý',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.inspectOrder]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi nghiệm thu đơn hàng',
      error: error.message,
    });
  }
}

/**
 * GET /api/order-management/leader/orders
 * Tổ trưởng xem danh sách đơn hàng được phân công cho mình
 */
async function getLeaderOrders(req, res) {
  try {
    const leaderId = req.user?.user_account_id || req.user?.id || req.user?.sub;
    const { search, status, page = 1, limit = 10 } = req.query;

    const result = await getOrdersForLeader(leaderId, { search, status, page, limit });

    return res.status(200).json({
      message: 'Lấy danh sách đơn hàng sản xuất thành công',
      orders: (result.orders || []).map(toOrderManagementDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[orderManagementController.getLeaderOrders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách đơn của Tổ trưởng',
      error: error.message,
    });
  }
}

/**
 * POST /api/order-management/leader/orders/:id/accept
 * Tổ trưởng xác nhận tiếp nhận đơn hàng vào sản xuất
 */
async function leaderAccept(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    const leaderId = req.user?.user_account_id || req.user?.id || req.user?.sub;

    const order = await leaderAcceptOrder(orderId, leaderId);
    return res.status(200).json({
      message: 'Tiếp nhận đơn hàng vào sản xuất thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.leaderAccept]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi tiếp nhận đơn hàng',
      error: error.message,
    });
  }
}

/**
 * POST /api/order-management/leader/orders/:id/progress
 * Tổ trưởng cập nhật tiến độ / ghi chú phát sinh
 */
async function leaderProgress(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    const leaderId = req.user?.user_account_id || req.user?.id || req.user?.sub;
    const { note } = req.body;

    const order = await leaderUpdateProgress(orderId, leaderId, { note });
    return res.status(200).json({
      message: 'Cập nhật tiến độ thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.leaderProgress]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi cập nhật tiến độ',
      error: error.message,
    });
  }
}

/**
 * POST /api/order-management/leader/orders/:id/submit-inspection
 * Tổ trưởng hoàn thành và gửi yêu cầu nghiệm thu lên Owner
 */
async function leaderSubmit(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    const leaderId = req.user?.user_account_id || req.user?.id || req.user?.sub;
    const { note } = req.body;

    const order = await leaderSubmitInspection(orderId, leaderId, { note });
    return res.status(200).json({
      message: 'Đã gửi yêu cầu nghiệm thu lên Chủ xưởng thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.leaderSubmit]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi gửi nghiệm thu',
      error: error.message,
    });
  }
}

module.exports = {
  getOrders,
  getOrderDetail,
  cancelOrder,
  updateOrderStatus,
  getOwnerRequests,
  getOwnerRequestDetail,
  reviewRequest,
  getStaffLeaders,
  assignLeader,
  inspectOrder,
  getLeaderOrders,
  leaderAccept,
  leaderProgress,
  leaderSubmit,
};
