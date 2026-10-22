const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductCategory = sequelize.define('ProductCategory', {
    category_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    category_code: { type: DataTypes.STRING(50), allowNull: false },
    category_name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'product_category',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_product_category_code', unique: true, fields: ['category_code'] }],
});

module.exports = { ProductCategory };
