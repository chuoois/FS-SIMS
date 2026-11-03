// =========================================================
// SaleRequestModel.js
// Model / Repository dành cho Sale quản lý Order Requests từ khách hàng
// MVC: Logic truy vấn DB nằm ở Model, không đưa vào Controller
// =========================================================

const { Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { OrderRequest } = require('./OrderRequestModel');
const { OrderRequestItem } = require('./OrderRequestItemModel');
const { OrderRequestImage } = require('./OrderRequestImageModel');
const { UserAccount } = require('./userAccount.model');
const { Contract } = require('./ContractModel');
const { ContractItem } = require('./ContractItemModel');

// Setup associations (guard to avoid re-define)
if (!OrderRequest.associations || !OrderRequest.associations.items) {
  OrderRequest.hasMany(OrderRequestItem, { foreignKey: 'request_id', as: 'items' });
  OrderRequestItem.belongsTo(OrderRequest, { foreignKey: 'request_id', as: 'request' });
}
if (!OrderRequest.associations || !OrderRequest.associations.images) {
  OrderRequest.hasMany(OrderRequestImage, { foreignKey: 'request_id', as: 'images' });
}
if (!OrderRequest.associations || !OrderRequest.associations.customer) {
  OrderRequest.belongsTo(UserAccount, { foreignKey: 'customer_account_id', as: 'customer' });
}
if (!OrderRequest.associations || !OrderRequest.associations.assignee) {
  OrderRequest.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'assignee' });
}
if (!OrderRequest.associations || !OrderRequest.associations.contract) {
  OrderRequest.hasOne(Contract, { foreignKey: 'request_id', as: 'contract' });
}

/**
 * Lấy danh sách request của khách hàng có tìm kiếm, lọc và phân trang
 */
async function getRequestsWithPagination({
  page = 1,
  limit = 10,
  status,
  search,
  search_by,
  order_type,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {};

  if (status && status !== 'ALL') {
    whereClause.status = status;
  }
  if (order_type && order_type !== 'ALL') {
    whereClause.order_type = order_type;
  }
  if (search && search.trim()) {
    const trimmed = search.trim();
    const by = (search_by || 'ALL').toUpperCase();
    if (by === 'CUSTOMER_NAME') {
      whereClause.contact_name = { [Op.like]: `%${trimmed}%` };
    } else if (by === 'REQUEST_CODE') {
      whereClause.request_code = { [Op.like]: `%${trimmed}%` };
    } else if (by === 'PHONE') {
      whereClause.contact_phone = { [Op.like]: `%${trimmed}%` };
    } else {
      whereClause[Op.or] = [
        { request_code: { [Op.like]: `%${trimmed}%` } },
        { contact_name: { [Op.like]: `%${trimmed}%` } },
        { contact_phone: { [Op.like]: `%${trimmed}%` } },
      ];
    }
  }

  const { rows, count } = await OrderRequest.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: UserAccount,
        as: 'customer',
        attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
      },
      {
        model: UserAccount,
        as: 'assignee',
        attributes: ['user_account_id', 'full_name'],
      },
      {
        model: OrderRequestItem,
        as: 'items',
        required: false,
      },
      {
        model: Contract,
        as: 'contract',
        attributes: ['contract_id', 'contract_code', 'status'],
        required: false,
      },
    ],
    order: [['request_id', 'DESC']],
    limit: limitNum,
    offset,
    distinct: true,
  });

  return {
    requests: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limitNum) || 1,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

/**
 * Tìm request theo ID (đầy đủ thông tin cho Detail Modal)
 */
async function findRequestById(requestId) {
  return OrderRequest.findByPk(requestId, {
    include: [
      {
        model: UserAccount,
        as: 'customer',
        attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
      },
      {
        model: UserAccount,
        as: 'assignee',
        attributes: ['user_account_id', 'full_name'],
      },
      {
        model: OrderRequestItem,
        as: 'items',
        required: false,
      },
      {
        model: OrderRequestImage,
        as: 'images',
        required: false,
      },
      {
        model: Contract,
        as: 'contract',
        attributes: ['contract_id', 'contract_code', 'status'],
        required: false,
      },
    ],
  });
}

/**
 * Chuyển đổi request thành hợp đồng (DRAFT).
 * - Tạo contract mới với source = 'ONLINE', contract_type = order_type của request
 * - Tạo ContractItem từ các OrderRequestItem (dùng unit_price đã có sẵn hoặc quoted_price)
 * - Cập nhật request status → 'PROCESSING'
 * - Gắn request_id vào contract
 */
async function convertRequestToContract({
  requestId,
  depositAmount,
  deliveryDate,
  signedPlace,
  terms,
  note,
  signedBy,
  createBy,
}) {
  const transaction = await sequelize.transaction();
  try {
    const request = await OrderRequest.findByPk(requestId, {
      include: [{ model: OrderRequestItem, as: 'items' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!request) {
      const err = new Error('Không tìm thấy yêu cầu.');
      err.statusCode = 404;
      throw err;
    }
    if (request.status === 'CONVERTED') {
      const err = new Error('Yêu cầu này đã được chuyển thành hợp đồng trước đó.');
      err.statusCode = 409;
      throw err;
    }
    if (request.status === 'REJECTED') {
      const err = new Error('Yêu cầu đã bị từ chối, không thể chuyển thành hợp đồng.');
      err.statusCode = 409;
      throw err;
    }
    if (!request.items || request.items.length === 0) {
      const err = new Error('Yêu cầu không có sản phẩm nào, không thể tạo hợp đồng.');
      err.statusCode = 400;
      throw err;
    }

    // Kiểm tra contract đã tồn tại chưa (unique constraint request_id)
    const existingContract = await Contract.findOne({
      where: { request_id: requestId },
      transaction,
    });
    if (existingContract) {
      const err = new Error('Yêu cầu này đã được chuyển thành hợp đồng trước đó.');
      err.statusCode = 409;
      throw err;
    }

    // Tính tổng tiền từ các item
    const totalAmount = request.items.reduce((sum, item) => {
      const price = Number(item.unit_price) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);

    // Quy tắc đặt cọc
    const minDeposit = totalAmount > 10000000 ? Math.round(totalAmount * 0.3) : 0;
    const finalDeposit = depositAmount !== null && depositAmount !== undefined
      ? Number(depositAmount)
      : minDeposit;

    // Sinh mã hợp đồng
    const { generateNextContractCode } = require('./ContractModel');
    const contractCode = await generateNextContractCode();

    // Tạo contract
    const contract = await Contract.create({
      contract_code: contractCode,
      source: 'ONLINE',
      contract_type: request.order_type || 'READY',
      request_id: requestId,
      customer_account_id: request.customer_account_id || null,
      customer_name: request.contact_name,
      customer_phone: request.contact_phone,
      customer_address: request.delivery_address || null,
      total_amount: totalAmount,
      deposit_amount: finalDeposit,
      status: 'DRAFT',
      signed_place: signedPlace || 'Cửa hàng Góc Nhà',
      delivery_date: deliveryDate || request.expected_date || null,
      terms: terms || null,
      signed_by: signedBy || null,
      note: note || null,
      createby: createBy,
    }, { transaction });

    // Tạo contract items
    const contractItemsData = request.items.map((item) => {
      const hasProductId = Boolean(item.product_id);
      return {
        contract_id: contract.contract_id,
        product_id: hasProductId ? item.product_id : null,
        request_item_id: hasProductId ? null : (item.request_item_id || null),
        item_name: item.item_name,
        category_id: item.category_id || null,
        room_id: item.room_id || null,
        material_id: item.material_id || null,
        color_id: item.color_id || null,
        length_cm: item.length_cm || null,
        width_cm: item.width_cm || null,
        height_cm: item.height_cm || null,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        description: item.description || null,
        createby: createBy,
      };
    });

    await ContractItem.bulkCreate(contractItemsData, { transaction });

    // Cập nhật trạng thái request
    request.status = 'CONVERTED';
    request.approved_at = new Date();
    request.modifieby = createBy;
    await request.save({ transaction });

    await transaction.commit();

    // Trả về contract đã tạo (không eager load ở đây, sẽ load lại ở controller)
    return {
      contractId: contract.contract_id,
      contractCode: contract.contract_code,
      requestCode: request.request_code,
      totalAmount,
      depositAmount: finalDeposit,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  getRequestsWithPagination,
  findRequestById,
  convertRequestToContract,
};

