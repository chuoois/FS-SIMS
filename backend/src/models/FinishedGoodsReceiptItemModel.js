const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const FinishedGoodsReceiptItem = sequelize.define('FinishedGoodsReceiptItem', {
    fg_item_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    fg_receipt_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'finished_goods_receipt', key: 'fg_receipt_id' } },
    product_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'product', key: 'product_id' } },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    note: { type: DataTypes.STRING(255), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'finished_goods_receipt_item',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_finished_goods_receipt_item', unique: true, fields: ['fg_receipt_id', 'product_id'] },
    { name: 'idx_finished_goods_receipt_item_product', unique: false, fields: ['product_id'] }],
});

module.exports = { FinishedGoodsReceiptItem };
