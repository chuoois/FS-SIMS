// =========================================================
// saleCustomerController.js
// Bộ điều khiển quản lý Khách hàng dành cho Role Bán hàng (Sale)
// Chức năng: Tìm kiếm, phân trang, Autocomplete (Dropdown), Chi tiết & Tạo mới khách hàng tại quầy
// Chuẩn hóa format API theo AGENTS.md & docs/CONVENTIONS.md:
// Success: { status, message, data, meta, instance, traceId, timestamp }
// Error: { status, message, detail, ... }
// =========================================================

const {
  getCustomersWithPagination: getCustomersModel,
  findCustomerById: findCustomerByIdModel,
  createCustomerBySales: createCustomerBySalesModel,
} = require('../models/SaleCustomerModel');

const {
  getCustomersForSales,
} = require('../models/SaleRequestModel');

const { buildSuccessResponse } = require('../utils/successResponse');

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
    const { fullName, phoneNumber, email, address, note } = req.body;
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({
        status: 400,
        message: 'Họ và tên khách hàng là bắt buộc.',
        detail: 'Họ và tên khách hàng là bắt buộc.',
      });
    }
    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return res.status(400).json({
        status: 400,
        message: 'Số điện thoại khách hàng là bắt buộc.',
        detail: 'Số điện thoại khách hàng là bắt buộc.',
      });
    }
    const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
    if (!PHONE_REGEX.test(phoneNumber.trim())) {
      return res.status(400).json({
        status: 400,
        message: 'Số điện thoại không hợp lệ (từ 7 đến 20 ký tự số).',
        detail: 'Số điện thoại không hợp lệ (từ 7 đến 20 ký tự số).',
      });
    }
    if (email && email.trim()) {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({
          status: 400,
          message: 'Địa chỉ email không đúng định dạng.',
          detail: 'Địa chỉ email không đúng định dạng.',
        });
      }
    }

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
    return res.status(status).json({
      status,
      message: detail,
      detail,
      error: error.message,
    });
  }
}

module.exports = {
  getSaleCustomers,
  getSaleCustomerById,
  createSaleCustomer,
  // Alias
  getCustomers: getSaleCustomers,
  getCustomerById: getSaleCustomerById,
  createCustomer: createSaleCustomer,
};
