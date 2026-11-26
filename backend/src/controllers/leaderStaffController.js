// =========================================================
// leaderStaffController.js
// Bộ điều khiển riêng biệt dành cho vai trò Tổ trưởng xưởng (LEADERSTAFF)
// Tuân thủ MVC & chuẩn format response AGENTS.md / docs/prompts/CONVENTIONS.md:
// Success: buildSuccessResponse({ status, message, data, meta, req })
// Error: throw ApiError(status, detail) -> next(err)
// =========================================================

const {
  getOrdersForLeader,
  findOrderById,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
} = require('../models/CustomerOrderModel');

const { toOrderManagementDTO } = require('../utils/orderManagementValidator');
const { ApiError } = require('../utils/ApiError');
const { buildSuccessResponse } = require('../utils/successResponse');

function getErrorForNext(error, detail, defaultStatus = 500) {
  if (error instanceof ApiError) return error;

  const apiError = new ApiError(defaultStatus, detail);
  apiError.cause = error;
  return apiError;
}

function mapLeaderActionError(error, fallbackDetail) {
  if (error instanceof ApiError) return error;

  const msg = error?.message || fallbackDetail;
  if (msg.includes('Không tìm thấy')) {
    return getErrorForNext(error, msg, 404);
  }
  if (msg.includes('không được phân công') || msg.includes('không có quyền')) {
    return getErrorForNext(error, msg, 403);
  }
  return getErrorForNext(error, msg, 400);
}

function parseOrderIdParam(id) {
  const orderId = parseInt(id, 10);
  if (!orderId || Number.isNaN(orderId) || orderId <= 0) {
    throw new ApiError(400, 'Mã đơn hàng không hợp lệ.');
  }
  return orderId;
}

function getLeaderUserId(req) {
  return req.user?.user_account_id || req.user?.id || req.user?.sub;
}

/**
 * 1. GET /api/leader-staff/orders (hoặc /api/order-management/leader/orders)
 * Tổ trưởng xem danh sách các đơn hàng được Owner phân công cho mình
 */
async function getLeaderOrders(req, res, next) {
  try {
    const leaderId = getLeaderUserId(req);
    const {
      search,
      search_by,
      order_code,
      customer_name,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getOrdersForLeader(leaderId, {
      search,
      search_by,
      order_code,
      customer_name,
      status,
      page,
      limit,
    });

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy danh sách đơn hàng sản xuất thành công',
      data: (result.orders || []).map(toOrderManagementDTO),
      meta: {
        page: result.currentPage,
        limit: result.itemsPerPage,
        total: result.totalItems,
        totalPages: result.totalPages,
      },
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy danh sách đơn của Tổ trưởng'));
  }
}

/**
 * 2. GET /api/leader-staff/orders/:id
 * Tổ trưởng xem chi tiết bản vẽ kỹ thuật, thông số (D x R x C cm), chất liệu, màu sắc của đơn
 */
async function getLeaderOrderDetail(req, res, next) {
  try {
    const orderId = parseOrderIdParam(req.params.id);

    const order = await findOrderById(orderId);
    if (!order) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng.');
    }

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy chi tiết đơn hàng sản xuất thành công',
      data: toOrderManagementDTO(order),
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy chi tiết đơn hàng'));
  }
}

/**
 * 3. POST /api/leader-staff/orders/:id/accept
 * Tổ trưởng xác nhận tiếp nhận đơn hàng vào dây chuyền sản xuất của xưởng (chuyển sang IN_PRODUCTION)
 */
async function leaderAccept(req, res, next) {
  try {
    const orderId = parseOrderIdParam(req.params.id);
    const leaderId = getLeaderUserId(req);

    const order = await leaderAcceptOrder(orderId, leaderId);
    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Tiếp nhận đơn hàng vào sản xuất thành công',
      data: toOrderManagementDTO(order),
      req,
    }));
  } catch (error) {
    return next(mapLeaderActionError(error, 'Lỗi khi tiếp nhận đơn hàng'));
  }
}

/**
 * 4. POST /api/leader-staff/orders/:id/progress
 * Tổ trưởng cập nhật tiến độ sản xuất: Đánh dấu Hoàn thành / Chưa hoàn thành
 * Body: { isCompleted: boolean, note/progressNote: string }
 */
async function leaderProgress(req, res, next) {
  try {
    const orderId = parseOrderIdParam(req.params.id);
    const leaderId = getLeaderUserId(req);
    const { note, isCompleted, progressNote } = req.body;

    const finalNote = note || progressNote;
    const finalIsCompleted = isCompleted !== undefined ? Boolean(isCompleted) : undefined;

    const order = await leaderUpdateProgress(orderId, leaderId, {
      note: finalNote,
      isCompleted: finalIsCompleted,
    });

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Cập nhật tiến độ sản xuất thành công',
      data: toOrderManagementDTO(order),
      req,
    }));
  } catch (error) {
    return next(mapLeaderActionError(error, 'Lỗi khi cập nhật tiến độ'));
  }
}

/**
 * 5 & 6. POST /api/leader-staff/orders/:id/submit-inspection
 * Tổ trưởng gửi yêu cầu nghiệm thu lên Chủ xưởng (chuyển sang UNDER_INSPECTION)
 * Hoặc nhận lại đơn khắc phục và nộp lại nếu Chủ xưởng nghiệm thu chưa đạt
 * Body: { note: string, images: string[] }
 */
async function leaderSubmit(req, res, next) {
  try {
    const orderId = parseOrderIdParam(req.params.id);
    const leaderId = getLeaderUserId(req);
    const { note, images } = req.body;

    const order = await leaderSubmitInspection(orderId, leaderId, { note, images });
    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Đã gửi yêu cầu nghiệm thu lên Chủ xưởng thành công',
      data: toOrderManagementDTO(order),
      req,
    }));
  } catch (error) {
    return next(mapLeaderActionError(error, 'Lỗi khi gửi nghiệm thu'));
  }
}

/**
 * 7. POST /api/leader-staff/upload-inspection-image
 * Trả về danh sách URL ảnh nghiệm thu đã tải lên Cloudinary
 */
function uploadInspectionImage(req, res, next) {
  try {
    const urls = (req.files || []).map((f) => f.path || f.url || f.secure_url).filter(Boolean);
    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Tải lên hình ảnh nghiệm thu thành công',
      data: urls,
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi tải ảnh nghiệm thu'));
  }
}

module.exports = {
  getLeaderOrders,
  getLeaderOrderDetail,
  leaderAccept,
  leaderProgress,
  leaderSubmit,
  uploadInspectionImage,
};
