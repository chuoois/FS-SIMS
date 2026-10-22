const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductionOrder = sequelize.define('ProductionOrder', {
    production_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    production_code: { type: DataTypes.STRING(30), allowNull: false },
    production_type: { type: DataTypes.STRING(20), allowNull: false },
    order_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'customer_order', key: 'order_id' } },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
    planned_start: { type: DataTypes.DATEONLY, allowNull: true },
    planned_end: { type: DataTypes.DATEONLY, allowNull: true },
    completed_date: { type: DataTypes.DATEONLY, allowNull: true },
    assigned_to: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    note: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'production_order',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_production_order_code', unique: true, fields: ['production_code'] },
    { name: 'idx_production_order_order', unique: false, fields: ['order_id'] },
    { name: 'idx_production_order_status', unique: false, fields: ['status'] },
    { name: 'idx_production_order_assigned', unique: false, fields: ['assigned_to'] }],
});

module.exports = { ProductionOrder };
