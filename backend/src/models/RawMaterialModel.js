const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const RawMaterial = sequelize.define('RawMaterial', {
    raw_material_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    raw_code: { type: DataTypes.STRING(50), allowNull: false },
    raw_name: { type: DataTypes.STRING(200), allowNull: false },
    material_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'product_material', key: 'material_id' } },
    unit: { type: DataTypes.STRING(20), allowNull: false },
    quantity_on_hand: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    min_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    description: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'raw_material',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_raw_material_code', unique: true, fields: ['raw_code'] },
    { name: 'idx_raw_material_material', unique: false, fields: ['material_id'] }],
});

module.exports = { RawMaterial };
