const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const MaterialReceiptItem = sequelize.define('MaterialReceiptItem', {
    receipt_item_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    receipt_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'material_receipt', key: 'receipt_id' } },
    raw_material_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'raw_material', key: 'raw_material_id' } },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unit_price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    note: { type: DataTypes.STRING(255), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'material_receipt_item',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_material_receipt_item', unique: true, fields: ['receipt_id', 'raw_material_id'] },
    { name: 'idx_material_receipt_item_raw', unique: false, fields: ['raw_material_id'] }],
});

module.exports = { MaterialReceiptItem };
