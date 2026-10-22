const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Product = sequelize.define('Product', {
    product_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    category_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'product_category', key: 'category_id' } },
    room_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'product_room', key: 'room_id' } },
    material_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'product_material', key: 'material_id' } },
    color_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'product_color', key: 'color_id' } },
    product_code: { type: DataTypes.STRING(50), allowNull: false },
    product_name: { type: DataTypes.STRING(200), allowNull: false },
    product_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'SINGLE' },
    description: { type: DataTypes.TEXT, allowNull: true },
    length_cm: { type: DataTypes.INTEGER, allowNull: true },
    width_cm: { type: DataTypes.INTEGER, allowNull: true },
    height_cm: { type: DataTypes.INTEGER, allowNull: true },
    price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    stock_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'product',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_product_code', unique: true, fields: ['product_code'] },
    { name: 'idx_product_type', unique: false, fields: ['product_type'] },
    { name: 'idx_product_category', unique: false, fields: ['category_id'] },
    { name: 'idx_product_room', unique: false, fields: ['room_id'] },
    { name: 'idx_product_material', unique: false, fields: ['material_id'] },
    { name: 'idx_product_color', unique: false, fields: ['color_id'] }],
});

module.exports = { Product };
