const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { CustomerOrderItem } = require('./CustomerOrderItemModel');
const { Contract } = require('./ContractModel');
const { ContractItem } = require('./ContractItemModel');
const { Product } = require('./ProductModel');
const { UserAccount } = require('./userAccount.model');

const CustomerOrder = sequelize.define('CustomerOrder', {
  order_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
  order_code: { type: DataTypes.STRING(30), allowNull: false },
  order_type: { type: DataTypes.STRING(20), allowNull: false },
  contract_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'contract', key: 'contract_id' } },
  customer_account_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
  contact_name: { type: DataTypes.STRING(150), allowNull: false },
  contact_phone: { type: DataTypes.STRING(20), allowNull: false },
  delivery_address: { type: DataTypes.STRING(255), allowNull: true },
  total_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  deposit_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  paid_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NEW' },
  expected_date: { type: DataTypes.DATEONLY, allowNull: true },
  delivered_date: { type: DataTypes.DATEONLY, allowNull: true },
  assigned_to: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
  note: { type: DataTypes.STRING(500), allowNull: true },
  createby: { type: DataTypes.STRING(100), allowNull: true },
  modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'customer_order',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [
    { name: 'uk_customer_order_code', unique: true, fields: ['order_code'] },
    { name: 'uk_customer_order_contract', unique: true, fields: ['contract_id'] },
    { name: 'idx_customer_order_type', unique: false, fields: ['order_type'] },
    { name: 'idx_customer_order_status', unique: false, fields: ['status'] },
    { name: 'idx_customer_order_customer', unique: false, fields: ['customer_account_id'] },
    { name: 'idx_customer_order_assigned', unique: false, fields: ['assigned_to'] }
  ],
});

// Setup associations
if (!CustomerOrder.associations || !CustomerOrder.associations.items) {
  CustomerOrder.hasMany(CustomerOrderItem, { foreignKey: 'order_id', as: 'items' });
  CustomerOrderItem.belongsTo(CustomerOrder, { foreignKey: 'order_id', as: 'order' });
}
if (!CustomerOrder.associations || !CustomerOrder.associations.contract) {
  CustomerOrder.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
}
if (!CustomerOrder.associations || !CustomerOrder.associations.staff) {
  CustomerOrder.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'staff' });
}
if (!CustomerOrderItem.associations || !CustomerOrderItem.associations.product) {
  CustomerOrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
}

/**
 * Tự động sinh mã đơn hàng tiếp theo (vd ORD-20261028-0001)
 */
async function generateNextOrderCode() {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  const prefix = `ORD-${dateStr}-`;

  const latest = await CustomerOrder.findOne({
    where: { order_code: { [Op.like]: `${prefix}%` } },
    order: [['order_id', 'DESC']],
    attributes: ['order_code'],
    raw: true,
  });

  if (!latest || !latest.order_code) {
    return `${prefix}0001`;
  }

  const parts = latest.order_code.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  const nextSeq = isNaN(seq) ? 1 : seq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Tạo đơn hàng từ hợp đồng đã ký
 */
async function createOrderFromContract(contractId, { assignedTo, createBy } = {}) {
  const transaction = await sequelize.transaction();
  try {
    const contract = await Contract.findByPk(contractId, {
      include: [
        {
          model: ContractItem,
          as: 'items',
        },
      ],
      transaction,
    });

    if (!contract) {
      throw new Error('Không tìm thấy hợp đồng yêu cầu.');
    }

    if (contract.status !== 'SIGNED') {
      throw new Error(`Hợp đồng chưa được ký (trạng thái hiện tại: ${contract.status}). Vui lòng chốt và ký hợp đồng trước.`);
    }

    // Kiểm tra hợp đồng đã có đơn hàng chưa
    const existingOrder = await CustomerOrder.findOne({
      where: { contract_id: contractId },
      transaction,
    });

    if (existingOrder) {
      throw new Error(`Hợp đồng này đã được tạo đơn hàng (${existingOrder.order_code}).`);
    }

    // Kiểm tra & trừ tồn kho với sản phẩm hàng sẵn (READY)
    for (const item of contract.items) {
      if (item.product_id) {
        const prod = await Product.findByPk(item.product_id, { transaction });
        if (!prod) {
          throw new Error(`Sản phẩm "${item.item_name}" không tìm thấy trong cơ sở dữ liệu.`);
        }
        if (prod.stock_quantity < item.quantity) {
          throw new Error(
            `Sản phẩm "${item.item_name}" trong kho hiện chỉ còn ${prod.stock_quantity}, không đủ để xuất ${item.quantity}.`
          );
        }

        await prod.decrement('stock_quantity', { by: item.quantity, transaction });
      }
    }

    const orderCode = await generateNextOrderCode();

    const order = await CustomerOrder.create(
      {
        order_code: orderCode,
        order_type: contract.contract_type || 'READY',
        contract_id: contract.contract_id,
        customer_account_id: contract.customer_account_id || null,
        contact_name: contract.customer_name,
        contact_phone: contract.customer_phone,
        delivery_address: contract.customer_address || null,
        total_amount: contract.total_amount,
        deposit_amount: contract.deposit_amount,
        paid_amount: contract.deposit_amount, // Ban đầu đã thu cọc
        status: 'CONFIRMED', // Hàng sẵn tại quầy chuyển ngay sang CONFIRMED
        expected_date: contract.delivery_date || null,
        assigned_to: assignedTo || null,
        note: contract.note || null,
        createby: createBy || null,
      },
      { transaction }
    );

    const orderItemsData = contract.items.map((it) => ({
      order_id: order.order_id,
      contract_item_id: it.contract_item_id,
      product_id: it.product_id,
      item_name: it.item_name,
      description: it.description,
      category_id: it.category_id,
      room_id: it.room_id,
      material_id: it.material_id,
      color_id: it.color_id,
      length_cm: it.length_cm,
      width_cm: it.width_cm,
      height_cm: it.height_cm,
      quantity: it.quantity,
      unit_price: it.unit_price,
      createby: createBy || null,
    }));

    await CustomerOrderItem.bulkCreate(orderItemsData, { transaction });

    await transaction.commit();

    return findOrderById(order.order_id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Tìm đơn hàng theo ID
 */
async function findOrderById(orderId) {
  return CustomerOrder.findByPk(orderId, {
    include: [
      {
        model: Contract,
        as: 'contract',
      },
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'price', 'image_url'],
          },
        ],
      },
      {
        model: UserAccount,
        as: 'staff',
        attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
      },
    ],
  });
}

/**
 * Tìm đơn hàng theo mã đơn
 */
async function findOrderByCode(orderCode) {
  if (!orderCode) return null;
  return CustomerOrder.findOne({
    where: { order_code: orderCode.trim() },
    include: [
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'price', 'image_url'],
          },
        ],
      },
    ],
  });
}

/**
 * Tìm đơn hàng theo ID hợp đồng
 */
async function findOrderByContractId(contractId) {
  if (!contractId) return null;
  return CustomerOrder.findOne({
    where: { contract_id: contractId },
    include: [
      {
        model: CustomerOrderItem,
        as: 'items',
      },
    ],
  });
}

/**
 * Lấy danh sách đơn hàng có phân trang, lọc và tìm kiếm
 */
async function getOrdersWithPagination({
  page = 1,
  limit = 10,
  status,
  order_type,
  search,
  search_by,
  order_code,
  customer_name,
  sort = 'NEWEST',
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

  // 1. Tìm kiếm cụ thể theo trường
  if (order_code && order_code.trim()) {
    whereClause.order_code = { [Op.like]: `%${order_code.trim()}%` };
  }
  if (customer_name && customer_name.trim()) {
    whereClause.contact_name = { [Op.like]: `%${customer_name.trim()}%` };
  }

  // 2. Tìm kiếm từ ô search chung
  if (search && search.trim() && !order_code && !customer_name) {
    const trimmed = search.trim();
    if (search_by === 'ORDER_CODE') {
      whereClause.order_code = { [Op.like]: `%${trimmed}%` };
    } else if (search_by === 'CUSTOMER_NAME') {
      whereClause.contact_name = { [Op.like]: `%${trimmed}%` };
    } else if (search_by === 'PHONE') {
      whereClause.contact_phone = { [Op.like]: `%${trimmed}%` };
    } else {
      whereClause[Op.or] = [
        { order_code: { [Op.like]: `%${trimmed}%` } },
        { contact_name: { [Op.like]: `%${trimmed}%` } },
        { contact_phone: { [Op.like]: `%${trimmed}%` } },
      ];
    }
  }

  let orderOptions = [['order_id', 'DESC']];
  if (sort === 'OLDEST') orderOptions = [['order_id', 'ASC']];
  else if (sort === 'AMOUNT_DESC') orderOptions = [['total_amount', 'DESC']];
  else if (sort === 'AMOUNT_ASC') orderOptions = [['total_amount', 'ASC']];

  const { rows, count } = await CustomerOrder.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Contract,
        as: 'contract',
        attributes: ['contract_id', 'contract_code'],
      },
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'image_url'],
          },
        ],
      },
      {
        model: UserAccount,
        as: 'staff',
        attributes: ['user_account_id', 'full_name'],
      },
    ],
    order: orderOptions,
    limit: limitNum,
    offset,
    distinct: true,
  });

  return {
    orders: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limitNum) || 1,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

/**
 * Lấy danh sách đơn hàng thuộc về một tài khoản khách hàng.
 */
async function getCustomerOrdersWithPagination(customerAccountId, { page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const { rows, count } = await CustomerOrder.findAndCountAll({
    where: { customer_account_id: customerAccountId },
    include: [
      {
        model: Contract,
        as: 'contract',
        attributes: ['contract_id', 'contract_code'],
      },
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'image_url'],
          },
        ],
      },
    ],
    order: [['order_id', 'DESC']],
    limit: limitNum,
    offset,
    distinct: true,
  });

  return {
    orders: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limitNum) || 1,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

/**
 * Chỉ tìm đơn hàng nếu đơn đó thuộc về tài khoản khách hàng đang đăng nhập.
 */
async function findCustomerOrderById(orderId, customerAccountId) {
  return CustomerOrder.findOne({
    where: { order_id: orderId, customer_account_id: customerAccountId },
    include: [
      {
        model: Contract,
        as: 'contract',
      },
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'price', 'image_url'],
          },
        ],
      },
      {
        model: UserAccount,
        as: 'staff',
        attributes: ['user_account_id', 'full_name'],
      },
    ],
  });
}

// ============================================================
// Các hàm bổ sung cho Manage Order (Owner / Sales)
// ============================================================

const VALID_STATUSES = ['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'];

/**
 * Hủy đơn hàng (Owner / Sales / Customer)
 * Điều kiện: Đơn chưa COMPLETED và chưa CANCELLED
 */
async function cancelOrder(orderId, { cancelledBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.status === 'COMPLETED') {
    throw new Error('Không thể hủy đơn hàng đã hoàn thành.');
  }
  if (order.status === 'CANCELLED') {
    throw new Error('Đơn hàng này đã được hủy trước đó.');
  }

  await order.update({
    status: 'CANCELLED',
    modifieby: cancelledBy || null,
  });

  return findOrderById(orderId);
}

/**
 * Cập nhật trạng thái đơn hàng (Owner)
 * Các trạng thái hợp lệ: NEW, CONFIRMED, IN_PRODUCTION, COMPLETED, CANCELLED
 */
async function updateOrderStatus(orderId, newStatus, { updatedBy } = {}) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Trạng thái "${newStatus}" không hợp lệ. Các trạng thái hợp lệ: ${VALID_STATUSES.join(', ')}.`);
  }

  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.status === 'CANCELLED') {
    throw new Error('Không thể cập nhật trạng thái đơn hàng đã bị hủy.');
  }
  if (order.status === 'COMPLETED') {
    throw new Error('Không thể cập nhật trạng thái đơn hàng đã hoàn thành.');
  }
  if (order.status === newStatus) {
    throw new Error(`Đơn hàng đã ở trạng thái "${newStatus}".`);
  }

  const updateData = { status: newStatus, modifieby: updatedBy || null };
  if (newStatus === 'COMPLETED') {
    updateData.delivered_date = new Date();
  }

  await order.update(updateData);
  return findOrderById(orderId);
}

module.exports = {
  CustomerOrder,
  generateNextOrderCode,
  createOrderFromContract,
  findOrderById,
  findOrderByCode,
  findOrderByContractId,
  getOrdersWithPagination,
  getCustomerOrdersWithPagination,
  findCustomerOrderById,
  cancelOrder,
  updateOrderStatus,
  VALID_STATUSES,
};
