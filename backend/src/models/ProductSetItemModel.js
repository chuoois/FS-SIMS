const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductSetItem = sequelize.define('ProductSetItem', {
    set_item_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    set_product_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'product', key: 'product_id' } },
    item_product_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'product', key: 'product_id' } },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'product_set_item',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_product_set_item', unique: true, fields: ['set_product_id', 'item_product_id'] },
    { name: 'idx_product_set_item_item', unique: false, fields: ['item_product_id'] }],
});

module.exports = { ProductSetItem };
