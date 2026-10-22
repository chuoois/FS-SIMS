const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductionOrderItem = sequelize.define('ProductionOrderItem', {
    production_item_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    production_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'production_order', key: 'production_id' } },
    product_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product', key: 'product_id' } },
    order_item_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'customer_order_item', key: 'order_item_id' } },
    quantity_planned: { type: DataTypes.INTEGER, allowNull: false },
    quantity_done: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    note: { type: DataTypes.STRING(255), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'production_order_item',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'idx_production_item_production', unique: false, fields: ['production_id'] },
    { name: 'idx_production_item_product', unique: false, fields: ['product_id'] },
    { name: 'idx_production_item_order_item', unique: false, fields: ['order_item_id'] }],
});

module.exports = { ProductionOrderItem };
