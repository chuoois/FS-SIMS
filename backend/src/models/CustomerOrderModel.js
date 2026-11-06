const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { CustomerOrderItem } = require('./CustomerOrderItemModel');
const { Contract } = require('./ContractModel');
const { ContractItem } = require('./ContractItemModel');
const { Product } = require('./ProductModel');
const { UserAccount } = require('./userAccount.model');
const { ProductCategory } = require('./ProductCategoryModel');
const { ProductRoom } = require('./ProductRoomModel');
const { ProductMaterial } = require('./ProductMaterialModel');
const { ProductColor } = require('./ProductColorModel');

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
<<<<<<< Updated upstream
  CustomerOrder.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'staff' });
=======
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') {
    CustomerOrder.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'staff' });
  }
>>>>>>> Stashed changes
}
if (!CustomerOrderItem.associations || !CustomerOrderItem.associations.product) {
  if (typeof Product === 'function' && typeof Product.belongsTo === 'function') {
    CustomerOrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  }
}
if (!CustomerOrderItem.associations || !CustomerOrderItem.associations.category) {
  if (typeof ProductCategory === 'function' && typeof ProductCategory.belongsTo === 'function') {
    CustomerOrderItem.belongsTo(ProductCategory, { foreignKey: 'category_id', as: 'category' });
  }
}
if (!CustomerOrderItem.associations || !CustomerOrderItem.associations.room) {
  if (typeof ProductRoom === 'function' && typeof ProductRoom.belongsTo === 'function') {
    CustomerOrderItem.belongsTo(ProductRoom, { foreignKey: 'room_id', as: 'room' });
  }
}
if (!CustomerOrderItem.associations || !CustomerOrderItem.associations.material) {
  if (typeof ProductMaterial === 'function' && typeof ProductMaterial.belongsTo === 'function') {
    CustomerOrderItem.belongsTo(ProductMaterial, { foreignKey: 'material_id', as: 'material' });
  }
}
if (!CustomerOrderItem.associations || !CustomerOrderItem.associations.color) {
  if (typeof ProductColor === 'function' && typeof ProductColor.belongsTo === 'function') {
    CustomerOrderItem.belongsTo(ProductColor, { foreignKey: 'color_id', as: 'color' });
  }
}

// Contract -> OrderRequest association guard
if (!Contract.associations || !Contract.associations.request) {
  const { OrderRequest } = require('./OrderRequestModel');
  if (typeof OrderRequest === 'function' && typeof OrderRequest.belongsTo === 'function') {
    Contract.belongsTo(OrderRequest, { foreignKey: 'request_id', as: 'request' });
  }
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
 * Tìm đơn hàng theo ID (đầy đủ quan hệ hợp đồng, yêu cầu, ảnh, phân công)
 */
async function findOrderById(orderId) {
  const { OrderRequest } = require('./OrderRequestModel');
  const { OrderRequestImage } = require('./OrderRequestImageModel');

  return CustomerOrder.findByPk(orderId, {
    include: [
      {
        model: Contract,
        as: 'contract',
        include: [
          {
            model: OrderRequest,
            as: 'request',
            required: false,
            include: [
              {
                model: OrderRequestImage,
                as: 'images',
                required: false,
              },
            ],
          },
        ],
      },
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'price', 'image_url'],
            required: false,
          },
          { model: ProductCategory, as: 'category', attributes: ['category_id', 'category_name'], required: false },
          { model: ProductRoom, as: 'room', attributes: ['room_id', 'room_name'], required: false },
          { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_name'], required: false },
          { model: ProductColor, as: 'color', attributes: ['color_id', 'color_name', 'hex_value'], required: false },
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
<<<<<<< Updated upstream
async function getOrdersWithPagination({ page = 1, limit = 10, status, order_type, search } = {}) {
=======
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
  assigned_to,
  sales_id,
} = {}) {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  if (search && search.trim()) {
=======
  if (assigned_to) {
    whereClause.assigned_to = assigned_to;
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
>>>>>>> Stashed changes
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
        attributes: ['contract_id', 'contract_code', 'signed_by'],
      },
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'image_url'],
            required: false,
          },
          { model: ProductCategory, as: 'category', attributes: ['category_id', 'category_name'], required: false },
          { model: ProductRoom, as: 'room', attributes: ['room_id', 'room_name'], required: false },
          { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_name'], required: false },
          { model: ProductColor, as: 'color', attributes: ['color_id', 'color_name', 'hex_value'], required: false },
        ],
      },
      {
        model: UserAccount,
        as: 'staff',
        attributes: ['user_account_id', 'full_name'],
      },
    ],
<<<<<<< Updated upstream
=======
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
 * Lấy danh sách đơn hàng cho Khách hàng
 */
async function getCustomerOrdersWithPagination({ customerAccountId, page = 1, limit = 10, status } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = { customer_account_id: customerAccountId };
  if (status && status !== 'ALL') {
    whereClause.status = status;
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
    ],
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
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
// Các hàm bổ sung cho Workflow Đơn hàng & Quản lý
// ============================================================

const VALID_STATUSES = [
  'NEW',
  'CONFIRMED',
  'IN_PRODUCTION',
  'PROCESSING',
  'UNDER_INSPECTION',
  'READY_TO_DELIVER',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
];

const NEXT_ORDER_STATUS = {
  NEW: 'CONFIRMED',
  CONFIRMED: 'IN_PRODUCTION',
  IN_PRODUCTION: 'COMPLETED',
  PROCESSING: 'COMPLETED',
};

/**
 * Hủy đơn hàng (Owner / Sales / Customer)
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
 */
async function updateOrderStatus(orderId, newStatus, { updatedBy } = {}) {
  const normalizedStatus = newStatus === 'PROCESSING' ? 'IN_PRODUCTION' : newStatus;
  if (!VALID_STATUSES.includes(normalizedStatus)) {
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
  if (order.status === normalizedStatus) {
    throw new Error(`Đơn hàng đã ở trạng thái "${normalizedStatus}".`);
  }

  const expectedNext = NEXT_ORDER_STATUS[order.status];
  if (expectedNext && expectedNext !== normalizedStatus) {
    if (!['UNDER_INSPECTION', 'READY_TO_DELIVER', 'DELIVERING'].includes(normalizedStatus) &&
        !['UNDER_INSPECTION', 'READY_TO_DELIVER', 'DELIVERING'].includes(order.status)) {
      throw new Error(`Không thể chuyển từ trạng thái "${order.status}" sang "${normalizedStatus}". Trạng thái kế tiếp hợp lệ là "${expectedNext}".`);
    }
  }

  const updateData = { status: normalizedStatus, modifieby: updatedBy || null };
  if (normalizedStatus === 'COMPLETED') {
    updateData.delivered_date = new Date();
  }

  await order.update(updateData);
  return findOrderById(orderId);
}

/**
 * 7. OWNER – PHÂN CÔNG LEADER
 */
async function assignLeaderToCustomerOrder(orderId, leaderId, modifieBy) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.statusCode = 404;
    throw err;
  }
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    const err = new Error('Không thể phân công đơn hàng đã hoàn thành hoặc đã hủy.');
    err.statusCode = 400;
    throw err;
  }

  const { UserRole } = require('./userRole.model');
  const leader = await UserAccount.findByPk(leaderId, {
    include: [{ model: UserRole, as: 'role' }],
  });
  if (!leader || (leader.role?.role_code !== 'LEADERSTAFF' && leader.role?.role_code !== 'OWNER')) {
    const err = new Error('Tài khoản được chọn không có vai trò Tổ trưởng (LeaderStaff).');
    err.statusCode = 400;
    throw err;
  }

  await order.update({
    assigned_to: leaderId,
    modifieby: modifieBy || null,
  });

  try {
    const { ProductionOrder, createProductionOrder, assignLeaderToOrder } = require('./ProductionOrderModel');
    let po = await ProductionOrder.findOne({ where: { order_id: orderId } });
    if (po) {
      await assignLeaderToOrder(po.production_id, leaderId, modifieBy);
    } else if (order.order_type === 'CUSTOM') {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await createProductionOrder({
        orderId,
        plannedStart: today,
        plannedEnd: order.expected_date || nextMonth,
        createBy: modifieBy,
      });
      po = await ProductionOrder.findOne({ where: { order_id: orderId } });
      if (po) {
        await assignLeaderToOrder(po.production_id, leaderId, modifieBy);
      }
    }
  } catch (e) {
    console.warn('[CustomerOrderModel.assignLeader] Note on ProductionOrder:', e.message);
  }

  return findOrderById(orderId);
}

/**
 * 8. LEADER – TIẾP NHẬN ĐƠN HÀNG
 */
async function leaderAcceptOrder(orderId, leaderId, modifieBy) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.statusCode = 404;
    throw err;
  }
  if (leaderId && order.assigned_to && Number(order.assigned_to) !== Number(leaderId)) {
    const err = new Error('Bạn không được phân công phụ trách đơn hàng này.');
    err.statusCode = 403;
    throw err;
  }
  if (order.status !== 'CONFIRMED' && order.status !== 'NEW') {
    const err = new Error(`Chỉ có thể tiếp nhận đơn hàng ở trạng thái Đã xác nhận (Trạng thái hiện tại: ${order.status}).`);
    err.statusCode = 400;
    throw err;
  }

  await order.update({
    status: 'IN_PRODUCTION',
    modifieby: modifieBy || null,
  });

  return findOrderById(orderId);
}

/**
 * 8. LEADER – CẬP NHẬT TIẾN ĐỘ / GHI CHÚ
 */
async function leaderUpdateProgress(orderId, leaderId, { note, modifieBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.statusCode = 404;
    throw err;
  }
  if (leaderId && order.assigned_to && Number(order.assigned_to) !== Number(leaderId)) {
    const err = new Error('Bạn không được phân công phụ trách đơn hàng này.');
    err.statusCode = 403;
    throw err;
  }

  const updateData = { modifieby: modifieBy || null };
  if (note) {
    updateData.note = note;
  }
  await order.update(updateData);
  return findOrderById(orderId);
}

/**
 * 8. LEADER – HOÀN THÀNH SẢN XUẤT & GỬI YÊU CẦU NGHIỆM THU
 */
async function leaderSubmitInspection(orderId, leaderId, { note, modifieBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.statusCode = 404;
    throw err;
  }
  if (leaderId && order.assigned_to && Number(order.assigned_to) !== Number(leaderId)) {
    const err = new Error('Bạn không được phân công phụ trách đơn hàng này.');
    err.statusCode = 403;
    throw err;
  }
  if (order.status !== 'IN_PRODUCTION') {
    const err = new Error(`Chỉ có thể gửi nghiệm thu khi đơn đang sản xuất (Trạng thái hiện tại: ${order.status}).`);
    err.statusCode = 400;
    throw err;
  }

  const updateData = {
    status: 'UNDER_INSPECTION',
    modifieby: modifieBy || null,
  };
  if (note) {
    updateData.note = `Tổ trưởng gửi nghiệm thu: ${note}`;
  }
  await order.update(updateData);
  return findOrderById(orderId);
}

/**
 * 9. OWNER – NGHIỆM THU
 */
async function ownerInspectOrder(orderId, { result, reason, note, inspectedBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.statusCode = 404;
    throw err;
  }
  if (order.status !== 'UNDER_INSPECTION') {
    const err = new Error(`Chỉ có thể nghiệm thu đơn hàng đang chờ nghiệm thu (Trạng thái hiện tại: ${order.status}).`);
    err.statusCode = 400;
    throw err;
  }

  const normalizedResult = (result || '').toUpperCase();
  if (normalizedResult === 'PASSED') {
    await order.update({
      status: 'READY_TO_DELIVER',
      note: `Nghiệm thu ĐẠT: ${note || 'Đạt yêu cầu xuất xưởng'}`,
      modifieby: inspectedBy || null,
    });
  } else if (normalizedResult === 'FAILED') {
    if (!reason && !note) {
      const err = new Error('Vui lòng nhập lý do từ chối nghiệm thu.');
      err.statusCode = 400;
      throw err;
    }
    await order.update({
      status: 'IN_PRODUCTION',
      note: `Nghiệm thu KHÔNG ĐẠT: ${reason || note}. Cần xử lý lại.`,
      modifieby: inspectedBy || null,
    });
  } else {
    const err = new Error(`Kết quả nghiệm thu "${result}" không hợp lệ. Cho phép: PASSED, FAILED.`);
    err.statusCode = 400;
    throw err;
  }

  return findOrderById(orderId);
}

/**
 * 10. SALES – XÁC NHẬN GIAO HÀNG
 */
async function confirmDelivery(orderId, { deliveredDate, deliveryAddress, salesId, modifieBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.statusCode = 404;
    throw err;
  }
  if (order.status !== 'READY_TO_DELIVER') {
    const err = new Error(`Chỉ có thể xác nhận giao hàng khi đơn đã nghiệm thu đạt (Trạng thái hiện tại: ${order.status}).`);
    err.statusCode = 400;
    throw err;
  }

  const updateData = {
    status: 'DELIVERING',
    modifieby: modifieBy || null,
  };
  if (deliveryAddress) updateData.delivery_address = deliveryAddress;
  if (deliveredDate) updateData.expected_date = deliveredDate;

  await order.update(updateData);
  return findOrderById(orderId);
}

/**
 * 10. SALES – HOÀN TẤT ĐƠN HÀNG (COMPLETED)
 */
async function completeDelivery(orderId, { salesId, modifieBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.statusCode = 404;
    throw err;
  }
  if (order.status !== 'DELIVERING' && order.status !== 'READY_TO_DELIVER') {
    const err = new Error(`Chỉ có thể hoàn tất khi đơn đang giao hoặc đã nghiệm thu (Trạng thái hiện tại: ${order.status}).`);
    err.statusCode = 400;
    throw err;
  }

  await order.update({
    status: 'COMPLETED',
    delivered_date: new Date(),
    modifieby: modifieBy || null,
  });

  return findOrderById(orderId);
}

/**
 * Danh sách đơn hàng giao cho Leader
 */
async function getOrdersForLeader(leaderId, { page = 1, limit = 10, status, search } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = { assigned_to: leaderId };
  if (status && status !== 'ALL') {
    whereClause.status = status;
  }
  if (search && search.trim()) {
    const trimmed = search.trim();
    whereClause[Op.or] = [
      { order_code: { [Op.like]: `%${trimmed}%` } },
      { contact_name: { [Op.like]: `%${trimmed}%` } },
      { contact_phone: { [Op.like]: `%${trimmed}%` } },
    ];
  }

  const { OrderRequest } = require('./OrderRequestModel');
  const { OrderRequestImage } = require('./OrderRequestImageModel');

  const { rows, count } = await CustomerOrder.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Contract,
        as: 'contract',
        include: [
          {
            model: OrderRequest,
            as: 'request',
            required: false,
            include: [
              {
                model: OrderRequestImage,
                as: 'images',
                required: false,
              },
            ],
          },
        ],
      },
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'image_url'],
            required: false,
          },
          { model: ProductCategory, as: 'category', attributes: ['category_id', 'category_name'], required: false },
          { model: ProductRoom, as: 'room', attributes: ['room_id', 'room_name'], required: false },
          { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_name'], required: false },
          { model: ProductColor, as: 'color', attributes: ['color_id', 'color_name', 'hex_value'], required: false },
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

>>>>>>> Stashed changes
module.exports = {
  CustomerOrder,
  generateNextOrderCode,
  createOrderFromContract,
  findOrderById,
  findOrderByCode,
  findOrderByContractId,
  getOrdersWithPagination,
<<<<<<< Updated upstream
=======
  getCustomerOrdersWithPagination,
  findCustomerOrderById,
  cancelOrder,
  updateOrderStatus,
  assignLeaderToCustomerOrder,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
  ownerInspectOrder,
  confirmDelivery,
  completeDelivery,
  getOrdersForLeader,
  VALID_STATUSES,
  NEXT_ORDER_STATUS,
>>>>>>> Stashed changes
};
