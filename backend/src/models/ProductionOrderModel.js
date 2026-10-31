const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { UserAccount } = require('./userAccount.model');

const ProductionOrder = sequelize.define(
  'ProductionOrder',
  {
    production_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    production_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    production_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'customer_order', key: 'order_id' },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    planned_start: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    planned_end: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    completed_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'user_account', key: 'user_account_id' },
    },
    note: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createby: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    modifieby: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: 'production_order',
    timestamps: true,
    createdAt: 'createdate',
    updatedAt: 'modifiedate',
    indexes: [
      { name: 'uk_production_order_code', unique: true, fields: ['production_code'] },
      { name: 'idx_production_order_order', unique: false, fields: ['order_id'] },
      { name: 'idx_production_order_status', unique: false, fields: ['status'] },
      { name: 'idx_production_order_assigned', unique: false, fields: ['assigned_to'] },
    ],
  }
);

// Setup safe associations
const isModel = (m) => typeof m === 'function' && typeof m.belongsTo === 'function';

if (isModel(ProductionOrder) && isModel(UserAccount)) {
  if (!ProductionOrder.associations || !ProductionOrder.associations.supervisor) {
    ProductionOrder.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'supervisor' });
  }
}

/**
 * Tìm lệnh gia công theo ID
 */
async function findProductionOrderById(productionId) {
  const include = [];
  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'supervisor',
      attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
    });
  }

  return ProductionOrder.findByPk(productionId, { include });
}

/**
 * Tìm lệnh gia công theo mã lệnh
 */
async function findProductionOrderByCode(code) {
  return ProductionOrder.findOne({
    where: { production_code: code },
  });
}

/**
 * Lấy danh sách lệnh gia công khả dụng để xuất nguyên vật liệu
 * (chỉ lấy các lệnh chưa bị hủy)
 */
async function getProductionOrdersForExport(statusFilter = null) {
  const where = {};
  if (statusFilter) {
    where.status = statusFilter;
  } else {
    // Mặc định lấy các lệnh đang hoạt động hoặc chưa hủy
    where.status = { [Op.ne]: 'CANCELLED' };
  }

  const include = [];
  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'supervisor',
      attributes: ['user_account_id', 'full_name'],
    });
  }

  return ProductionOrder.findAll({
    where,
    include,
    order: [['createdate', 'DESC']],
  });
}

module.exports = {
  ProductionOrder,
  findProductionOrderById,
  findProductionOrderByCode,
  getProductionOrdersForExport,
};
