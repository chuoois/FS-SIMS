const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductColor = sequelize.define('ProductColor', {
    color_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    color_code: { type: DataTypes.STRING(50), allowNull: false },
    color_name: { type: DataTypes.STRING(100), allowNull: false },
    hex_value: { type: DataTypes.STRING(7), allowNull: true },
    createby: { type: DataTypes.STRING(100), allowNull: true },
    modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'product_color',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [{ name: 'uk_product_color_code', unique: true, fields: ['color_code'] }],
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
 * Tự sinh mã màu sắc từ tên
 */
function generateColorCode(name) {
  const clean = removeVietnameseTones(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  return clean || `COL_${Date.now()}`;
}

/**
 * Tìm màu sắc theo ID
 */
async function findProductColorById(colorId) {
  return ProductColor.findByPk(colorId, { raw: true });
}

/**
 * Tìm màu sắc theo tên (không phân biệt hoa thường)
 */
async function findProductColorByName(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  return ProductColor.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('color_name')),
      trimmed.toLowerCase()
    ),
    raw: true,
  });
}

/**
 * Tạo mới màu sắc (nếu đã có theo tên thì trả về bản ghi cũ)
 */
async function createProductColor({ color_name, color_code, hex_value, createby }) {
  if (!color_name || typeof color_name !== 'string' || !color_name.trim()) {
    throw new Error('Tên màu sắc không được để trống');
  }

  const trimmedName = color_name.trim();

  // Kiểm tra trùng tên trước
  const existingByName = await findProductColorByName(trimmedName);
  if (existingByName) {
    return existingByName;
  }

  let baseCode = color_code ? String(color_code).trim().toUpperCase() : generateColorCode(trimmedName);
  let candidateCode = baseCode;
  let counter = 1;

  while (await ProductColor.findOne({ where: { color_code: candidateCode } })) {
    candidateCode = `${baseCode}_${counter}`;
    if (candidateCode.length > 50) {
      candidateCode = `COL_${Date.now().toString(36).toUpperCase()}_${counter}`.slice(0, 50);
    }
    counter++;
  }

  let validHex = null;
  if (hex_value && typeof hex_value === 'string') {
    const trimmedHex = hex_value.trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmedHex)) {
      validHex = trimmedHex.toUpperCase();
    }
  }

  const newRecord = await ProductColor.create({
    color_code: candidateCode,
    color_name: trimmedName,
    hex_value: validHex,
    createby: createby || 'SYSTEM',
  });

  return newRecord.get({ plain: true });
}

/**
 * Lấy tất cả màu sắc
 */
async function getAllProductColors() {
  return ProductColor.findAll({
    attributes: ['color_id', 'color_code', 'color_name', 'hex_value'],
    order: [['color_name', 'ASC']],
    raw: true,
  });
}

module.exports = {
  ProductColor,
  findProductColorById,
  findProductColorByName,
  createProductColor,
  getAllProductColors,
};

