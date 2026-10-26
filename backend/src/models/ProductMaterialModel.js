const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductMaterial = sequelize.define('ProductMaterial', {
    material_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    material_code: { type: DataTypes.STRING(50), allowNull: false },
    material_name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'product_material',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_product_material_code', unique: true, fields: ['material_code'] }],
});

/**
 * Loại bỏ dấu tiếng Việt để tạo mã slug
 */
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Tự sinh mã chất liệu từ tên
 */
function generateMaterialCode(name) {
  const clean = removeVietnameseTones(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  return clean || `MAT_${Date.now()}`;
}

/**
 * Tìm chất liệu theo ID
 */
async function findProductMaterialById(materialId) {
  return ProductMaterial.findByPk(materialId, { raw: true });
}

/**
 * Tìm chất liệu theo tên (không phân biệt ho a thường)
 */
async function findProductMaterialByName(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  return ProductMaterial.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('material_name')),
      trimmed.toLowerCase()
    ),
    raw: true,
  });
}

/**
 * Tạo mới chất liệu (nếu đã có theo tên thì trả về bản ghi cũ)
 */
async function createProductMaterial({ material_name, material_code, description, createby }) {
  if (!material_name || typeof material_name !== 'string' || !material_name.trim()) {
    throw new Error('Tên chất liệu không được để trống');
  }

  const trimmedName = material_name.trim();

  // Kiểm tra trùng tên trước
  const existingByName = await findProductMaterialByName(trimmedName);
  if (existingByName) {
    return existingByName;
  }

  let baseCode = material_code ? String(material_code).trim().toUpperCase() : generateMaterialCode(trimmedName);
  let candidateCode = baseCode;
  let counter = 1;

  while (await ProductMaterial.findOne({ where: { material_code: candidateCode } })) {
    candidateCode = `${baseCode}_${counter}`;
    if (candidateCode.length > 50) {
      candidateCode = `MAT_${Date.now().toString(36).toUpperCase()}_${counter}`.slice(0, 50);
    }
    counter++;
  }

  const newRecord = await ProductMaterial.create({
    material_code: candidateCode,
    material_name: trimmedName,
    description: description ? String(description).trim() : null,
    createby: createby || 'SYSTEM',
  });

  return newRecord.get({ plain: true });
}

/**
 * Lấy tất cả chất liệu
 */
async function getAllProductMaterials() {
  return ProductMaterial.findAll({
    attributes: ['material_id', 'material_code', 'material_name', 'description'],
    order: [['material_name', 'ASC']],
    raw: true,
  });
}

module.exports = {
  ProductMaterial,
  findProductMaterialById,
  findProductMaterialByName,
  createProductMaterial,
  getAllProductMaterials,
};

