// =========================================================
// SaleCustomerModel.js
// Model / Repository dành cho Sale quản lý danh sách Khách hàng
// MVC: Logic truy vấn DB nằm ở Model, không đưa vào Controller
// =========================================================

const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { UserAccount } = require('./userAccount.model');
const { UserRole, findUserRoleByCode } = require('./userRole.model');

// Lazy-load models để tránh circular dependency
function getOrderRequestModel() {
  try { return require('./OrderRequestModel').OrderRequest; } catch { return null; }
}
function getContractModel() {
  try { return require('./ContractModel').Contract; } catch { return null; }
}
function getCustomerOrderModel() {
  try { return require('./CustomerOrderModel').CustomerOrder; } catch { return null; }
}

/**
 * Lấy danh sách khách hàng có phân trang, tìm kiếm và lọc
 * @param {object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} options.search      - Từ khoá tìm kiếm
 * @param {string} options.search_by   - ALL | NAME | EMAIL | PHONE
 * @param {string} options.status      - ALL | ACTIVE | INACTIVE
 * @returns {{ customers, totalItems, totalPages, currentPage, itemsPerPage }}
 */
async function getCustomersWithPagination({
  page = 1,
  limit = 10,
  search,
  search_by = 'ALL',
  status,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  // Lấy role_id của CUSTOMER
  const customerRole = typeof findUserRoleByCode === 'function'
    ? await findUserRoleByCode('CUSTOMER')
    : (UserRole && typeof UserRole.findOne === 'function' ? await UserRole.findOne({ where: { role_code: 'CUSTOMER' }, raw: true }) : null);
  if (!customerRole) {
    return { customers: [], totalItems: 0, totalPages: 0, currentPage: pageNum, itemsPerPage: limitNum };
  }

  const where = { role_id: customerRole.role_id };

  // Filter theo status
  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }

  // Filter theo search
  if (search && search.trim()) {
    const q = search.trim();
    const by = (search_by || 'ALL').toUpperCase();
    if (by === 'NAME') {
      where.full_name = { [Op.like]: `%${q}%` };
    } else if (by === 'EMAIL') {
      where.email = { [Op.like]: `%${q}%` };
    } else if (by === 'PHONE') {
      where.phone_number = { [Op.like]: `%${q}%` };
    } else {
      // ALL: tìm theo tên, email hoặc SĐT
      where[Op.or] = [
        { full_name: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
        { phone_number: { [Op.like]: `%${q}%` } },
      ];
    }
  }

  const { count, rows } = await UserAccount.findAndCountAll({
    where,
    attributes: [
      'user_account_id',
      'full_name',
      'email',
      'phone_number',
      'status',
      'address',
      'gender',
      'dob',
      'createdate',
    ],
    order: [['createdate', 'DESC']],
    limit: limitNum,
    offset,
    raw: true,
  });

  const totalItems = count;
  const totalPages = Math.ceil(totalItems / limitNum);

  // Lấy stats (số yêu cầu, hợp đồng, đơn hàng) cho từng khách
  const customerIds = rows.map((r) => r.user_account_id);
  let statsMap = {};

  if (customerIds.length > 0) {
    // Đếm order_request
    const requestCounts = await sequelize.query(
      `SELECT customer_account_id, COUNT(*) AS cnt
       FROM order_request
       WHERE customer_account_id IN (:ids)
       GROUP BY customer_account_id`,
      { replacements: { ids: customerIds }, type: sequelize.QueryTypes.SELECT }
    );
    // Đếm contract
    const contractCounts = await sequelize.query(
      `SELECT customer_account_id, COUNT(*) AS cnt
       FROM contract
       WHERE customer_account_id IN (:ids)
       GROUP BY customer_account_id`,
      { replacements: { ids: customerIds }, type: sequelize.QueryTypes.SELECT }
    );
    // Đếm customer_order
    const orderCounts = await sequelize.query(
      `SELECT customer_account_id, COUNT(*) AS cnt
       FROM customer_order
       WHERE customer_account_id IN (:ids)
       GROUP BY customer_account_id`,
      { replacements: { ids: customerIds }, type: sequelize.QueryTypes.SELECT }
    );

    customerIds.forEach((id) => {
      statsMap[id] = { totalRequests: 0, totalContracts: 0, totalOrders: 0 };
    });
    requestCounts.forEach((r) => {
      if (statsMap[r.customer_account_id]) statsMap[r.customer_account_id].totalRequests = Number(r.cnt);
    });
    contractCounts.forEach((r) => {
      if (statsMap[r.customer_account_id]) statsMap[r.customer_account_id].totalContracts = Number(r.cnt);
    });
    orderCounts.forEach((r) => {
      if (statsMap[r.customer_account_id]) statsMap[r.customer_account_id].totalOrders = Number(r.cnt);
    });
  }

  const customers = rows.map((r) => ({
    ...r,
    ...(statsMap[r.user_account_id] || { totalRequests: 0, totalContracts: 0, totalOrders: 0 }),
  }));

  return { customers, totalItems, totalPages, currentPage: pageNum, itemsPerPage: limitNum };
}

/**
 * Lấy chi tiết 1 khách hàng kèm lịch sử yêu cầu, hợp đồng, đơn hàng
 * @param {number} customerId
 * @returns {object|null}
 */
async function findCustomerById(customerId) {
  const customerRole = typeof findUserRoleByCode === 'function'
    ? await findUserRoleByCode('CUSTOMER')
    : (UserRole && typeof UserRole.findOne === 'function' ? await UserRole.findOne({ where: { role_code: 'CUSTOMER' }, raw: true }) : null);

  const account = await UserAccount.findOne({
    where: {
      user_account_id: customerId,
      ...(customerRole ? { role_id: customerRole.role_id } : {}),
    },
    attributes: { exclude: ['password_hash'] },
    raw: true,
  });

  if (!account) return null;

  // Lịch sử yêu cầu (order_request)
  const requests = await sequelize.query(
    `SELECT request_id, request_code, order_type, status, note, createdate
     FROM order_request
     WHERE customer_account_id = :id
     ORDER BY createdate DESC
     LIMIT 20`,
    { replacements: { id: customerId }, type: sequelize.QueryTypes.SELECT }
  );

  // Lịch sử hợp đồng (contract)
  const contracts = await sequelize.query(
    `SELECT contract_id, contract_code, source, contract_type, status,
            total_amount, deposit_amount, signed_date, createdate
     FROM contract
     WHERE customer_account_id = :id
     ORDER BY createdate DESC
     LIMIT 20`,
    { replacements: { id: customerId }, type: sequelize.QueryTypes.SELECT }
  );

  // Lịch sử đơn hàng (customer_order)
  const orders = await sequelize.query(
    `SELECT order_id, order_code, order_type, status,
            total_amount, paid_amount, expected_date, delivered_date, createdate
     FROM customer_order
     WHERE customer_account_id = :id
     ORDER BY createdate DESC
     LIMIT 20`,
    { replacements: { id: customerId }, type: sequelize.QueryTypes.SELECT }
  );

  return { ...account, requests, contracts, orders };
}

module.exports = { getCustomersWithPagination, findCustomerById };

