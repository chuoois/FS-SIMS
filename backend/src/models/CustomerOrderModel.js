const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { CustomerOrderItem } = require('./CustomerOrderItemModel');
const { Contract } = require('./ContractModel');
const { ContractItem } = require('./ContractItemModel');
const { Product } = require('./ProductModel');
const { ProductCategory } = require('./ProductCategoryModel');
const { ProductRoom } = require('./ProductRoomModel');
const { ProductMaterial } = require('./ProductMaterialModel');
const { ProductColor } = require('./ProductColorModel');
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
  if (typeof Contract === 'function' && typeof Contract.belongsTo === 'function') CustomerOrder.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
}
if (!CustomerOrder.associations || !CustomerOrder.associations.staff) {
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') CustomerOrder.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'staff' });
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
if (!CustomerOrder.associations || !CustomerOrder.associations.leader) {
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') {
    CustomerOrder.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'leader' });
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

const VALID_STATUSES = ['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

const NEXT_ORDER_STATUS = {
  NEW: 'CONFIRMED',
  CONFIRMED: 'IN_PRODUCTION',
  IN_PRODUCTION: 'COMPLETED',
  PROCESSING: 'COMPLETED',
};

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
    throw new Error(`Không thể chuyển từ trạng thái "${order.status}" sang "${normalizedStatus}". Trạng thái kế tiếp hợp lệ là "${expectedNext}".`);
  }

  const updateData = { status: normalizedStatus, modifieby: updatedBy || null };
  if (normalizedStatus === 'COMPLETED') {
    updateData.delivered_date = new Date();
  }

  await order.update(updateData);
  return findOrderById(orderId);
}


/**
 * Owner phân công Leader phụ trách đơn hàng
 */
async function assignLeaderToCustomerOrder(orderId, leaderId, { assignedBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.status !== 'CONFIRMED' && order.status !== 'IN_PRODUCTION') {
    throw new Error('Chỉ có thể phân công Tổ trưởng khi đơn hàng ở trạng thái ĐÃ XÁC NHẬN hoặc ĐANG SẢN XUẤT.');
  }

  // Kiểm tra tài khoản leader
  const leader = await UserAccount.findByPk(leaderId);
  if (!leader) {
    throw new Error('Không tìm thấy tài khoản Tổ trưởng.');
  }

  await order.update({
    assigned_to: leaderId,
    modifieby: assignedBy || null,
  });

  return findOrderById(orderId);
}

/**
 * Leader tiếp nhận đơn hàng vào sản xuất
 */
async function leaderAcceptOrder(orderId, leaderId) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.assigned_to && String(order.assigned_to) !== String(leaderId)) {
    throw new Error('Bạn không được phân công phụ trách đơn hàng này.');
  }
  if (order.status !== 'CONFIRMED') {
    throw new Error('Chỉ có thể tiếp nhận đơn hàng đang ở trạng thái Chờ tiếp nhận (CONFIRMED).');
  }

  await order.update({
    status: 'IN_PRODUCTION',
    assigned_to: leaderId,
    modifieby: String(leaderId),
  });

  return findOrderById(orderId);
}

/**
 * Leader cập nhật tiến độ / ghi chú xưởng
 */
async function leaderUpdateProgress(orderId, leaderId, { note } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.assigned_to && String(order.assigned_to) !== String(leaderId)) {
    throw new Error('Bạn không có quyền cập nhật tiến độ cho đơn hàng này.');
  }

  const updatedNote = note
    ? (order.note ? `${order.note}\n[${new Date().toLocaleDateString('vi-VN')} Leader]: ${note}` : note)
    : order.note;

  await order.update({
    note: updatedNote,
    modifieby: String(leaderId),
  });

  return findOrderById(orderId);
}

/**
 * Leader hoàn thành sản xuất và gửi yêu cầu nghiệm thu lên Owner
 */
async function leaderSubmitInspection(orderId, leaderId, { note } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.assigned_to && String(order.assigned_to) !== String(leaderId)) {
    throw new Error('Bạn không có quyền gửi nghiệm thu đơn hàng này.');
  }
  if (order.status !== 'IN_PRODUCTION') {
    throw new Error('Chỉ có thể gửi nghiệm thu khi đơn hàng đang trong tiến trình sản xuất (IN_PRODUCTION).');
  }

  const updatedNote = note
    ? (order.note ? `${order.note}\n[Gửi nghiệm thu]: ${note}` : `[Gửi nghiệm thu]: ${note}`)
    : order.note;

  await order.update({
    status: 'UNDER_INSPECTION',
    note: updatedNote,
    modifieby: String(leaderId),
  });

  return findOrderById(orderId);
}

/**
 * Owner nghiệm thu sản phẩm
 * - passed = true: chuyển sang READY_TO_DELIVER (đã nghiệm thu đạt, chuyển về Sales để giao)
 * - passed = false: chuyển lại IN_PRODUCTION cho Leader làm lại kèm lý do
 */
async function ownerInspectOrder(orderId, { passed, rejectReason, inspectedBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.status !== 'UNDER_INSPECTION') {
    throw new Error('Đơn hàng hiện không ở trạng thái Chờ nghiệm thu (UNDER_INSPECTION).');
  }

  if (passed) {
    await order.update({
      status: 'READY_TO_DELIVER',
      modifieby: inspectedBy || null,
    });
  } else {
    if (!rejectReason || !String(rejectReason).trim()) {
      throw new Error('Vui lòng nhập lý do từ chối nghiệm thu để Tổ trưởng xử lý lại.');
    }
    const updatedNote = order.note
      ? `${order.note}\n[Nghiệm thu KHÔNG ĐẠT - ${new Date().toLocaleDateString('vi-VN')}]: ${rejectReason}`
      : `[Nghiệm thu KHÔNG ĐẠT]: ${rejectReason}`;

    await order.update({
      status: 'IN_PRODUCTION',
      note: updatedNote,
      modifieby: inspectedBy || null,
    });
  }

  return findOrderById(orderId);
}

/**
 * Sales xác nhận bắt đầu giao hàng
 */
async function confirmDelivery(orderId, { deliveryAddress, deliveryDate, note, updatedBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.status !== 'READY_TO_DELIVER') {
    throw new Error('Chỉ có thể kích hoạt giao hàng khi sản phẩm đã được Owner nghiệm thu đạt (READY_TO_DELIVER).');
  }

  await order.update({
    status: 'DELIVERING',
    delivery_address: deliveryAddress || order.delivery_address,
    expected_date: deliveryDate || order.expected_date,
    note: note ? (order.note ? `${order.note}\n[Giao hàng]: ${note}` : note) : order.note,
    modifieby: updatedBy || null,
  });

  return findOrderById(orderId);
}

/**
 * Sales xác nhận giao hàng thành công -> Chuyển sang COMPLETED
 */
async function completeDelivery(orderId, { updatedBy } = {}) {
  const order = await CustomerOrder.findByPk(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng.');
  }
  if (order.status !== 'DELIVERING' && order.status !== 'READY_TO_DELIVER') {
    throw new Error('Chỉ có thể hoàn tất khi đơn hàng đang trong quá trình giao hàng.');
  }

  await order.update({
    status: 'COMPLETED',
    delivered_date: new Date(),
    modifieby: updatedBy || null,
  });

  return findOrderById(orderId);
}

/**
 * Lấy danh sách đơn hàng được phân công cho Leader
 */
async function getOrdersForLeader(leaderId, { search, status, page = 1, limit = 10 } = {}) {
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

  const { rows, count } = await CustomerOrder.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Contract,
        as: 'contract',
        attributes: ['contract_id', 'contract_code', 'status', 'request_id'],
      },
      {
        model: CustomerOrderItem,
        as: 'items',
        include: [
          { model: Product, as: 'product', attributes: ['product_id', 'product_code', 'product_name'], required: false },
          { model: ProductCategory, as: 'category', attributes: ['category_id', 'category_name'], required: false },
          { model: ProductRoom, as: 'room', attributes: ['room_id', 'room_name'], required: false },
          { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_name'], required: false },
          { model: ProductColor, as: 'color', attributes: ['color_id', 'color_name'], required: false },
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
  NEXT_ORDER_STATUS,
  assignLeaderToCustomerOrder,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
  ownerInspectOrder,
  confirmDelivery,
  completeDelivery,
  getOrdersForLeader,
};
