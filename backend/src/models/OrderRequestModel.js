const crypto = require('crypto');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { Cart } = require('./CartModel');
const { CartItem } = require('./CartItemModel');
const { OrderRequestItem } = require('./OrderRequestItemModel');
const { Product } = require('./ProductModel');

const OrderRequest = sequelize.define('OrderRequest', {
    request_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    request_code: { type: DataTypes.STRING(30), allowNull: false },
    order_type: { type: DataTypes.STRING(20), allowNull: false },
    request_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'SINGLE' },
    customer_account_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'user_account', key: 'user_account_id' } },
    contact_name: { type: DataTypes.STRING(150), allowNull: false },
    contact_phone: { type: DataTypes.STRING(20), allowNull: false },
    contact_email: { type: DataTypes.STRING(255), allowNull: true },
    delivery_address: { type: DataTypes.STRING(255), allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    budget_min: { type: DataTypes.INTEGER, allowNull: true },
    budget_max: { type: DataTypes.INTEGER, allowNull: true },
    expected_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PENDING' },
    assigned_to: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    quoted_price: { type: DataTypes.INTEGER, allowNull: true },
    quoted_at: { type: DataTypes.DATE, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    staff_note: { type: DataTypes.STRING(500), allowNull: true },
    reject_reason: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'order_request',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_order_request_code', unique: true, fields: ['request_code'] },
    { name: 'idx_order_request_customer', unique: false, fields: ['customer_account_id'] },
    { name: 'idx_order_request_status', unique: false, fields: ['status'] },
    { name: 'idx_order_request_order_type', unique: false, fields: ['order_type'] },
    { name: 'idx_order_request_assigned', unique: false, fields: ['assigned_to'] }],
});

function createRequestCode() {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  return `RQ-${datePart}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function createRequestError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function createReadyOrderRequestFromCart({
  customerAccountId,
  contactName,
  contactPhone,
  contactEmail,
  deliveryAddress,
  description,
  createBy,
}) {
  const transaction = await sequelize.transaction();

  try {
    const cart = await Cart.findOne({
      where: { customer_account_id: customerAccountId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!cart) {
      throw createRequestError('Không tìm thấy giỏ hàng.', 409);
    }

    const cartItems = await CartItem.findAll({
      where: { cart_id: cart.cart_id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!cartItems.length) {
      throw createRequestError('Giỏ hàng đang trống.', 409);
    }

    const productIds = cartItems.map((item) => item.product_id);
    const products = await Product.findAll({
      where: { product_id: productIds },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const productsById = new Map(
      products.map((product) => [String(product.product_id), product])
    );

    const requestItems = cartItems.map((cartItem) => {
      const product = productsById.get(String(cartItem.product_id));
      const quantity = Number(cartItem.quantity);
      if (!product || product.status !== 'ACTIVE') {
        throw createRequestError('Một sản phẩm trong giỏ hàng không còn được kinh doanh.', 409);
      }
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > Number(product.stock_quantity)) {
        throw createRequestError(
          `Số lượng sản phẩm "${product.product_name}" hiện không đủ trong kho.`,
          409
        );
      }

      return {
        product_id: product.product_id,
        item_name: product.product_name,
        category_id: product.category_id,
        room_id: product.room_id,
        material_id: product.material_id,
        color_id: product.color_id,
        length_cm: product.length_cm,
        width_cm: product.width_cm,
        height_cm: product.height_cm,
        quantity,
        unit_price: Number(product.price),
        description: product.description || null,
        createby: createBy,
      };
    });

    const orderRequest = await OrderRequest.create({
      request_code: createRequestCode(),
      order_type: 'READY',
      request_type: 'SINGLE',
      customer_account_id: customerAccountId,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      delivery_address: deliveryAddress || null,
      title: `Yêu cầu mua hàng (${requestItems.length} sản phẩm)`,
      description: description || null,
      status: 'PENDING',
      createby: createBy,
    }, { transaction });

    await OrderRequestItem.bulkCreate(
      requestItems.map((item) => ({ ...item, request_id: orderRequest.request_id })),
      { transaction }
    );
    await CartItem.destroy({
      where: { cart_id: cart.cart_id },
      transaction,
    });

    await transaction.commit();
    return {
      requestId: orderRequest.request_id,
      requestCode: orderRequest.request_code,
      status: orderRequest.status,
      title: orderRequest.title,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = { OrderRequest, createReadyOrderRequestFromCart };
