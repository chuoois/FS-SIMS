const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductMaterial = sequelize.define('ProductMaterial', {
    material_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    material_code: { type: DataTypes.STRING(50), allowNull: false },
    material_name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'product_material',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_product_material_code', unique: true, fields: ['material_code'] }],
});

module.exports = { ProductMaterial };
