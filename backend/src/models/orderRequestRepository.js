const crypto = require('crypto');
const { sequelize } = require('../config/sequelize');
const { Cart } = require('./CartModel');
const { CartItem } = require('./CartItemModel');
const { OrderRequest } = require('./OrderRequestModel');
const { OrderRequestItem } = require('./OrderRequestItemModel');
const { Product } = require('./ProductModel');

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

module.exports = { createReadyOrderRequestFromCart };
