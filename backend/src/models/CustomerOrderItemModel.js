const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CustomerOrderItem = sequelize.define('CustomerOrderItem', {
    order_item_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'customer_order', key: 'order_id' } },
    contract_item_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'contract_item', key: 'contract_item_id' } },
    product_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product', key: 'product_id' } },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: true },
    category_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_category', key: 'category_id' } },
    room_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_room', key: 'room_id' } },
    material_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_material', key: 'material_id' } },
    color_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_color', key: 'color_id' } },
    length_cm: { type: DataTypes.INTEGER, allowNull: true },
    width_cm: { type: DataTypes.INTEGER, allowNull: true },
    height_cm: { type: DataTypes.INTEGER, allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unit_price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'customer_order_item',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'idx_customer_order_item_order', unique: false, fields: ['order_id'] },
    { name: 'idx_customer_order_item_contract_item', unique: false, fields: ['contract_item_id'] },
    { name: 'idx_customer_order_item_product', unique: false, fields: ['product_id'] },
    { name: 'idx_customer_order_item_category', unique: false, fields: ['category_id'] },
    { name: 'idx_customer_order_item_room', unique: false, fields: ['room_id'] },
    { name: 'idx_customer_order_item_material', unique: false, fields: ['material_id'] },
    { name: 'idx_customer_order_item_color', unique: false, fields: ['color_id'] }],
});

module.exports = { CustomerOrderItem };
