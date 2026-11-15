const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CustomerOrderImage = sequelize.define('CustomerOrderImage', {
  order_image_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'customer_order', key: 'order_id' } },
  order_item_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'customer_order_item', key: 'order_item_id' } },
  image_url: { type: DataTypes.STRING(500), allowNull: false },
  image_type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'INSPECTION' },
  sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  createby: { type: DataTypes.STRING(100), allowNull: true },
  modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'customer_order_image',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [
    { name: 'idx_customer_order_image_order', unique: false, fields: ['order_id'] },
    { name: 'idx_customer_order_image_item', unique: false, fields: ['order_item_id'] },
    { name: 'idx_customer_order_image_type', unique: false, fields: ['image_type'] },
  ],
});

// Tự động đảm bảo bảng customer_order_image tồn tại trong MySQL mà không cần drop database
// Giúp MySQL container đang chạy không bị crash do chưa chạy lại init.sql
(async () => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS customer_order_image (
        order_image_id    BIGINT        NOT NULL AUTO_INCREMENT,
        order_id          BIGINT        NOT NULL,
        order_item_id     BIGINT        NULL,
        image_url         VARCHAR(500)  NOT NULL,
        image_type        VARCHAR(30)   NOT NULL DEFAULT 'INSPECTION',
        sort_order        INT           NOT NULL DEFAULT 0,
        createdate        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        modifiedate       DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        createby          VARCHAR(100)  NULL,
        modifieby         VARCHAR(100)  NULL,
        PRIMARY KEY (order_image_id),
        KEY idx_customer_order_image_order (order_id),
        KEY idx_customer_order_image_item (order_item_id),
        KEY idx_customer_order_image_type (image_type)
      ) ENGINE = InnoDB;
    `);
  } catch (err) {
    console.warn('[CustomerOrderImage] Tự động tạo bảng warning:', err.message);
  }
})();

module.exports = { CustomerOrderImage };


