// =========================================================
// saleCustomerController.js
// Bộ điều khiển quản lý Khách hàng dành cho Role Bán hàng (Sale)
// Chức năng: Tìm kiếm, phân trang, Autocomplete (Dropdown), Chi tiết & Tạo mới khách hàng tại quầy
// =========================================================

const {
  getCustomersWithPagination: getCustomersModel,
  findCustomerById: findCustomerByIdModel,
  createCustomerBySales: createCustomerBySalesModel,
} = require('../models/SaleCustomerModel');

const {
  getCustomersForSales,
} = require('../models/SaleRequestModel');

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
      return res.status(200).json({
        message: 'Lấy danh sách khách hàng thành công',
        data: (customers || []).map((c) => ({
          customerAccountId: c.user_account_id,
          fullName: c.full_name,
          phoneNumber: c.phone_number,
          email: c.email,
          address: c.address,
        })),
      });
    }

    // Phân trang & Quản lý khách hàng mặc định
    const result = await getCustomersModel({ page, limit, search, search_by, status });
    return res.status(200).json({
      message: 'Lấy danh sách khách hàng thành công',
      data: result.customers,
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[saleCustomerController.getSaleCustomers]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách khách hàng',
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
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }
    return res.status(200).json({ message: 'Lấy thông tin khách hàng thành công', data: customer });
  } catch (error) {
    console.error('[saleCustomerController.getSaleCustomerById]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy thông tin khách hàng', error: error.message });
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
      return res.status(400).json({ message: 'Họ và tên khách hàng là bắt buộc.' });
    }
    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return res.status(400).json({ message: 'Số điện thoại khách hàng là bắt buộc.' });
    }
    const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
    if (!PHONE_REGEX.test(phoneNumber.trim())) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ (từ 7 đến 20 ký tự số).' });
    }
    if (email && email.trim()) {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ message: 'Địa chỉ email không đúng định dạng.' });
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

    return res.status(201).json({
      message: 'Tạo khách hàng mới thành công',
      data: newCustomer,
    });
  } catch (error) {
    console.error('[saleCustomerController.createSaleCustomer]', error);
    const isDuplicate = error.message && error.message.includes('đã được sử dụng');
    return res.status(isDuplicate ? 409 : 500).json({
      message: error.message || 'Lỗi hệ thống khi tạo khách hàng mới',
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
