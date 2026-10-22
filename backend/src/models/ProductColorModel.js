const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductColor = sequelize.define('ProductColor', {
    color_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    color_code: { type: DataTypes.STRING(50), allowNull: false },
    color_name: { type: DataTypes.STRING(100), allowNull: false },
    hex_value: { type: DataTypes.STRING(7), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'product_color',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_product_color_code', unique: true, fields: ['color_code'] }],
});

module.exports = { ProductColor };
