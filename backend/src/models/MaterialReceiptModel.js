// =========================================================
// MaterialReceiptModel.js
// Entity Model & Repository Functions for Purchase Receipts (Phiếu nhập kho)
// =========================================================

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { Supplier } = require('./SupplierModel');
const { UserAccount } = require('./userAccount.model');
const { MaterialReceiptItem } = require('./MaterialReceiptItemModel');
const { RawMaterial } = require('./RawMaterialModel');

const MaterialReceipt = sequelize.define(
  'MaterialReceipt',
  {
    receipt_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    receipt_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    supplier_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'supplier', key: 'supplier_id' },
    },
    receipt_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    received_by: {
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
    tableName: 'material_receipt',
    timestamps: true,
    createdAt: 'createdate',
    updatedAt: 'modifiedate',
    indexes: [
      { name: 'uk_material_receipt_code', unique: true, fields: ['receipt_code'] },
      { name: 'idx_material_receipt_supplier', unique: false, fields: ['supplier_id'] },
      { name: 'idx_material_receipt_status', unique: false, fields: ['status'] },
      { name: 'idx_material_receipt_received_by', unique: false, fields: ['received_by'] },
    ],
  }
);

// Setup associations safely
const isModel = (m) => typeof m === 'function' && typeof m.belongsTo === 'function';

if (isModel(MaterialReceipt) && isModel(Supplier)) {
  if (!MaterialReceipt.associations || !MaterialReceipt.associations.supplier) {
    MaterialReceipt.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
    Supplier.hasMany(MaterialReceipt, { foreignKey: 'supplier_id', as: 'receipts' });
  }
  if (!Supplier.associations || !Supplier.associations.materialReceiptSupplierIdRecords) {
    Supplier.hasMany(MaterialReceipt, { foreignKey: 'supplier_id', as: 'materialReceiptSupplierIdRecords' });
    MaterialReceipt.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'materialReceiptSupplierId' });
  }
}

if (isModel(MaterialReceipt) && isModel(UserAccount)) {
  if (!MaterialReceipt.associations || !MaterialReceipt.associations.receiver) {
    MaterialReceipt.belongsTo(UserAccount, { foreignKey: 'received_by', as: 'receiver' });
  }
}

if (isModel(MaterialReceipt) && isModel(MaterialReceiptItem)) {
  if (!MaterialReceipt.associations || !MaterialReceipt.associations.items) {
    MaterialReceipt.hasMany(MaterialReceiptItem, { foreignKey: 'receipt_id', as: 'items' });
    MaterialReceiptItem.belongsTo(MaterialReceipt, { foreignKey: 'receipt_id', as: 'receipt' });
  }
}

if (isModel(MaterialReceiptItem) && isModel(RawMaterial)) {
  if (!MaterialReceiptItem.associations || !MaterialReceiptItem.associations.rawMaterial) {
    MaterialReceiptItem.belongsTo(RawMaterial, { foreignKey: 'raw_material_id', as: 'rawMaterial' });
    RawMaterial.hasMany(MaterialReceiptItem, { foreignKey: 'raw_material_id', as: 'receiptItems' });
  }
}

// =========================================================
// Repository / Query Functions (Data Access Layer)
// =========================================================

/**
 * Tìm phiếu nhập theo ID kèm chi tiết Nhà cung cấp, Người nhận và Danh sách nguyên vật liệu
 */
async function findReceiptById(receiptId) {
  const include = [];

  if (isModel(Supplier)) {
    include.push({
      model: Supplier,
      as: 'supplier',
      attributes: ['supplier_id', 'supplier_code', 'supplier_name', 'phone_number', 'address', 'status'],
    });
  }

  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'receiver',
      attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
    });
  }

  if (isModel(MaterialReceiptItem)) {
    const itemInclude = [];
    if (isModel(RawMaterial)) {
      itemInclude.push({
        model: RawMaterial,
        as: 'rawMaterial',
        attributes: ['raw_material_id', 'raw_code', 'raw_name', 'unit', 'quantity_on_hand'],
      });
    }
    include.push({
      model: MaterialReceiptItem,
      as: 'items',
      include: itemInclude,
    });
  }

  return MaterialReceipt.findByPk(receiptId, {
    include,
    order: isModel(MaterialReceiptItem) ? [[{ model: MaterialReceiptItem, as: 'items' }, 'receipt_item_id', 'ASC']] : undefined,
  });
}

/**
 * Tìm phiếu nhập theo mã phiếu (receipt_code)
 */
async function findReceiptByCode(receiptCode) {
  if (!receiptCode) return null;
  return MaterialReceipt.findOne({
    where: { receipt_code: receiptCode.trim() },
    raw: true,
  });
}

/**
 * Lấy danh sách phiếu nhập có lọc, tìm kiếm và phân trang
 */
async function getReceiptsWithPagination({
  search,
  status,
  supplier_id,
  from_date,
  to_date,
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

  if (supplier_id && supplier_id !== 'ALL') {
    whereClause.supplier_id = supplier_id;
  }

  if (from_date && to_date) {
    whereClause.receipt_date = { [Op.between]: [from_date, to_date] };
  } else if (from_date) {
    whereClause.receipt_date = { [Op.gte]: from_date };
  } else if (to_date) {
    whereClause.receipt_date = { [Op.lte]: to_date };
  }

  if (search && search.trim()) {
    const trimmed = search.trim();
    whereClause[Op.or] = [
      { receipt_code: { [Op.like]: `%${trimmed}%` } },
      { note: { [Op.like]: `%${trimmed}%` } },
      { '$supplier.supplier_name$': { [Op.like]: `%${trimmed}%` } },
      { '$supplier.supplier_code$': { [Op.like]: `%${trimmed}%` } },
    ];
  }

  const include = [];
  if (isModel(Supplier)) {
    include.push({
      model: Supplier,
      as: 'supplier',
      attributes: ['supplier_id', 'supplier_code', 'supplier_name', 'phone_number'],
    });
  }
  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'receiver',
      attributes: ['user_account_id', 'full_name'],
    });
  }
  if (isModel(MaterialReceiptItem)) {
    include.push({
      model: MaterialReceiptItem,
      as: 'items',
      attributes: ['receipt_item_id', 'raw_material_id', 'quantity', 'unit_price'],
    });
  }

  const { count, rows } = await MaterialReceipt.findAndCountAll({
    where: whereClause,
    include,
    order: [
      ['receipt_date', 'DESC'],
      ['receipt_id', 'DESC'],
    ],
    offset,
    limit: limitNum,
    distinct: true,
  });

  return {
    receipts: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limitNum) || 1,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

/**
 * Thống kê tổng hợp phiếu nhập (Số lượng, Trạng thái, Tổng tiền nhập đã CONFIRMED)
 */
async function getReceiptStatistics() {
  const [totalCount, draftCount, confirmedCount, cancelledCount] = await Promise.all([
    MaterialReceipt.count(),
    MaterialReceipt.count({ where: { status: 'DRAFT' } }),
    MaterialReceipt.count({ where: { status: 'CONFIRMED' } }),
    MaterialReceipt.count({ where: { status: 'CANCELLED' } }),
  ]);

  const confirmedTotalAmount =
    (await MaterialReceipt.sum('total_amount', {
      where: { status: 'CONFIRMED' },
    })) || 0;

  return {
    totalReceipts: totalCount,
    draftCount,
    confirmedCount,
    cancelledCount,
    confirmedTotalAmount: Number(confirmedTotalAmount),
  };
}

/**
 * Tự động sinh mã phiếu nhập tiếp theo (vd: RCP-20261027-0001)
 */
async function generateNextReceiptCode(receiptDate) {
  let datePart;
  if (receiptDate) {
    datePart = String(receiptDate).replace(/-/g, '').slice(0, 8);
  } else {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    datePart = `${y}${m}${d}`;
  }

  const prefix = `RCP-${datePart}-`;
  const latest = await MaterialReceipt.findOne({
    where: {
      receipt_code: { [Op.like]: `${prefix}%` },
    },
    order: [['receipt_id', 'DESC']],
    attributes: ['receipt_code'],
    raw: true,
  });

  let nextNum = 1;
  if (latest && latest.receipt_code) {
    const suffix = latest.receipt_code.slice(prefix.length);
    const parsed = parseInt(suffix, 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }

  let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
  while (await findReceiptByCode(candidate)) {
    nextNum++;
    candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
}

/**
 * Tạo mới phiếu nhập và các mặt hàng bên trong trong 1 transaction
 */
async function createReceiptWithItems({ receiptData, items }, customTransaction = null) {
  const itemModel = MaterialReceiptItem;
  const rawModel = RawMaterial;

  const execute = async (t) => {
    // 1. Tính tổng tiền từ các mặt hàng
    const totalAmount = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
      0
    );

    // 2. Tạo phiếu nhập
    const receipt = await MaterialReceipt.create(
      {
        ...receiptData,
        total_amount: totalAmount,
      },
      { transaction: t }
    );

    // 3. Tạo các dòng chi tiết phiếu nhập
    const receiptItemsData = items.map((item) => ({
      receipt_id: receipt.receipt_id,
      raw_material_id: item.raw_material_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      note: item.note || null,
      createby: receiptData.createby || null,
    }));

    await itemModel.bulkCreate(receiptItemsData, { transaction: t });

    // 4. Nếu trạng thái là CONFIRMED ngay từ đầu -> cập nhật tăng tồn kho
    if (receiptData.status === 'CONFIRMED') {
      for (const item of items) {
        await rawModel.increment('quantity_on_hand', {
          by: Number(item.quantity),
          where: { raw_material_id: item.raw_material_id },
          transaction: t,
        });
      }
    }

    return receipt;
  };

  if (customTransaction) {
    const createdReceipt = await execute(customTransaction);
    return findReceiptById(createdReceipt.receipt_id);
  }

  const result = await sequelize.transaction(execute);
  return findReceiptById(result.receipt_id);
}

/**
 * Cập nhật phiếu nhập và các mặt hàng bên trong
 */
async function updateReceiptWithItems(receiptId, { receiptData, items }, customTransaction = null) {
  const itemModel = MaterialReceiptItem;
  const rawModel = RawMaterial;

  const execute = async (t) => {
    const receipt = await MaterialReceipt.findByPk(receiptId, { transaction: t });
    if (!receipt) {
      throw new Error('Không tìm thấy phiếu nhập');
    }

    const prevStatus = receipt.status;
    const newStatus = receiptData.status || prevStatus;

    if (prevStatus === 'CANCELLED') {
      throw new Error('Phiếu nhập đã hủy (CANCELLED), không thể chỉnh sửa.');
    }

    // Nếu phiếu trước đó là CONFIRMED -> Khóa chặt chẽ, không cho sửa hay hủy
    if (prevStatus === 'CONFIRMED') {
      throw new Error('Phiếu nhập đã xác nhận nhập kho (CONFIRMED) là chứng từ đã chốt, không thể chỉnh sửa hoặc hủy bỏ.');
    }

    // Trường hợp prevStatus === 'DRAFT'
    let totalAmount = receipt.total_amount;

    if (items && Array.isArray(items)) {
      totalAmount = items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
        0
      );

      // Xóa mặt hàng cũ, thêm mặt hàng mới
      await itemModel.destroy({
        where: { receipt_id: receiptId },
        transaction: t,
      });

      const receiptItemsData = items.map((item) => ({
        receipt_id: receiptId,
        raw_material_id: item.raw_material_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        note: item.note || null,
        createby: receipt.createby,
        modifieby: receiptData.modifieby || null,
      }));

      await itemModel.bulkCreate(receiptItemsData, { transaction: t });
    }

    // Cập nhật thông tin phiếu
    await receipt.update(
      {
        supplier_id: receiptData.supplier_id !== undefined ? receiptData.supplier_id : receipt.supplier_id,
        receipt_date: receiptData.receipt_date || receipt.receipt_date,
        total_amount: totalAmount,
        status: newStatus,
        received_by: receiptData.received_by !== undefined ? receiptData.received_by : receipt.received_by,
        note: receiptData.note !== undefined ? receiptData.note : receipt.note,
        modifieby: receiptData.modifieby || receipt.modifieby,
      },
      { transaction: t }
    );

    // Nếu chuyển từ DRAFT sang CONFIRMED -> cộng tồn kho
    if (newStatus === 'CONFIRMED') {
      const confirmedItems = await itemModel.findAll({
        where: { receipt_id: receiptId },
        transaction: t,
      });

      for (const item of confirmedItems) {
        await rawModel.increment('quantity_on_hand', {
          by: Number(item.quantity),
          where: { raw_material_id: item.raw_material_id },
          transaction: t,
        });
      }
    }

    return receipt;
  };

  if (customTransaction) {
    const updated = await execute(customTransaction);
    return findReceiptById(updated.receipt_id);
  }

  const result = await sequelize.transaction(execute);
  return findReceiptById(result.receipt_id);
}

/**
 * Xóa phiếu nhập (chỉ cho phép khi ở trạng thái DRAFT hoặc CANCELLED)
 */
async function deleteReceipt(receiptId, customTransaction = null) {
  const itemModel = MaterialReceiptItem;

  const execute = async (t) => {
    const receipt = await MaterialReceipt.findByPk(receiptId, { transaction: t });
    if (!receipt) {
      throw new Error('Không tìm thấy phiếu nhập cần xóa.');
    }

    if (receipt.status === 'CONFIRMED') {
      throw new Error('Không thể xóa phiếu nhập đã xác nhận (CONFIRMED). Vui lòng hủy phiếu trước.');
    }

    // Xóa các mặt hàng liên quan
    await itemModel.destroy({
      where: { receipt_id: receiptId },
      transaction: t,
    });

    // Xóa phiếu nhập
    await receipt.destroy({ transaction: t });
    return true;
  };

  if (customTransaction) {
    return execute(customTransaction);
  }

  return sequelize.transaction(execute);
}

module.exports = {
  MaterialReceipt,
  findReceiptById,
  findReceiptByCode,
  getReceiptsWithPagination,
  getReceiptStatistics,
  generateNextReceiptCode,
  createReceiptWithItems,
  updateReceiptWithItems,
  deleteReceipt,
};
