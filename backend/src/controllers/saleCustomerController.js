// =========================================================
// saleCustomerController.js
// Bộ điều khiển quản lý Khách hàng dành cho Role Bán hàng (Sale)
// Chức năng: Tìm kiếm, phân trang, Autocomplete (Dropdown), Chi tiết, Tạo mới, Cập nhật & Xóa khách hàng
// Chuẩn hóa format API theo AGENTS.md & docs/CONVENTIONS.md:
// Success: { status, message, data, meta, instance, traceId, timestamp }
// Error: { status, message, detail, ... }
// =========================================================

const {
  getCustomersWithPagination: getCustomersModel,
  findCustomerById: findCustomerByIdModel,
  createCustomerBySales: createCustomerBySalesModel,
  updateCustomerBySales: updateCustomerBySalesModel,
  deleteCustomerBySales: deleteCustomerBySalesModel,
} = require('../models/SaleCustomerModel');

const {
  getCustomersForSales,
} = require('../models/SaleRequestModel');

const {
  validateCreateSaleCustomerInput,
  validateUpdateSaleCustomerInput,
} = require('../utils/saleCustomerValidator');

const { buildSuccessResponse } = require('../utils/successResponse');

function sendErrorJson(res, status, message, extra = {}) {
  return res.status(status).json({
    status,
    message,
    detail: message,
    ...extra,
  });
}

function parsePositiveId(rawId) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * GET /api/sale-orders/customers
 * Lấy danh sách khách hàng dành cho Sales:
 * - Nếu mode=dropdown hoặc không có page: trả về danh sách phục vụ dropdown/autocomplete
 * - Nếu có phân trang (page): trả về danh sách có phân trang và thống kê
 */
async function getSaleCustomers(req, res) {
  try {
    const { page, limit, search, search_by, status, mode } = req.query;

    // Dropdown / Autocomplete cho tạo đơn
    if (mode === 'dropdown' || req.query.autocomplete === 'true') {
      const customers = await getCustomersForSales({ search });
      const mapped = (customers || []).map((c) => ({
        customerAccountId: c.user_account_id,
        fullName: c.full_name,
        phoneNumber: c.phone_number,
        email: c.email,
        address: c.address,
      }));
      const responsePayload = buildSuccessResponse({
        status: 200,
        message: 'Lấy danh sách khách hàng thành công',
        data: mapped,
        req,
      });
      responsePayload.customers = mapped;
      return res.status(200).json(responsePayload);
    }

    // Phân trang & Quản lý khách hàng mặc định (chuẩn AGENTS.md / CONVENTIONS.md)
    const result = await getCustomersModel({ page, limit, search, search_by, status });
    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Lấy danh sách khách hàng thành công',
      data: result.customers,
      meta: {
        page: result.currentPage,
        limit: result.itemsPerPage,
        total: result.totalItems,
        totalPages: result.totalPages,
      },
      req,
    });
    responsePayload.pagination = {
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
    };
    responsePayload.customers = result.customers;
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleCustomerController.getSaleCustomers]', error);
    return res.status(500).json({
      status: 500,
      message: 'Lỗi máy chủ khi lấy danh sách khách hàng',
      detail: error.message || 'Lỗi máy chủ khi lấy danh sách khách hàng',
      error: error.message,
    });
  }
}

/**
 * GET /api/sale-orders/customers/:id
 * Lấy chi tiết thông tin khách hàng kèm lịch sử yêu cầu, hợp đồng và đơn hàng
 */
async function getSaleCustomerById(req, res) {
  try {
    const { id } = req.params;
    const customer = await findCustomerByIdModel(id);
    if (!customer) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy khách hàng',
        detail: 'Không tìm thấy khách hàng',
      });
    }
    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Lấy thông tin khách hàng thành công',
      data: customer,
      req,
    });
    responsePayload.customer = customer;
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleCustomerController.getSaleCustomerById]', error);
    return res.status(500).json({
      status: 500,
      message: 'Lỗi máy chủ khi lấy thông tin khách hàng',
      detail: error.message || 'Lỗi máy chủ khi lấy thông tin khách hàng',
      error: error.message,
    });
  }
}

/**
 * POST /api/sale-orders/customers
 * Tạo mới khách hàng trực tiếp từ màn hình Bán hàng (Sale)
 */
async function createSaleCustomer(req, res) {
  try {
    const validation = validateCreateSaleCustomerInput(req.body);
    if (!validation.isValid) {
      return sendErrorJson(res, 400, validation.error);
    }

    const { fullName, phoneNumber, email, address, note } = validation.value;

    const newCustomer = await createCustomerBySalesModel({
      fullName,
      phoneNumber,
      email,
      address,
      note,
      createBy: req.user?.email || 'SALES',
    });

    const responsePayload = buildSuccessResponse({
      status: 201,
      message: 'Tạo khách hàng mới thành công',
      data: newCustomer,
      req,
    });
    responsePayload.customer = newCustomer;
    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error('[saleCustomerController.createSaleCustomer]', error);
    const isDuplicate = error.message && error.message.includes('đã được sử dụng');
    const status = isDuplicate ? 409 : 500;
    const detail = error.message || (isDuplicate ? 'Dữ liệu khách hàng bị trùng lặp' : 'Lỗi hệ thống khi tạo khách hàng mới');
    return sendErrorJson(res, status, detail, { error: error.message });
  }
}

/**
 * PUT /api/sale-orders/customers/:id
 * Cập nhật thông tin khách hàng dành cho Role Sale
 */
async function updateSaleCustomer(req, res) {
  const customerId = parsePositiveId(req.params?.id);
  if (!customerId) {
    return sendErrorJson(res, 400, 'ID khách hàng không hợp lệ.');
  }

  try {
    const validation = validateUpdateSaleCustomerInput(req.body);
    if (!validation.isValid) {
      return sendErrorJson(res, 400, validation.error);
    }

    const updatedCustomer = await updateCustomerBySalesModel(customerId, {
      ...validation.value,
      modifieBy: req.user?.email || 'SALES',
    });

    if (!updatedCustomer) {
      return sendErrorJson(res, 404, 'Không tìm thấy khách hàng');
    }

    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Cập nhật thông tin khách hàng thành công',
      data: updatedCustomer,
      req,
    });
    responsePayload.customer = updatedCustomer;
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleCustomerController.updateSaleCustomer]', error);
    const isDuplicate = error.message && error.message.includes('đã được sử dụng');
    const status = isDuplicate ? 409 : 500;
    const detail = error.message || (isDuplicate ? 'Dữ liệu khách hàng bị trùng lặp' : 'Lỗi hệ thống khi cập nhật khách hàng');
    return sendErrorJson(res, status, detail, { error: error.message });
  }
}

/**
 * DELETE /api/sale-orders/customers/:id
 * Xóa khách hàng dành cho Role Sale (chỉ xóa khi chưa phát sinh yêu cầu, hợp đồng hoặc đơn hàng)
 */
async function deleteSaleCustomer(req, res) {
  const customerId = parsePositiveId(req.params?.id);
  if (!customerId) {
    return sendErrorJson(res, 400, 'ID khách hàng không hợp lệ.');
  }

  try {
    const result = await deleteCustomerBySalesModel(customerId);
    if (!result || result.reason === 'NOT_FOUND') {
      return sendErrorJson(res, 404, 'Không tìm thấy khách hàng');
    }

    if (result.reason === 'HAS_RELATIONS') {
      const counts = result.counts || {};
      const parts = [];
      if (counts.totalRequests > 0) parts.push(`${counts.totalRequests} yêu cầu`);
      if (counts.totalContracts > 0) parts.push(`${counts.totalContracts} hợp đồng`);
      if (counts.totalOrders > 0) parts.push(`${counts.totalOrders} đơn hàng`);
      const customerName = result.customer?.full_name || `#${customerId}`;
      const detail = `Không thể xóa vì khách hàng "${customerName}" đã phát sinh ${parts.join(', ') || 'giao dịch'} trong hệ thống. Để bảo toàn lịch sử dữ liệu, vui lòng chuyển trạng thái sang Ngừng hoạt động (INACTIVE).`;
      return sendErrorJson(res, 409, detail, {
        suggestAction: 'INACTIVE',
        counts,
      });
    }

    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Xóa khách hàng thành công',
      data: null,
      req,
    });
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleCustomerController.deleteSaleCustomer]', error);
    const isFkError = error.name === 'SequelizeForeignKeyConstraintError';
    const status = isFkError ? 409 : 500;
    const detail = isFkError
      ? 'Không thể xóa khách hàng do đang có dữ liệu giao dịch liên quan. Vui lòng chuyển trạng thái sang Ngừng hoạt động (INACTIVE).'
      : 'Lỗi hệ thống khi xóa khách hàng';
    return sendErrorJson(res, status, detail, {
      ...(isFkError ? { suggestAction: 'INACTIVE' } : {}),
      error: error.message,
    });
  }
}

module.exports = {
  getSaleCustomers,
  getSaleCustomerById,
  createSaleCustomer,
  updateSaleCustomer,
  deleteSaleCustomer,
  // Alias
  getCustomers: getSaleCustomers,
  getCustomerById: getSaleCustomerById,
  createCustomer: createSaleCustomer,
  updateCustomer: updateSaleCustomer,
  deleteCustomer: deleteSaleCustomer,
};
