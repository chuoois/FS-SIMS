const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const MaterialIssueItem = sequelize.define('MaterialIssueItem', {
    issue_item_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    issue_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'material_issue', key: 'issue_id' } },
    raw_material_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'raw_material', key: 'raw_material_id' } },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    note: { type: DataTypes.STRING(255), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'material_issue_item',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_material_issue_item', unique: true, fields: ['issue_id', 'raw_material_id'] },
    { name: 'idx_material_issue_item_raw', unique: false, fields: ['raw_material_id'] }],
});

module.exports = { MaterialIssueItem };
