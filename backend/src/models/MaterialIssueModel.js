const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const MaterialIssue = sequelize.define('MaterialIssue', {
    issue_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    issue_code: { type: DataTypes.STRING(30), allowNull: false },
    production_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'production_order', key: 'production_id' } },
    issue_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
    issued_by: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
    note: { type: DataTypes.STRING(500), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'material_issue',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_material_issue_code', unique: true, fields: ['issue_code'] },
    { name: 'idx_material_issue_production', unique: false, fields: ['production_id'] },
    { name: 'idx_material_issue_status', unique: false, fields: ['status'] },
    { name: 'idx_material_issue_issued_by', unique: false, fields: ['issued_by'] }],
});

module.exports = { MaterialIssue };
