const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const OrderRequestImage = sequelize.define('OrderRequestImage', {
    request_image_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    request_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'order_request', key: 'request_id' } },
    request_item_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'order_request_item', key: 'request_item_id' } },
    image_url: { type: DataTypes.STRING(255), allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'order_request_image',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'idx_order_request_image_request', unique: false, fields: ['request_id'] },
    { name: 'idx_order_request_image_item', unique: false, fields: ['request_item_id'] }],
});

module.exports = { OrderRequestImage };
