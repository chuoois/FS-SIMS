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
 * Helper lấy role_id của CUSTOMER
 */
async function getCustomerRoleId() {
  const customerRole = typeof findUserRoleByCode === 'function'
    ? await findUserRoleByCode('CUSTOMER')
    : (UserRole && typeof UserRole.findOne === 'function' ? await UserRole.findOne({ where: { role_code: 'CUSTOMER' }, raw: true }) : null);
  return customerRole ? customerRole.role_id : null;
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
  const customerRoleId = await getCustomerRoleId();
  if (!customerRoleId) {
    return { customers: [], totalItems: 0, totalPages: 0, currentPage: pageNum, itemsPerPage: limitNum };
  }

  const where = { role_id: customerRoleId };

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
      'note',
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
  const statsMap = await getCustomerRelationStatsMap(customerIds);

  const customers = rows.map((r) => ({
    ...r,
    ...(statsMap[r.user_account_id] || { totalRequests: 0, totalContracts: 0, totalOrders: 0 }),
  }));

  return { customers, totalItems, totalPages, currentPage: pageNum, itemsPerPage: limitNum };
}

/**
 * Helper đếm số lượng yêu cầu, hợp đồng, đơn hàng theo danh sách ID khách hàng
 */
async function getCustomerRelationStatsMap(customerIds = []) {
  const statsMap = {};
  if (!Array.isArray(customerIds) || customerIds.length === 0) return statsMap;

  customerIds.forEach((id) => {
    statsMap[id] = { totalRequests: 0, totalContracts: 0, totalOrders: 0 };
  });

  const [requestCounts, contractCounts, orderCounts] = await Promise.all([
    sequelize.query(
      `SELECT customer_account_id, COUNT(*) AS cnt
       FROM order_request
       WHERE customer_account_id IN (:ids)
       GROUP BY customer_account_id`,
      { replacements: { ids: customerIds }, type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT customer_account_id, COUNT(*) AS cnt
       FROM contract
       WHERE customer_account_id IN (:ids)
       GROUP BY customer_account_id`,
      { replacements: { ids: customerIds }, type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT customer_account_id, COUNT(*) AS cnt
       FROM customer_order
       WHERE customer_account_id IN (:ids)
       GROUP BY customer_account_id`,
      { replacements: { ids: customerIds }, type: sequelize.QueryTypes.SELECT }
    ),
  ]);

  (requestCounts || []).forEach((r) => {
    if (statsMap[r.customer_account_id]) statsMap[r.customer_account_id].totalRequests = Number(r.cnt);
  });
  (contractCounts || []).forEach((r) => {
    if (statsMap[r.customer_account_id]) statsMap[r.customer_account_id].totalContracts = Number(r.cnt);
  });
  (orderCounts || []).forEach((r) => {
    if (statsMap[r.customer_account_id]) statsMap[r.customer_account_id].totalOrders = Number(r.cnt);
  });

  return statsMap;
}

/**
 * Lấy chi tiết 1 khách hàng kèm lịch sử yêu cầu, hợp đồng, đơn hàng
 * @param {number|string} customerId
 * @returns {object|null}
 */
async function findCustomerById(customerId) {
  const accountId = parseInt(customerId, 10) || customerId;
  const customerRoleId = await getCustomerRoleId();
  const where = { user_account_id: accountId };
  if (customerRoleId) where.role_id = customerRoleId;

  const account = await UserAccount.findOne({
    where,
    attributes: { exclude: ['password_hash'] },
    raw: true,
  });

  if (!account) return null;

  let requests = [];
  let contracts = [];
  let orders = [];

  // Lịch sử yêu cầu (order_request)
  try {
    requests = await sequelize.query(
      `SELECT request_id, request_code, order_type, status, title, description, staff_note, createdate
       FROM order_request
       WHERE customer_account_id = :id
       ORDER BY createdate DESC
       LIMIT 20`,
      { replacements: { id: accountId }, type: sequelize.QueryTypes.SELECT }
    );
  } catch (err) {
    console.error('[SaleCustomerModel.findCustomerById] Lỗi truy vấn order_request:', err.message);
  }

  // Lịch sử hợp đồng (contract)
  try {
    contracts = await sequelize.query(
      `SELECT contract_id, contract_code, contract_type, status,
              total_amount, deposit_amount, signed_date, createdate
       FROM contract
       WHERE customer_account_id = :id
       ORDER BY createdate DESC
       LIMIT 20`,
      { replacements: { id: accountId }, type: sequelize.QueryTypes.SELECT }
    );
  } catch (err) {
    console.error('[SaleCustomerModel.findCustomerById] Lỗi truy vấn contract:', err.message);
  }

  // Lịch sử đơn hàng (customer_order)
  try {
    orders = await sequelize.query(
      `SELECT order_id, order_code, order_type, status,
              total_amount, paid_amount, expected_date, delivered_date, createdate
       FROM customer_order
       WHERE customer_account_id = :id
       ORDER BY createdate DESC
       LIMIT 20`,
      { replacements: { id: accountId }, type: sequelize.QueryTypes.SELECT }
    );
  } catch (err) {
    console.error('[SaleCustomerModel.findCustomerById] Lỗi truy vấn customer_order:', err.message);
  }

  return { ...account, requests, contracts, orders };
}

/**
 * Tạo mới khách hàng bởi Nhân viên kinh doanh (Sale)
 */
async function createCustomerBySales({ fullName, phoneNumber, email, address, note, createBy }) {
  const bcrypt = require('bcryptjs');
  const roleId = (await getCustomerRoleId()) || 4;

  const cleanFullName = (fullName || '').trim();
  const cleanPhone = (phoneNumber || '').trim();
  let cleanEmail = (email || '').trim().toLowerCase();

  // Nếu không nhập email, sinh email định danh tự động duy nhất
  if (!cleanEmail) {
    cleanEmail = `kh_${cleanPhone.replace(/\D/g, '') || Date.now()}@customer.gocnha.local`;
  }

  const existingEmail = await UserAccount.findOne({ where: { email: cleanEmail } });
  if (existingEmail) {
    throw new Error(`Email "${cleanEmail}" đã được sử dụng bởi một tài khoản khác.`);
  }

  const defaultPassword = cleanPhone || 'GocNha@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const newAccount = await UserAccount.create({
    role_id: roleId,
    email: cleanEmail,
    password_hash: passwordHash,
    status: 'ACTIVE',
    full_name: cleanFullName,
    phone_number: cleanPhone || null,
    address: (address || '').trim() || null,
    note: (note || '').trim() || null,
    createby: createBy || 'SALES',
  });

  return {
    customerAccountId: newAccount.user_account_id,
    fullName: newAccount.full_name,
    phoneNumber: newAccount.phone_number,
    email: newAccount.email,
    address: newAccount.address,
    note: newAccount.note,
    status: newAccount.status,
    createdate: newAccount.createdate,
  };
}

/**
 * Cập nhật thông tin khách hàng bởi Nhân viên kinh doanh (Sale)
 * Chỉ cập nhật tài khoản thuộc role CUSTOMER
 */
async function updateCustomerBySales(
  customerId,
  { fullName, phoneNumber, email, address, note, gender, dob, status, modifieBy } = {}
) {
  const accountId = parseInt(customerId, 10) || customerId;
  const roleId = (await getCustomerRoleId()) || 4;

  const existing = await UserAccount.findOne({
    where: { user_account_id: accountId, role_id: roleId },
    attributes: { exclude: ['password_hash'] },
    raw: true,
  });

  if (!existing) return null;

  const updateFields = {
    modifieby: modifieBy || 'SALES',
    modifiedate: new Date(),
  };

  if (fullName !== undefined) updateFields.full_name = fullName.trim();
  if (phoneNumber !== undefined) updateFields.phone_number = phoneNumber ? phoneNumber.trim() : null;

  if (email !== undefined && email !== null && String(email).trim() !== '') {
    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail !== (existing.email || '').toLowerCase()) {
      const duplicateEmail = await UserAccount.findOne({
        where: {
          email: cleanEmail,
          user_account_id: { [Op.ne]: accountId },
        },
        raw: true,
      });
      if (duplicateEmail) {
        throw new Error(`Email "${cleanEmail}" đã được sử dụng bởi một tài khoản khác.`);
      }
    }
    updateFields.email = cleanEmail;
  }

  if (address !== undefined) updateFields.address = address ? address.trim() : null;
  if (note !== undefined) updateFields.note = note ? note.trim() : null;
  if (gender !== undefined) updateFields.gender = gender || null;
  if (dob !== undefined) updateFields.dob = dob || null;
  if (status !== undefined) updateFields.status = String(status).trim().toUpperCase();

  await UserAccount.update(updateFields, {
    where: { user_account_id: accountId, role_id: roleId },
  });

  const updated = await UserAccount.findOne({
    where: { user_account_id: accountId, role_id: roleId },
    attributes: { exclude: ['password_hash'] },
    raw: true,
  });

  return updated || { ...existing, ...updateFields };
}

/**
 * Xóa khách hàng bởi Nhân viên kinh doanh (Sale)
 * Chỉ xóa khi khách hàng chưa phát sinh yêu cầu, hợp đồng hoặc đơn hàng nào
 */
async function deleteCustomerBySales(customerId) {
  const accountId = parseInt(customerId, 10) || customerId;
  const roleId = (await getCustomerRoleId()) || 4;

  const existing = await UserAccount.findOne({
    where: { user_account_id: accountId, role_id: roleId },
    attributes: { exclude: ['password_hash'] },
    raw: true,
  });

  if (!existing) {
    return { deleted: false, reason: 'NOT_FOUND' };
  }

  const statsMap = await getCustomerRelationStatsMap([accountId]);
  const counts = statsMap[accountId] || { totalRequests: 0, totalContracts: 0, totalOrders: 0 };

  if (counts.totalRequests > 0 || counts.totalContracts > 0 || counts.totalOrders > 0) {
    return {
      deleted: false,
      reason: 'HAS_RELATIONS',
      customer: existing,
      counts,
    };
  }

  const affected = await UserAccount.destroy({
    where: { user_account_id: accountId, role_id: roleId },
  });

  return {
    deleted: affected > 0,
    reason: affected > 0 ? null : 'NOT_FOUND',
  };
}

module.exports = {
  getCustomersWithPagination,
  findCustomerById,
  createCustomerBySales,
  updateCustomerBySales,
  deleteCustomerBySales,
};

