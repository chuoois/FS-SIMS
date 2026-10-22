const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const FinishedGoodsReceipt = sequelize.define('FinishedGoodsReceipt', {
    fg_receipt_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    receipt_code: { type: DataTypes.STRING(30), allowNull: false },
    production_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'production_order', key: 'production_id' } },
    receipt_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
    received_by: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    note: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'finished_goods_receipt',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_finished_goods_receipt_code', unique: true, fields: ['receipt_code'] },
    { name: 'idx_finished_goods_receipt_production', unique: false, fields: ['production_id'] },
    { name: 'idx_finished_goods_receipt_status', unique: false, fields: ['status'] },
    { name: 'idx_finished_goods_receipt_received_by', unique: false, fields: ['received_by'] }],
});

module.exports = { FinishedGoodsReceipt };
