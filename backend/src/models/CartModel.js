const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { CartItem } = require('./CartItemModel');
const { findProductById } = require('./ProductModel');

const Cart = sequelize.define('Cart', {
    cart_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    customer_account_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'user_account', key: 'user_account_id' } },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'cart',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_cart_customer', unique: true, fields: ['customer_account_id'] }],
});

async function findOrCreateCart(customerAccountId, actor) {
  const [cart] = await Cart.findOrCreate({
    where: { customer_account_id: customerAccountId },
    defaults: {
      customer_account_id: customerAccountId,
      createby: actor,
    },
  });
  return cart;
}

async function getCartItems(cartId) {
  const items = await CartItem.findAll({
    where: { cart_id: cartId },
    order: [['cart_item_id', 'ASC']],
  });

  return Promise.all(
    items.map(async (item) => ({
      cartItem: item,
      product: await findProductById(item.product_id),
    }))
  );
}

async function findAvailableProduct(productId) {
  const product = await findProductById(productId);
  if (!product || product.status !== 'ACTIVE') {
    const error = new Error('Sản phẩm không tồn tại hoặc hiện không được kinh doanh.');
    error.statusCode = 404;
    throw error;
  }
  return product;
}

function assertAvailableQuantity(product, quantity) {
  const stock = Number(product.stock_quantity);
  if (quantity > 99) {
    const error = new Error('Số lượng mỗi sản phẩm không được vượt quá 99.');
    error.statusCode = 400;
    throw error;
  }
  if (quantity > stock) {
    const error = new Error(`Sản phẩm chỉ còn ${stock} trong kho.`);
    error.statusCode = 400;
    throw error;
  }
}

async function addProductToCart(customerAccountId, productId, quantity, actor) {
  const product = await findAvailableProduct(productId);
  const cart = await findOrCreateCart(customerAccountId, actor);
  const existingItem = await CartItem.findOne({
    where: { cart_id: cart.cart_id, product_id: productId },
  });
  const nextQuantity = Number(existingItem?.quantity || 0) + quantity;
  assertAvailableQuantity(product, nextQuantity);

  if (existingItem) {
    await existingItem.update({ quantity: nextQuantity, modifieby: actor });
  } else {
    await CartItem.create({
      cart_id: cart.cart_id,
      product_id: productId,
      quantity,
      createby: actor,
    });
  }

  return cart;
}

async function updateCartItemQuantity(customerAccountId, productId, quantity, actor) {
  const product = await findAvailableProduct(productId);
  assertAvailableQuantity(product, quantity);
  const cart = await findOrCreateCart(customerAccountId, actor);
  const item = await CartItem.findOne({
    where: { cart_id: cart.cart_id, product_id: productId },
  });

  if (!item) return null;
  await item.update({ quantity, modifieby: actor });
  return cart;
}

async function removeCartItem(customerAccountId, productId, actor) {
  const cart = await findOrCreateCart(customerAccountId, actor);
  const item = await CartItem.findOne({
    where: { cart_id: cart.cart_id, product_id: productId },
  });

  if (!item) return null;
  await item.destroy();
  return cart;
}

module.exports = {
  Cart,
  findOrCreateCart,
  getCartItems,
  addProductToCart,
  updateCartItemQuantity,
  removeCartItem,
};
