const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CustomerOrder = sequelize.define('CustomerOrder', {
    order_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    order_code: { type: DataTypes.STRING(30), allowNull: false },
    order_type: { type: DataTypes.STRING(20), allowNull: false },
    contract_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'contract', key: 'contract_id' } },
    customer_account_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    contact_name: { type: DataTypes.STRING(150), allowNull: false },
    contact_phone: { type: DataTypes.STRING(20), allowNull: false },
    delivery_address: { type: DataTypes.STRING(255), allowNull: true },
    total_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    deposit_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    paid_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NEW' },
    expected_date: { type: DataTypes.DATEONLY, allowNull: true },
    delivered_date: { type: DataTypes.DATEONLY, allowNull: true },
    assigned_to: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    note: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'customer_order',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_customer_order_code', unique: true, fields: ['order_code'] },
    { name: 'uk_customer_order_contract', unique: true, fields: ['contract_id'] },
    { name: 'idx_customer_order_type', unique: false, fields: ['order_type'] },
    { name: 'idx_customer_order_status', unique: false, fields: ['status'] },
    { name: 'idx_customer_order_customer', unique: false, fields: ['customer_account_id'] },
    { name: 'idx_customer_order_assigned', unique: false, fields: ['assigned_to'] }],
});

module.exports = { CustomerOrder };
