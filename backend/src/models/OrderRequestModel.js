const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const OrderRequest = sequelize.define('OrderRequest', {
    request_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    request_code: { type: DataTypes.STRING(30), allowNull: false },
    order_type: { type: DataTypes.STRING(20), allowNull: false },
    request_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'SINGLE' },
    customer_account_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'user_account', key: 'user_account_id' } },
    contact_name: { type: DataTypes.STRING(150), allowNull: false },
    contact_phone: { type: DataTypes.STRING(20), allowNull: false },
    contact_email: { type: DataTypes.STRING(255), allowNull: true },
    delivery_address: { type: DataTypes.STRING(255), allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    budget_min: { type: DataTypes.INTEGER, allowNull: true },
    budget_max: { type: DataTypes.INTEGER, allowNull: true },
    expected_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NEW' },
    assigned_to: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    quoted_price: { type: DataTypes.INTEGER, allowNull: true },
    quoted_at: { type: DataTypes.DATE, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    staff_note: { type: DataTypes.STRING(500), allowNull: true },
    reject_reason: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'order_request',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_order_request_code', unique: true, fields: ['request_code'] },
    { name: 'idx_order_request_customer', unique: false, fields: ['customer_account_id'] },
    { name: 'idx_order_request_status', unique: false, fields: ['status'] },
    { name: 'idx_order_request_order_type', unique: false, fields: ['order_type'] },
    { name: 'idx_order_request_assigned', unique: false, fields: ['assigned_to'] }],
});

module.exports = { OrderRequest };
