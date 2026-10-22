const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CartItem = sequelize.define('CartItem', {
    cart_item_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    cart_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'cart', key: 'cart_id' } },
    product_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'product', key: 'product_id' } },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'cart_item',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_cart_item', unique: true, fields: ['cart_id', 'product_id'] },
    { name: 'idx_cart_item_product', unique: false, fields: ['product_id'] }],
});

module.exports = { CartItem };
