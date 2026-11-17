// =========================================================
// leaderStaffController.js
// Bộ điều khiển riêng biệt dành cho vai trò Tổ trưởng xưởng (LEADERSTAFF)
// Tách độc lập khỏi orderManagementController để tránh xung đột
// Tuân thủ MVC: Controller chỉ điều phối req/res, gọi qua Model và Validator
// =========================================================

const {
  getOrdersForLeader,
  findOrderById,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
} = require('../models/CustomerOrderModel');

const { toOrderManagementDTO } = require('../utils/orderManagementValidator');

/**
 * 1. GET /api/leader-staff/orders (hoặc /api/order-management/leader/orders)
 * Tổ trưởng xem danh sách các đơn hàng được Owner phân công cho mình
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
    console.error('[leaderStaffController.getLeaderOrders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách đơn của Tổ trưởng',
      error: error.message,
    });
  }
}

/**
 * 2. GET /api/leader-staff/orders/:id
 * Tổ trưởng xem chi tiết bản vẽ kỹ thuật, thông số (D x R x C cm), chất liệu, màu sắc của đơn
 */
async function getLeaderOrderDetail(req, res) {
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
      message: 'Lấy chi tiết đơn hàng sản xuất thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[leaderStaffController.getLeaderOrderDetail]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 3. POST /api/leader-staff/orders/:id/accept
 * Tổ trưởng xác nhận tiếp nhận đơn hàng vào dây chuyền sản xuất của xưởng (chuyển sang IN_PRODUCTION)
 */
async function leaderAccept(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    const leaderId = req.user?.user_account_id || req.user?.id || req.user?.sub;

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const order = await leaderAcceptOrder(orderId, leaderId);
    return res.status(200).json({
      message: 'Tiếp nhận đơn hàng vào sản xuất thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[leaderStaffController.leaderAccept]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi tiếp nhận đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 4. POST /api/leader-staff/orders/:id/progress
 * Tổ trưởng cập nhật tiến độ sản xuất: Đánh dấu Hoàn thành / Chưa hoàn thành
 * Body: { isCompleted: boolean, note/progressNote: string }
 */
async function leaderProgress(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    const leaderId = req.user?.user_account_id || req.user?.id || req.user?.sub;
    const { note, isCompleted, progressNote } = req.body;

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const finalNote = note || progressNote;
    const finalIsCompleted = isCompleted !== undefined ? Boolean(isCompleted) : undefined;

    const order = await leaderUpdateProgress(orderId, leaderId, {
      note: finalNote,
      isCompleted: finalIsCompleted,
    });

    return res.status(200).json({
      message: 'Cập nhật tiến độ sản xuất thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[leaderStaffController.leaderProgress]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi cập nhật tiến độ',
      error: error.message,
    });
  }
}

/**
 * 5 & 6. POST /api/leader-staff/orders/:id/submit-inspection
 * Tổ trưởng gửi yêu cầu nghiệm thu lên Chủ xưởng (chuyển sang UNDER_INSPECTION)
 * Hoặc nhận lại đơn khắc phục và nộp lại nếu Chủ xưởng nghiệm thu chưa đạt
 * Body: { note: string, images: string[] }
 */
async function leaderSubmit(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    const leaderId = req.user?.user_account_id || req.user?.id || req.user?.sub;
    const { note, images } = req.body;

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const order = await leaderSubmitInspection(orderId, leaderId, { note, images });
    return res.status(200).json({
      message: 'Đã gửi yêu cầu nghiệm thu lên Chủ xưởng thành công',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[leaderStaffController.leaderSubmit]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi gửi nghiệm thu',
      error: error.message,
    });
  }
}

module.exports = {
  getLeaderOrders,
  getLeaderOrderDetail,
  leaderAccept,
  leaderProgress,
  leaderSubmit,
};

