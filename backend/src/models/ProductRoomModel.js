const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductRoom = sequelize.define('ProductRoom', {
    room_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    room_code: { type: DataTypes.STRING(50), allowNull: false },
    room_name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'product_room',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_product_room_code', unique: true, fields: ['room_code'] }],
});

module.exports = { ProductRoom };
