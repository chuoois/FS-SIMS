const {
  getCustomerOrdersWithPagination,
  findCustomerOrderById,
  findCustomerOrderRequestById,
} = require('../models/CustomerOrderModel');
const { toOrderDTO } = require('../utils/saleOrderValidator');
const { ApiError } = require('../utils/ApiError');
const { buildSuccessResponse } = require('../utils/successResponse');

function getErrorForNext(error, detail) {
  if (error instanceof ApiError) return error;

  const apiError = new ApiError(500, detail);
  apiError.cause = error;
  return apiError;
}

function toCustomerOrderRequestDTO(raw) {
  const request = raw.toJSON ? raw.toJSON() : raw;
  return {
    requestId: request.request_id,
    requestCode: request.request_code,
    title: request.title,
    description: request.description,
    contactName: request.contact_name,
    contactPhone: request.contact_phone,
    deliveryAddress: request.delivery_address,
    status: request.status,
    expectedDate: request.expected_date,
    budgetMin: request.budget_min,
    budgetMax: request.budget_max,
    quotedPrice: request.quoted_price,
    rejectReason: request.reject_reason,
    createdAt: request.createdate,
    items: (request.items || []).map((item) => ({
      requestItemId: item.request_item_id,
      itemName: item.item_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      description: item.description,
      lengthCm: item.length_cm,
      widthCm: item.width_cm,
      heightCm: item.height_cm,
    })),
  };
}

async function getMyOrders(req, res, next) {
  try {
    const customerAccountId = Number(req.user?.sub);
    if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
      throw new ApiError(401, 'Tài khoản khách hàng không hợp lệ.');
    }

    const result = await getCustomerOrdersWithPagination(customerAccountId, {
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy danh sách đơn hàng của bạn thành công',
      data: (result.orders || []).map(({ recordType, record }) =>
        recordType === 'REQUEST' ? toCustomerOrderRequestDTO(record) : toOrderDTO(record)
      ),
      meta: {
        page: result.currentPage,
        limit: result.itemsPerPage,
        total: result.totalItems,
        totalPages: result.totalPages,
      },
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy đơn hàng của bạn.'));
  }
}

async function getMyOrderRequestById(req, res, next) {
  try {
    const customerAccountId = Number(req.user?.sub);
    const requestId = Number(req.params.id);
    if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
      throw new ApiError(401, 'Tài khoản khách hàng không hợp lệ.');
    }
    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new ApiError(400, 'Mã yêu cầu không hợp lệ.');
    }

    const request = await findCustomerOrderRequestById(requestId, customerAccountId);
    if (!request) {
      throw new ApiError(404, 'Không tìm thấy yêu cầu.');
    }

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy chi tiết yêu cầu thành công',
      data: toCustomerOrderRequestDTO(request),
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy chi tiết yêu cầu.'));
  }
}

async function getMyOrderById(req, res, next) {
  try {
    const customerAccountId = Number(req.user?.sub);
    const orderId = Number(req.params.id);
    if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
      throw new ApiError(401, 'Tài khoản khách hàng không hợp lệ.');
    }
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new ApiError(400, 'Mã đơn hàng không hợp lệ.');
    }

    const order = await findCustomerOrderById(orderId, customerAccountId);
    if (!order) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng.');
    }

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy chi tiết đơn hàng thành công',
      data: toOrderDTO(order),
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy chi tiết đơn hàng.'));
  }
}

module.exports = { getMyOrders, getMyOrderById, getMyOrderRequestById };
