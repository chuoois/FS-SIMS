const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

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

module.exports = { Cart };
