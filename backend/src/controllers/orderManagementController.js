// =========================================================
// orderManagementController.js
// Bộ điều khiển cho Quản lý Đơn hàng (Owner & Leader)
// Tách biệt khỏi saleOrderController để tránh xung đột
// Tuân thủ MVC: Controller chỉ điều phối req/res, gọi qua Model và Validator
// =========================================================

const {
  getOrdersWithPagination,
  findOrderById,
  cancelOrder: cancelOrderModel,
  updateOrderStatus: updateOrderStatusModel,
  assignLeaderToCustomerOrder: assignLeaderModel,
  leaderAcceptOrder: leaderAcceptModel,
  leaderUpdateProgress: leaderUpdateProgressModel,
  leaderSubmitInspection: leaderSubmitInspectionModel,
  ownerInspectOrder: ownerInspectOrderModel,
  getOrdersForLeader: getOrdersForLeaderModel,
} = require('../models/CustomerOrderModel');

const {
  getRequestsWithPagination: getRequestsModel,
  findRequestById: findRequestByIdModel,
  reviewOrderRequest: reviewOrderRequestModel,
} = require('../models/SaleRequestModel');

const { getStaffLeaders: getStaffLeadersModel } = require('../models/userAccount.model');

const {
  validateUpdateStatusInput,
  toOrderManagementDTO,
} = require('../utils/orderManagementValidator');

const { toRequestDTO } = require('../utils/saleOrderValidator');

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
 * 5. GET /api/order-management/requests
 * Owner xem danh sách tất cả yêu cầu đơn hàng từ Sales
 */
async function getRequestsForOwner(req, res) {
  try {
    const { search, search_by, status, order_type, page = 1, limit = 10 } = req.query;
    const result = await getRequestsModel({
      search: typeof search === 'string' ? search.trim() : '',
      search_by: typeof search_by === 'string' ? search_by.trim().toUpperCase() : 'ALL',
      status: typeof status === 'string' ? status.trim().toUpperCase() : 'ALL',
      order_type: typeof order_type === 'string' ? order_type.trim().toUpperCase() : 'ALL',
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
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
    console.error('[orderManagementController.getRequestsForOwner]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách yêu cầu thiết kế',
      error: error.message,
    });
  }
}

/**
 * 6. GET /api/order-management/requests/:id
 * Owner xem chi tiết 1 yêu cầu thiết kế
 */
async function getRequestDetailForOwner(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const request = await findRequestByIdModel(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu thiết kế.' });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết yêu cầu thiết kế thành công',
      data: toRequestDTO(request),
    });
  } catch (error) {
    console.error('[orderManagementController.getRequestDetailForOwner]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi xem chi tiết yêu cầu',
      error: error.message,
    });
  }
}

/**
 * 7. POST /api/order-management/requests/:id/review
 * Owner duyệt, yêu cầu chỉnh sửa, từ chối hoặc chốt thiết kế cuối cùng
 * Body: { action: 'APPROVE' | 'FINALIZE_DESIGN' | 'REQUEST_CHANGE' | 'REJECT', reason, note }
 */
async function reviewRequest(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const { action, reason, note } = req.body;
    if (!action) {
      return res.status(400).json({ message: 'Hành động duyệt (action) là bắt buộc.' });
    }

    const updated = await reviewOrderRequestModel(requestId, action, {
      reason,
      note,
      reviewedBy: req.user?.email || 'OWNER',
    });

    const actionTextMap = {
      APPROVE: 'Duyệt thiết kế thành công',
      FINALIZE_DESIGN: 'Chốt thiết kế cuối cùng thành công. Thiết kế đã được khóa để lập hợp đồng và sản xuất',
      REQUEST_CHANGE: 'Đã gửi yêu cầu chỉnh sửa lại cho Sales',
      REJECT: 'Từ chối yêu cầu đơn hàng thành công',
    };

    return res.status(200).json({
      message: actionTextMap[action.toUpperCase()] || 'Cập nhật trạng thái duyệt thành công',
      data: toRequestDTO(updated),
    });
  } catch (error) {
    console.error('[orderManagementController.reviewRequest]', error);
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi duyệt yêu cầu thiết kế',
      error: error.message,
    });
  }
}

/**
 * 8. GET /api/order-management/leaders
 * Lấy danh sách tài khoản Tổ trưởng (LeaderStaff) có quyền sản xuất
 */
async function getStaffLeadersList(req, res) {
  try {
    const leaders = await getStaffLeadersModel();
    return res.status(200).json({
      message: 'Lấy danh sách Tổ trưởng thành công',
      data: leaders,
    });
  } catch (error) {
    console.error('[orderManagementController.getStaffLeadersList]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách Tổ trưởng',
      error: error.message,
    });
  }
}

/**
 * 9. POST /api/order-management/:id/assign-leader
 * Owner phân công Tổ trưởng phụ trách đơn hàng
 * Body: { leaderId }
 */
async function assignLeader(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const { leaderId, leader_id } = req.body;
    const targetLeaderId = parseInt(leaderId || leader_id, 10);
    if (!targetLeaderId || isNaN(targetLeaderId) || targetLeaderId <= 0) {
      return res.status(400).json({ message: 'Vui lòng chọn Tổ trưởng phụ trách hợp lệ.' });
    }

    const order = await assignLeaderModel(orderId, targetLeaderId, req.user?.email || 'OWNER');

    return res.status(200).json({
      message: 'Phân công Tổ trưởng thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.assignLeader]', error);
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi phân công Tổ trưởng',
      error: error.message,
    });
  }
}

/**
 * 10. POST /api/order-management/:id/inspection
 * Owner nghiệm thu sản phẩm: PASSED (Đạt) hoặc FAILED (Không đạt kèm lý do)
 * Body: { result: 'PASSED' | 'FAILED', reason, note }
 */
async function inspectOrder(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const { result, reason, note } = req.body;
    if (!result) {
      return res.status(400).json({ message: 'Kết quả nghiệm thu (result) là bắt buộc.' });
    }

    const order = await ownerInspectOrderModel(orderId, {
      result,
      reason,
      note,
      inspectedBy: req.user?.email || 'OWNER',
    });

    const isPassed = String(result).toUpperCase() === 'PASSED';
    return res.status(200).json({
      message: isPassed
        ? 'Nghiệm thu đạt yêu cầu. Đơn hàng đã chuyển lại cho Sales để chuẩn bị giao hàng.'
        : 'Nghiệm thu không đạt. Đơn hàng đã được chuyển lại cho Tổ trưởng xử lý.',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.inspectOrder]', error);
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi nghiệm thu đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 11. GET /api/order-management/leader/orders
 * Leader xem danh sách các đơn hàng được phân công cho mình
 */
async function getLeaderOrders(req, res) {
  try {
    const leaderId = req.user?.sub;
    const { page = 1, limit = 10, status, search } = req.query;

    const result = await getOrdersForLeaderModel(leaderId, {
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
      status,
      search,
    });

    return res.status(200).json({
      message: 'Lấy danh sách đơn hàng của Tổ trưởng thành công',
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
      message: 'Lỗi máy chủ khi lấy danh sách đơn hàng của Tổ trưởng',
      error: error.message,
    });
  }
}

/**
 * 12. POST /api/order-management/leader/orders/:id/accept
 * Leader xác nhận tiếp nhận đơn hàng
 */
async function leaderAccept(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const order = await leaderAcceptModel(orderId, req.user?.sub, req.user?.email || 'LEADER');

    return res.status(200).json({
      message: 'Tổ trưởng đã xác nhận tiếp nhận sản xuất thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.leaderAccept]', error);
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi tiếp nhận đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 13. PATCH /api/order-management/leader/orders/:id/progress
 * Leader cập nhật tiến độ, ghi chú vấn đề phát sinh
 */
async function leaderProgress(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const { note } = req.body;
    const order = await leaderUpdateProgressModel(orderId, req.user?.sub, {
      note,
      modifieBy: req.user?.email || 'LEADER',
    });

    return res.status(200).json({
      message: 'Cập nhật tiến độ thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.leaderProgress]', error);
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi cập nhật tiến độ',
      error: error.message,
    });
  }
}

/**
 * 14. POST /api/order-management/leader/orders/:id/submit-inspection
 * Leader xác nhận hoàn thành sản xuất & gửi Owner yêu cầu nghiệm thu
 */
async function leaderSubmitInspection(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const { note } = req.body;
    const order = await leaderSubmitInspectionModel(orderId, req.user?.sub, {
      note,
      modifieBy: req.user?.email || 'LEADER',
    });

    return res.status(200).json({
      message: 'Đã hoàn thành sản xuất và gửi Chủ xưởng yêu cầu nghiệm thu thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[orderManagementController.leaderSubmitInspection]', error);
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi gửi yêu cầu nghiệm thu',
      error: error.message,
    });
  }
}

module.exports = {
  getOrders,
  getOrderDetail,
  cancelOrder,
  updateOrderStatus,
  getRequestsForOwner,
  getRequestDetailForOwner,
  reviewRequest,
  getStaffLeadersList,
  assignLeader,
  inspectOrder,
  getLeaderOrders,
  leaderAccept,
  leaderProgress,
  leaderSubmitInspection,
};
