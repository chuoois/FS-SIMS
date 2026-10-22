const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const OrderRequestItem = sequelize.define('OrderRequestItem', {
    request_item_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    request_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'order_request', key: 'request_id' } },
    product_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product', key: 'product_id' } },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    category_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_category', key: 'category_id' } },
    room_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_room', key: 'room_id' } },
    material_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_material', key: 'material_id' } },
    color_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_color', key: 'color_id' } },
    length_cm: { type: DataTypes.INTEGER, allowNull: true },
    width_cm: { type: DataTypes.INTEGER, allowNull: true },
    height_cm: { type: DataTypes.INTEGER, allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unit_price: { type: DataTypes.INTEGER, allowNull: true },
    description: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'order_request_item',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'idx_order_request_item_request', unique: false, fields: ['request_id'] },
    { name: 'idx_order_request_item_product', unique: false, fields: ['product_id'] },
    { name: 'idx_order_request_item_category', unique: false, fields: ['category_id'] },
    { name: 'idx_order_request_item_room', unique: false, fields: ['room_id'] },
    { name: 'idx_order_request_item_material', unique: false, fields: ['material_id'] },
    { name: 'idx_order_request_item_color', unique: false, fields: ['color_id'] }],
});

module.exports = { OrderRequestItem };
