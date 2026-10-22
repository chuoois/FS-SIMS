const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Contract = sequelize.define('Contract', {
    contract_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    contract_code: { type: DataTypes.STRING(30), allowNull: false },
    source: { type: DataTypes.STRING(20), allowNull: false },
    contract_type: { type: DataTypes.STRING(20), allowNull: false },
    request_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'order_request', key: 'request_id' } },
    customer_account_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    customer_name: { type: DataTypes.STRING(150), allowNull: false },
    customer_phone: { type: DataTypes.STRING(20), allowNull: false },
    customer_address: { type: DataTypes.STRING(255), allowNull: true },
    total_amount: { type: DataTypes.BIGINT, allowNull: false },
    deposit_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'DRAFT' },
    signed_date: { type: DataTypes.DATEONLY, allowNull: true },
    signed_place: { type: DataTypes.STRING(255), allowNull: true },
    delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
    contract_file_url: { type: DataTypes.STRING(255), allowNull: true },
    terms: { type: DataTypes.TEXT, allowNull: true },
    signed_by: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    note: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'contract',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_contract_code', unique: true, fields: ['contract_code'] },
    { name: 'uk_contract_request', unique: true, fields: ['request_id'] },
    { name: 'idx_contract_customer', unique: false, fields: ['customer_account_id'] },
    { name: 'idx_contract_status', unique: false, fields: ['status'] },
    { name: 'idx_contract_signed_by', unique: false, fields: ['signed_by'] }],
});

module.exports = { Contract };
