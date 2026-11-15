const {
  getCustomerOrdersWithPagination,
  findCustomerOrderById,
  findCustomerOrderRequestById,
} = require('../models/CustomerOrderModel');
const { toOrderDTO } = require('../utils/saleOrderValidator');

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

async function getMyOrders(req, res) {
  try {
    const customerAccountId = Number(req.user?.sub);
    if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
      return res.status(401).json({ message: 'Tài khoản khách hàng không hợp lệ.' });
    }

    const result = await getCustomerOrdersWithPagination(customerAccountId, {
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      message: 'Lấy danh sách đơn hàng của bạn thành công',
      data: (result.orders || []).map(({ recordType, record }) =>
        recordType === 'REQUEST' ? toCustomerOrderRequestDTO(record) : toOrderDTO(record)
      ),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[customerOrderController.getMyOrders]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy đơn hàng của bạn.' });
  }
}

async function getMyOrderRequestById(req, res) {
  try {
    const customerAccountId = Number(req.user?.sub);
    const requestId = Number(req.params.id);
    if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
      return res.status(401).json({ message: 'Tài khoản khách hàng không hợp lệ.' });
    }
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const request = await findCustomerOrderRequestById(requestId, customerAccountId);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết yêu cầu thành công',
      data: toCustomerOrderRequestDTO(request),
    });
  } catch (error) {
    console.error('[customerOrderController.getMyOrderRequestById]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết yêu cầu.' });
  }
}

async function getMyOrderById(req, res) {
  try {
    const customerAccountId = Number(req.user?.sub);
    const orderId = Number(req.params.id);
    if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
      return res.status(401).json({ message: 'Tài khoản khách hàng không hợp lệ.' });
    }
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const order = await findCustomerOrderById(orderId, customerAccountId);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết đơn hàng thành công',
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error('[customerOrderController.getMyOrderById]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết đơn hàng.' });
  }
}

module.exports = { getMyOrders, getMyOrderById, getMyOrderRequestById };
