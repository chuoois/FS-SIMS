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
async function getOrdersWithPagination({ page = 1, limit = 10, status, order_type, search } = {}) {
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
    whereClause[Op.or] = [
      { order_code: { [Op.like]: `%${trimmed}%` } },
      { contact_name: { [Op.like]: `%${trimmed}%` } },
      { contact_phone: { [Op.like]: `%${trimmed}%` } },
    ];
  }

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

module.exports = {
  CustomerOrder,
  generateNextOrderCode,
  createOrderFromContract,
  findOrderById,
  findOrderByCode,
  findOrderByContractId,
  getOrdersWithPagination,
};
