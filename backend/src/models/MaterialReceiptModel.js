const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const MaterialReceipt = sequelize.define('MaterialReceipt', {
    receipt_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    receipt_code: { type: DataTypes.STRING(30), allowNull: false },
    supplier_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'supplier', key: 'supplier_id' } },
    receipt_date: { type: DataTypes.DATEONLY, allowNull: false },
    total_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
    received_by: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    note: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'material_receipt',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_material_receipt_code', unique: true, fields: ['receipt_code'] },
    { name: 'idx_material_receipt_supplier', unique: false, fields: ['supplier_id'] },
    { name: 'idx_material_receipt_status', unique: false, fields: ['status'] },
    { name: 'idx_material_receipt_received_by', unique: false, fields: ['received_by'] }],
});

module.exports = { MaterialReceipt };
