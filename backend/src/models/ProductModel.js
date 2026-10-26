// =========================================================
// ProductModel.js
// Entity Model & Repository Functions for Product (Sản phẩm hàng sẵn)
// =========================================================

const { DataTypes, Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { ProductCategory } = require('./ProductCategoryModel');
const { ProductRoom } = require('./ProductRoomModel');
const { ProductMaterial } = require('./ProductMaterialModel');
const { ProductColor } = require('./ProductColorModel');
const { CartItem } = require('./CartItemModel');
const { OrderRequestItem } = require('./OrderRequestItemModel');
const { ContractItem } = require('./ContractItemModel');
const { CustomerOrderItem } = require('./CustomerOrderItemModel');
const { FinishedGoodsReceiptItem } = require('./FinishedGoodsReceiptItemModel');
const { ProductSetItem } = require('./ProductSetItemModel');

const Product = sequelize.define(
  'Product',
  {
    product_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    category_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'product_category', key: 'category_id' },
    },
    room_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'product_room', key: 'room_id' },
    },
    material_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'product_material', key: 'material_id' },
    },
    color_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'product_color', key: 'color_id' },
    },
    product_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    product_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    product_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'SINGLE',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    length_cm: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    width_cm: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height_cm: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    image_url: {
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
    tableName: 'product',
    timestamps: true,
    createdAt: 'createdate',
    updatedAt: 'modifiedate',
    indexes: [
      { name: 'uk_product_code', unique: true, fields: ['product_code'] },
      { name: 'idx_product_type', unique: false, fields: ['product_type'] },
      { name: 'idx_product_category', unique: false, fields: ['category_id'] },
      { name: 'idx_product_room', unique: false, fields: ['room_id'] },
      { name: 'idx_product_material', unique: false, fields: ['material_id'] },
      { name: 'idx_product_color', unique: false, fields: ['color_id'] },
    ],
  }
);

// Setup associations if not already present
if (!Product.associations || !Product.associations.category) {
  Product.belongsTo(ProductCategory, { foreignKey: 'category_id', as: 'category' });
}
if (!Product.associations || !Product.associations.room) {
  Product.belongsTo(ProductRoom, { foreignKey: 'room_id', as: 'room' });
}
if (!Product.associations || !Product.associations.material) {
  Product.belongsTo(ProductMaterial, { foreignKey: 'material_id', as: 'material' });
}
if (!Product.associations || !Product.associations.color) {
  Product.belongsTo(ProductColor, { foreignKey: 'color_id', as: 'color' });
}
if (!Product.associations || !Product.associations.setItems) {
  Product.hasMany(ProductSetItem, { foreignKey: 'set_product_id', as: 'setItems' });
  ProductSetItem.belongsTo(Product, { foreignKey: 'item_product_id', as: 'itemProduct' });
}
if (!Product.associations || !Product.associations.inSets) {
  Product.hasMany(ProductSetItem, { foreignKey: 'item_product_id', as: 'inSets' });
  ProductSetItem.belongsTo(Product, { foreignKey: 'set_product_id', as: 'parentSet' });
}

// =========================================================
// Repository / Query Functions (Data Access Layer)
// =========================================================

/**
 * Tìm sản phẩm theo ID kèm theo danh mục, phòng, chất liệu, màu sắc và danh sách món nếu là bộ (SET)
 */
async function findProductById(productId) {
  return Product.findByPk(productId, {
    include: [
      { model: ProductCategory, as: 'category', attributes: ['category_id', 'category_code', 'category_name'] },
      { model: ProductRoom, as: 'room', attributes: ['room_id', 'room_code', 'room_name'] },
      { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_code', 'material_name'] },
      { model: ProductColor, as: 'color', attributes: ['color_id', 'color_code', 'color_name', 'hex_value'] },
      {
        model: ProductSetItem,
        as: 'setItems',
        include: [
          {
            model: Product,
            as: 'itemProduct',
            attributes: ['product_id', 'product_code', 'product_name', 'length_cm', 'width_cm', 'height_cm', 'price', 'stock_quantity', 'image_url', 'status'],
          },
        ],
      },
      {
        model: ProductSetItem,
        as: 'inSets',
        include: [
          {
            model: Product,
            as: 'parentSet',
            attributes: ['product_id', 'product_code', 'product_name', 'price'],
          },
        ],
      },
    ],
  });
}

/**
 * Tìm sản phẩm theo mã (product_code)
 */
async function findProductByCode(productCode) {
  if (!productCode) return null;
  return Product.findOne({
    where: { product_code: productCode.trim() },
    raw: true,
  });
}

/**
 * Lấy danh sách sản phẩm kèm lọc, tìm kiếm và phân trang
 */
async function getProductsWithPagination({
  search,
  category_id,
  room_id,
  material_id,
  color_id,
  product_type,
  status,
  stock_status,
  include_children = false,
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

  if (product_type && product_type !== 'ALL') {
    whereClause.product_type = product_type;
  }

  if (category_id && category_id !== 'ALL') {
    whereClause.category_id = category_id;
  }

  if (room_id && room_id !== 'ALL') {
    whereClause.room_id = room_id;
  }

  if (material_id && material_id !== 'ALL') {
    whereClause.material_id = material_id;
  }

  if (color_id && color_id !== 'ALL') {
    whereClause.color_id = color_id;
  }

  if (stock_status) {
    if (stock_status === 'OUT_OF_STOCK') {
      whereClause.stock_quantity = 0;
    } else if (stock_status === 'LOW_STOCK') {
      whereClause.stock_quantity = { [Op.gt]: 0, [Op.lte]: 5 };
    } else if (stock_status === 'IN_STOCK') {
      whereClause.stock_quantity = { [Op.gt]: 0 };
    }
  }

  // Các sản phẩm thuộc cùng một bộ luôn được gộp lại và chỉ hiển thị tên bộ ở danh sách chính.
  // Không bao giờ hiển thị riêng lẻ từng sản phẩm con ở danh sách chính (trừ khi bật include_children = true khi tra cứu nội bộ).
  if (!include_children) {
    whereClause[Op.and] = whereClause[Op.and] || [];
    whereClause[Op.and].push(
      sequelize.literal("(`Product`.`product_type` = 'SET' OR `Product`.`product_id` NOT IN (SELECT DISTINCT `item_product_id` FROM `product_set_item`))")
    );
  }

  if (search && search.trim()) {
    const trimmed = search.trim();
    whereClause[Op.or] = [
      { product_code: { [Op.like]: `%${trimmed}%` } },
      { product_name: { [Op.like]: `%${trimmed}%` } },
      { description: { [Op.like]: `%${trimmed}%` } },
    ];
  }

  const { count, rows } = await Product.findAndCountAll({
    where: whereClause,
    include: [
      { model: ProductCategory, as: 'category', attributes: ['category_id', 'category_code', 'category_name'] },
      { model: ProductRoom, as: 'room', attributes: ['room_id', 'room_code', 'room_name'] },
      { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_code', 'material_name'] },
      { model: ProductColor, as: 'color', attributes: ['color_id', 'color_code', 'color_name', 'hex_value'] },
      {
        model: ProductSetItem,
        as: 'setItems',
        include: [
          {
            model: Product,
            as: 'itemProduct',
            attributes: ['product_id', 'product_code', 'product_name', 'length_cm', 'width_cm', 'height_cm', 'price', 'stock_quantity', 'image_url', 'status'],
          },
        ],
      },
      {
        model: ProductSetItem,
        as: 'inSets',
        include: [
          {
            model: Product,
            as: 'parentSet',
            attributes: ['product_id', 'product_code', 'product_name', 'price'],
          },
        ],
      },
    ],
    order: [['createdate', 'DESC']],
    offset,
    limit: limitNum,
    distinct: true,
  });

  return {
    products: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limitNum) || 1,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

/**
 * Đếm số lần sản phẩm được sử dụng trong các giao dịch (đơn hàng, hợp đồng, giỏ hàng, gia công...)
 */
async function countProductUsage(productId) {
  const [cartCount, orderReqCount, contractCount, customerOrderCount, finishedGoodsCount, setItemCount] = await Promise.all([
    CartItem.count({ where: { product_id: productId } }).catch(() => 0),
    OrderRequestItem.count({ where: { product_id: productId } }).catch(() => 0),
    ContractItem.count({ where: { product_id: productId } }).catch(() => 0),
    CustomerOrderItem.count({ where: { product_id: productId } }).catch(() => 0),
    FinishedGoodsReceiptItem.count({ where: { product_id: productId } }).catch(() => 0),
    ProductSetItem.count({
      where: {
        [Op.or]: [{ set_product_id: productId }, { item_product_id: productId }],
      },
    }).catch(() => 0),
  ]);

  return {
    cartCount,
    orderReqCount,
    contractCount,
    customerOrderCount,
    finishedGoodsCount,
    setItemCount,
    totalUsage: cartCount + orderReqCount + contractCount + customerOrderCount + finishedGoodsCount + setItemCount,
  };
}

/**
 * Thêm mới sản phẩm
 */
async function createProduct(productData) {
  return Product.create(productData);
}

/**
 * Cập nhật thông tin sản phẩm
 */
async function updateProduct(productId, updateData) {
  const product = await Product.findByPk(productId);
  if (!product) return null;
  return product.update(updateData);
}

/**
 * Cập nhật danh sách các sản phẩm con trong bộ (SET)
 */
async function updateProductSetItems(setProductId, setItems = [], modifieby = 'SYSTEM') {
  const transaction = await sequelize.transaction();
  try {
    // 1. Xóa các sản phẩm con hiện tại của bộ
    await ProductSetItem.destroy({
      where: { set_product_id: setProductId },
      transaction,
    });

    // 2. Thêm các sản phẩm con mới
    if (Array.isArray(setItems) && setItems.length > 0) {
      const records = setItems
        .filter((it) => it && (it.item_product_id || it.productId))
        .map((it) => ({
          set_product_id: setProductId,
          item_product_id: it.item_product_id || it.productId,
          quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
          createby: modifieby,
          modifieby,
        }));

      if (records.length > 0) {
        await ProductSetItem.bulkCreate(records, { transaction });
      }
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Xóa sản phẩm khỏi database
 */
async function deleteProduct(productId) {
  const product = await Product.findByPk(productId);
  if (!product) return false;
  await product.destroy();
  return true;
}

/**
 * Tự động sinh mã sản phẩm tiếp theo (vd PRD-0001, PRD-0002...)
 */
async function generateNextProductCode() {
  const latest = await Product.findOne({
    where: { product_code: { [Op.like]: 'PRD-%' } },
    order: [['product_id', 'DESC']],
    attributes: ['product_code'],
    raw: true,
  });

  if (!latest || !latest.product_code) {
    return 'PRD-0001';
  }

  const match = latest.product_code.match(/PRD-(\d+)/);
  if (!match) {
    return 'PRD-0001';
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `PRD-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Lấy toàn bộ metadata (danh mục, phòng, chất liệu, màu sắc) phục vụ dropdown
 */
async function getProductMetadata() {
  const [categories, rooms, materials, colors] = await Promise.all([
    ProductCategory.findAll({ attributes: ['category_id', 'category_code', 'category_name'], raw: true }),
    ProductRoom.findAll({ attributes: ['room_id', 'room_code', 'room_name'], raw: true }),
    ProductMaterial.findAll({ attributes: ['material_id', 'material_code', 'material_name'], raw: true }),
    ProductColor.findAll({ attributes: ['color_id', 'color_code', 'color_name', 'hex_value'], raw: true }),
  ]);

  return { categories, rooms, materials, colors };
}

/**
 * Thống kê nhanh tồn kho sản phẩm
 */
async function getProductStockSummary() {
  const totalProducts = await Product.count();
  const outOfStock = await Product.count({ where: { stock_quantity: 0 } });
  const lowStock = await Product.count({ where: { stock_quantity: { [Op.gt]: 0, [Op.lte]: 5 } } });
  const inStock = await Product.count({ where: { stock_quantity: { [Op.gt]: 0 } } });

  const totalQuantity = (await Product.sum('stock_quantity')) || 0;

  return {
    totalProducts,
    inStock,
    outOfStock,
    lowStock,
    totalQuantity,
  };
}

async function getActiveProducts() {
  return sequelize.query(
    `
    SELECT p.product_id, p.product_code, p.product_name, p.description, p.price,
      p.stock_quantity, p.image_url, p.product_type, p.category_id,
      c.category_name, r.room_name, m.material_name, co.color_name
    FROM product p
    JOIN product_category c ON c.category_id = p.category_id
    JOIN product_room r ON r.room_id = p.room_id
    JOIN product_material m ON m.material_id = p.material_id
    JOIN product_color co ON co.color_id = p.color_id
    WHERE p.status = 'ACTIVE'
    ORDER BY p.product_id ASC
  `,
    { type: QueryTypes.SELECT }
  );
}

module.exports = {
  Product,
  findProductById,
  findProductByCode,
  getProductsWithPagination,
  countProductUsage,
  createProduct,
  updateProduct,
  updateProductSetItems,
  deleteProduct,
  generateNextProductCode,
  getProductMetadata,
  getProductStockSummary,
  getActiveProducts,
};
