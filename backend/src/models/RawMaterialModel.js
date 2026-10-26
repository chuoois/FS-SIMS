// =========================================================
// RawMaterialModel.js
// Entity Model & Repository Functions for Raw Material (Nguyên vật liệu)
// =========================================================

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { ProductMaterial } = require('./ProductMaterialModel');
const { MaterialReceiptItem } = require('./MaterialReceiptItemModel');
const { MaterialIssueItem } = require('./MaterialIssueItemModel');

const RawMaterial = sequelize.define(
  'RawMaterial',
  {
    raw_material_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    raw_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    raw_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    material_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'product_material', key: 'material_id' },
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    quantity_on_hand: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    min_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ACTIVE',
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
    tableName: 'raw_material',
    timestamps: true,
    createdAt: 'createdate',
    updatedAt: 'modifiedate',
    indexes: [
      { name: 'uk_raw_material_code', unique: true, fields: ['raw_code'] },
      { name: 'idx_raw_material_material', unique: false, fields: ['material_id'] },
    ],
  }
);

if (!RawMaterial.associations || !RawMaterial.associations.material) {
  RawMaterial.belongsTo(ProductMaterial, { foreignKey: 'material_id', as: 'material' });
}

// =========================================================
// Repository / Query Functions (Data Access Layer)
// =========================================================

/**
 * Tìm nguyên vật liệu theo ID
 */
async function findRawMaterialById(rawMaterialId) {
  return RawMaterial.findByPk(rawMaterialId, {
    include: [
      { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_code', 'material_name'] },
    ],
  });
}

/**
 * Tìm nguyên vật liệu theo mã (raw_code)
 */
async function findRawMaterialByCode(rawCode) {
  if (!rawCode) return null;
  return RawMaterial.findOne({
    where: { raw_code: rawCode.trim() },
    raw: true,
  });
}

/**
 * Lấy danh sách nguyên vật liệu kèm tìm kiếm, lọc và phân trang
 */
async function getRawMaterialsWithPagination({
  search,
  material_id,
  status,
  stock_status,
  page = 1,
  limit = 10,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {};

  if (status && status !== 'ALL') {
    whereClause.status = status;
  }

  if (material_id && material_id !== 'ALL') {
    whereClause.material_id = material_id;
  }

  if (stock_status) {
    if (stock_status === 'OUT_OF_STOCK') {
      whereClause.quantity_on_hand = 0;
    } else if (stock_status === 'LOW_STOCK') {
      // Tồn kho nhỏ hơn hoặc bằng định mức tồn tối thiểu
      whereClause[Op.and] = [
        sequelize.where(
          sequelize.col('quantity_on_hand'),
          '<=',
          sequelize.col('min_quantity')
        ),
      ];
    } else if (stock_status === 'NORMAL') {
      whereClause[Op.and] = [
        sequelize.where(
          sequelize.col('quantity_on_hand'),
          '>',
          sequelize.col('min_quantity')
        ),
      ];
    }
  }

  if (search && search.trim()) {
    const trimmed = search.trim();
    whereClause[Op.or] = [
      { raw_code: { [Op.like]: `%${trimmed}%` } },
      { raw_name: { [Op.like]: `%${trimmed}%` } },
      { description: { [Op.like]: `%${trimmed}%` } },
      { unit: { [Op.like]: `%${trimmed}%` } },
    ];
  }

  const { count, rows } = await RawMaterial.findAndCountAll({
    where: whereClause,
    include: [
      { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_code', 'material_name'] },
    ],
    order: [['createdate', 'DESC']],
    offset,
    limit: limitNum,
    distinct: true,
  });

  return {
    materials: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limitNum) || 1,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

/**
 * Đếm số lần nguyên vật liệu được dùng trong phiếu nhập (material_receipt) và phiếu xuất (material_issue)
 */
async function countRawMaterialUsage(rawMaterialId) {
  const [receiptCount, issueCount] = await Promise.all([
    MaterialReceiptItem.count({ where: { raw_material_id: rawMaterialId } }).catch(() => 0),
    MaterialIssueItem.count({ where: { raw_material_id: rawMaterialId } }).catch(() => 0),
  ]);

  return {
    receiptCount,
    issueCount,
    totalUsage: receiptCount + issueCount,
  };
}

/**
 * Thêm mới nguyên vật liệu
 */
async function createRawMaterial(data) {
  return RawMaterial.create(data);
}

/**
 * Cập nhật thông tin nguyên vật liệu
 */
async function updateRawMaterial(rawMaterialId, updateData) {
  const rawMaterial = await RawMaterial.findByPk(rawMaterialId);
  if (!rawMaterial) return null;
  return rawMaterial.update(updateData);
}

/**
 * Xóa nguyên vật liệu khỏi database
 */
async function deleteRawMaterial(rawMaterialId) {
  const rawMaterial = await RawMaterial.findByPk(rawMaterialId);
  if (!rawMaterial) return false;
  await rawMaterial.destroy();
  return true;
}

/**
 * Tự động sinh mã nguyên vật liệu tiếp theo (vd MAT-0001, MAT-0002...)
 */
async function generateNextRawMaterialCode() {
  const latest = await RawMaterial.findOne({
    where: { raw_code: { [Op.like]: 'MAT-%' } },
    order: [['raw_material_id', 'DESC']],
    attributes: ['raw_code'],
    raw: true,
  });

  if (!latest || !latest.raw_code) {
    return 'MAT-0001';
  }

  const match = latest.raw_code.match(/MAT-(\d+)/);
  if (!match) {
    return 'MAT-0001';
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `MAT-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Thống kê tồn kho nguyên vật liệu (cảnh báo tồn thấp)
 */
async function getRawMaterialStockSummary() {
  const totalMaterials = await RawMaterial.count();
  const outOfStockMaterials = await RawMaterial.count({ where: { quantity_on_hand: 0 } });
  
  // Tồn thấp = quantity_on_hand <= min_quantity
  const lowStockMaterials = await RawMaterial.count({
    where: sequelize.where(
      sequelize.col('quantity_on_hand'),
      '<=',
      sequelize.col('min_quantity')
    ),
  });

  const totalQuantity = (await RawMaterial.sum('quantity_on_hand')) || 0;

  return {
    totalMaterials,
    lowStockMaterials,
    outOfStockMaterials,
    normalStockMaterials: Math.max(0, totalMaterials - lowStockMaterials),
    totalQuantity,
  };
}

module.exports = {
  RawMaterial,
  findRawMaterialById,
  findRawMaterialByCode,
  getRawMaterialsWithPagination,
  countRawMaterialUsage,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  generateNextRawMaterialCode,
  getRawMaterialStockSummary,
};
