const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Supplier = sequelize.define('Supplier', {
    supplier_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    supplier_code: { type: DataTypes.STRING(50), allowNull: false },
    supplier_name: { type: DataTypes.STRING(200), allowNull: false },
    phone_number: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    note: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'supplier',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_supplier_code', unique: true, fields: ['supplier_code'] }],
});

module.exports = { Supplier };
