const {
  getCustomerOrdersWithPagination,
  findCustomerOrderById,
} = require('../models/CustomerOrderModel');
const { toOrderDTO } = require('../utils/saleOrderValidator');

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
      data: (result.orders || []).map(toOrderDTO),
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

module.exports = { getMyOrders, getMyOrderById };
