const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { UserAccount } = require('./userAccount.model');

// Lazy-load CustomerOrder để tránh circular dependency
let _CustomerOrder = null;
function getCustomerOrder() {
  if (!_CustomerOrder) {
    _CustomerOrder = require('./CustomerOrderModel').CustomerOrder;
  }
  return _CustomerOrder;
}

let _CustomerOrderItem = null;
function getCustomerOrderItem() {
  if (!_CustomerOrderItem) {
    try {
      _CustomerOrderItem = require('./CustomerOrderItemModel').CustomerOrderItem;
    } catch (_e) {}
  }
  return _CustomerOrderItem;
}

let _ProductionOrderItem = null;
function getProductionOrderItem() {
  if (!_ProductionOrderItem) {
    try {
      _ProductionOrderItem = require('./ProductionOrderItemModel').ProductionOrderItem;
    } catch (_e) {}
  }
  return _ProductionOrderItem;
}

const ProductionOrder = sequelize.define(
  'ProductionOrder',
  {
    production_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    production_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    production_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'customer_order', key: 'order_id' },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    planned_start: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    planned_end: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    completed_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'user_account', key: 'user_account_id' },
    },
    note: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createby: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    modifieby: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: 'production_order',
    timestamps: true,
    createdAt: 'createdate',
    updatedAt: 'modifiedate',
    indexes: [
      { name: 'uk_production_order_code', unique: true, fields: ['production_code'] },
      { name: 'idx_production_order_order', unique: false, fields: ['order_id'] },
      { name: 'idx_production_order_status', unique: false, fields: ['status'] },
      { name: 'idx_production_order_assigned', unique: false, fields: ['assigned_to'] },
    ],
  }
);

// Setup safe associations
const isModel = (m) => typeof m === 'function' && typeof m.belongsTo === 'function';

if (isModel(ProductionOrder) && isModel(UserAccount)) {
  if (!ProductionOrder.associations || !ProductionOrder.associations.supervisor) {
    ProductionOrder.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'supervisor' });
  }
}

// Setup CustomerOrder association lazily to avoid circular deps
setImmediate(() => {
  try {
    const CustomerOrder = getCustomerOrder();
    if (isModel(ProductionOrder) && isModel(CustomerOrder)) {
      if (!ProductionOrder.associations || !ProductionOrder.associations.customerOrder) {
        ProductionOrder.belongsTo(CustomerOrder, { foreignKey: 'order_id', as: 'customerOrder' });
      }
    }
  } catch (_e) {
    // Ignore if CustomerOrder not available (e.g. during test mocking)
  }
});

/**
 * Tìm lệnh gia công theo ID
 */
async function findProductionOrderById(productionId) {
  const include = [];
  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'supervisor',
      attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
    });
  }

  return ProductionOrder.findByPk(productionId, { include });
}

/**
 * Tìm lệnh gia công theo mã lệnh
 */
async function findProductionOrderByCode(code) {
  return ProductionOrder.findOne({
    where: { production_code: code },
  });
}

/**
 * Lấy danh sách lệnh gia công khả dụng để xuất nguyên vật liệu
 * (chỉ lấy các lệnh chưa bị hủy)
 */
async function getProductionOrdersForExport(statusFilter = null) {
  const where = {};
  if (statusFilter) {
    where.status = statusFilter;
  } else {
    // Mặc định lấy các lệnh đang hoạt động hoặc chưa hủy
    where.status = { [Op.ne]: 'CANCELLED' };
  }

  const include = [];
  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'supervisor',
      attributes: ['user_account_id', 'full_name'],
    });
  }

  return ProductionOrder.findAll({
    where,
    include,
    order: [['createdate', 'DESC']],
  });
}

/**
 * Lấy danh sách lệnh gia công có phân trang, tìm kiếm, lọc trạng thái
 */
async function getAllProductionOrders({ page = 1, limit = 10, status, search } = {}) {
  const where = {};

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (search && search.trim()) {
    where.production_code = { [Op.like]: `%${search.trim()}%` };
  }

  const offset = (Number(page) - 1) * Number(limit);

  const include = [];

  // Include supervisor (UserAccount)
  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'supervisor',
      attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
    });
  }

  // Include customer order (lazy-loaded to avoid circular deps)
  try {
    const CustomerOrder = getCustomerOrder();
    if (isModel(CustomerOrder)) {
      include.push({
        model: CustomerOrder,
        as: 'customerOrder',
        attributes: ['order_id', 'order_code', 'order_type', 'status', 'contact_name'],
        required: false,
      });
    }
  } catch (_e) {
    // CustomerOrder not available (e.g. test mock), skip
  }

  const { count, rows } = await ProductionOrder.findAndCountAll({
    where,
    include,
    order: [['createdate', 'DESC']],
    limit: Number(limit),
    offset: Number(offset),
    distinct: true,
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / Number(limit)) || 1,
    currentPage: Number(page),
    itemsPerPage: Number(limit),
    productionOrders: rows,
  };
}

/**
 * Sinh mã lệnh gia công tiếp theo: PO-YYYYMMDD-XXXX
 */
async function generateNextProductionOrderCode() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `PO-${dateStr}-`;

  const latest = await ProductionOrder.findOne({
    where: { production_code: { [Op.like]: `${prefix}%` } },
    order: [['production_code', 'DESC']],
    attributes: ['production_code'],
  });

  let nextSeq = 1;
  if (latest && latest.production_code) {
    const parts = latest.production_code.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Tạo mới lệnh gia công từ đơn hàng khách hàng đã CONFIRMED và là loại CUSTOM
 */
async function createProductionOrder({ orderId, plannedStart, plannedEnd, createBy }) {
  return sequelize.transaction(async (t) => {
    const CustomerOrder = getCustomerOrder();

    // Lấy đơn hàng
    const order = await CustomerOrder.findByPk(orderId, { transaction: t });
    if (!order) {
      throw new Error('Đơn hàng không tồn tại.');
    }
    if (order.status !== 'CONFIRMED') {
      throw new Error(`Đơn hàng phải ở trạng thái CONFIRMED để tạo lệnh gia công (trạng thái hiện tại: ${order.status}).`);
    }
    if (order.order_type !== 'CUSTOM') {
      throw new Error(`Chỉ đơn hàng loại CUSTOM mới có thể tạo lệnh gia công (loại hiện tại: ${order.order_type}).`);
    }

    // Kiểm tra đã có lệnh gia công chưa
    const existing = await ProductionOrder.findOne({
      where: { order_id: orderId },
      transaction: t,
    });
    if (existing) {
      throw new Error(`Đơn hàng này đã có lệnh gia công (${existing.production_code}).`);
    }

    const code = await generateNextProductionOrderCode();

    const po = await ProductionOrder.create(
      {
        production_code: code,
        production_type: 'CUSTOM',
        order_id: orderId,
        status: 'DRAFT',
        planned_start: plannedStart || null,
        planned_end: plannedEnd || null,
        createby: createBy || 'system',
      },
      { transaction: t }
    );

    // Tự động sao chép các món từ đơn hàng (customer_order_item) vào lệnh gia công (production_order_item)
    try {
      const CustomerOrderItem = getCustomerOrderItem();
      const ProductionOrderItem = getProductionOrderItem();
      if (isModel(CustomerOrderItem) && isModel(ProductionOrderItem)) {
        const orderItems = await CustomerOrderItem.findAll({
          where: { order_id: orderId },
          transaction: t,
        });
        if (orderItems && orderItems.length > 0) {
          const poItems = orderItems.map((it) => ({
            production_id: po.production_id,
            order_item_id: it.order_item_id,
            quantity_planned: it.quantity,
            quantity_done: 0,
            createby: createBy || 'system',
          }));
          await ProductionOrderItem.bulkCreate(poItems, { transaction: t });
        }
      }
    } catch (errItem) {
      console.warn('Không thể sao chép item sang production_order_item:', errItem.message);
    }

    // Cập nhật trạng thái đơn hàng sang IN_PRODUCTION (hoặc PRODUCTION)
    await CustomerOrder.update(
      { status: 'IN_PRODUCTION', modifieby: createBy || 'system' },
      { where: { order_id: orderId }, transaction: t }
    );

    return po;
  });
}

/**
 * Gán trưởng nhóm sản xuất cho lệnh gia công
 */
async function assignLeaderToOrder(productionId, assignedTo, modifieBy) {
  const po = await ProductionOrder.findByPk(productionId);
  if (!po) {
    throw new Error('Không tìm thấy lệnh gia công.');
  }
  if (po.status === 'CANCELLED') {
    throw new Error('Không thể gán trưởng nhóm cho lệnh gia công đã hủy.');
  }
  if (po.status === 'COMPLETED') {
    throw new Error('Không thể gán trưởng nhóm cho lệnh gia công đã hoàn thành.');
  }

  await po.update({ assigned_to: assignedTo, modifieby: modifieBy || 'system' });
  return findProductionOrderById(productionId);
}

/**
 * Hủy lệnh gia công (DRAFT hoặc IN_PROGRESS), hoàn trả đơn hàng về CONFIRMED
 */
async function cancelProductionOrder(productionId, modifieBy) {
  return sequelize.transaction(async (t) => {
    const po = await ProductionOrder.findByPk(productionId, { transaction: t });
    if (!po) {
      throw new Error('Không tìm thấy lệnh gia công.');
    }
    if (po.status === 'COMPLETED') {
      throw new Error('Không thể hủy lệnh gia công đã hoàn thành.');
    }
    if (po.status === 'CANCELLED') {
      throw new Error('Lệnh gia công đã ở trạng thái hủy.');
    }

    await po.update({ status: 'CANCELLED', modifieby: modifieBy || 'system' }, { transaction: t });

    // Hoàn trả đơn hàng về CONFIRMED nếu có
    if (po.order_id) {
      const CustomerOrder = getCustomerOrder();
      await CustomerOrder.update(
        { status: 'CONFIRMED', modifieby: modifieBy || 'system' },
        { where: { order_id: po.order_id }, transaction: t }
      );
    }

    return po;
  });
}

/**
 * Lấy danh sách đơn hàng đủ điều kiện để tạo lệnh gia công:
 * - Loại CUSTOM
 * - Trạng thái CONFIRMED
 * - Chưa có lệnh gia công
 */
async function getEligibleCustomerOrders() {
  const CustomerOrder = getCustomerOrder();

  // Lấy danh sách order_id đã có lệnh gia công
  const existingPOs = await ProductionOrder.findAll({
    attributes: ['order_id'],
    where: { order_id: { [Op.ne]: null } },
  });
  const usedOrderIds = existingPOs.map((po) => po.order_id).filter(Boolean);

  const where = {
    order_type: 'CUSTOM',
    status: 'CONFIRMED',
  };

  if (usedOrderIds.length > 0) {
    where.order_id = { [Op.notIn]: usedOrderIds };
  }

  return CustomerOrder.findAll({
    where,
    attributes: ['order_id', 'order_code', 'order_type', 'status', 'contact_name', 'total_amount'],
    order: [['order_id', 'DESC']],
  });
}

module.exports = {
  ProductionOrder,
  findProductionOrderById,
  findProductionOrderByCode,
  getProductionOrdersForExport,
  getAllProductionOrders,
  generateNextProductionOrderCode,
  createProductionOrder,
  assignLeaderToOrder,
  cancelProductionOrder,
  getEligibleCustomerOrders,
};
