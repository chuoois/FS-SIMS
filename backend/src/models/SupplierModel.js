// =========================================================
// SupplierModel.js
// Entity Model & Repository Functions for Supplier (Nhà cung cấp)
// =========================================================

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Supplier = sequelize.define(
  'Supplier',
  {
    supplier_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    supplier_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    supplier_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    note: {
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
    tableName: 'supplier',
    timestamps: true,
    createdAt: 'createdate',
    updatedAt: 'modifiedate',
    indexes: [{ name: 'uk_supplier_code', unique: true, fields: ['supplier_code'] }],
  },
);

// =========================================================
// Repository / Query Functions (Data Access Layer)
// =========================================================

/**
 * Tìm nhà cung cấp theo ID
 */
async function findSupplierById(supplierId) {
  return Supplier.findByPk(supplierId, { raw: true });
}

/**
 * Tìm nhà cung cấp theo mã (supplier_code)
 */
async function findSupplierByCode(supplierCode) {
  if (!supplierCode) return null;
  return Supplier.findOne({
    where: { supplier_code: supplierCode.trim() },
    raw: true,
  });
}

/**
 * Lấy danh sách nhà cung cấp kèm tìm kiếm, lọc trạng thái và phân trang
 */
async function getSuppliersWithPagination({ search, status, page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {};

  if (status && status !== 'ALL') {
    whereClause.status = status;
  }

  if (search && search.trim()) {
    const trimmed = search.trim();
    whereClause[Op.or] = [
      { supplier_code: { [Op.like]: `%${trimmed}%` } },
      { supplier_name: { [Op.like]: `%${trimmed}%` } },
      { phone_number: { [Op.like]: `%${trimmed}%` } },
    ];
  }

  const { count, rows } = await Supplier.findAndCountAll({
    where: whereClause,
    limit: limitNum,
    offset,
    order: [['supplier_id', 'DESC']],
    raw: true,
  });

  const totalPages = Math.ceil(count / limitNum) || 1;

  return {
    suppliers: rows,
    totalItems: count,
    totalPages,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

/**
 * Lấy chi tiết nhà cung cấp kèm lịch sử phiếu nhập kho
 */
async function getSupplierWithReceiptHistory(supplierId) {
  const MaterialReceiptModel =
    sequelize.models.MaterialReceipt || require('./MaterialReceiptModel').MaterialReceipt;

  if (isSequelizeModel(Supplier) && isSequelizeModel(MaterialReceiptModel)) {
    if (!Supplier.associations || !Supplier.associations.materialReceiptSupplierIdRecords) {
      Supplier.hasMany(MaterialReceiptModel, {
        foreignKey: 'supplier_id',
        as: 'materialReceiptSupplierIdRecords',
      });
      MaterialReceiptModel.belongsTo(Supplier, {
        foreignKey: 'supplier_id',
        as: 'materialReceiptSupplierId',
      });
    }
  }

  const supplier = await Supplier.findByPk(supplierId, {
    include: [
      {
        model: MaterialReceiptModel,
        as: 'materialReceiptSupplierIdRecords',
        attributes: [
          'receipt_id',
          'receipt_code',
          'receipt_date',
          'total_amount',
          'status',
          'received_by',
          'note',
          'createdate',
        ],
      },
    ],
    order: [
      [{ model: MaterialReceiptModel, as: 'materialReceiptSupplierIdRecords' }, 'receipt_date', 'DESC'],
      [{ model: MaterialReceiptModel, as: 'materialReceiptSupplierIdRecords' }, 'receipt_id', 'DESC'],
    ],
  });

  if (!supplier) return null;
  return supplier.toJSON ? supplier.toJSON() : supplier;
}

/**
 * Đếm số lượng phiếu nhập của 1 nhà cung cấp
 */
async function countMaterialReceiptsBySupplierId(supplierId) {
  const MaterialReceiptModel =
    sequelize.models.MaterialReceipt || require('./MaterialReceiptModel').MaterialReceipt;

  return MaterialReceiptModel.count({
    where: { supplier_id: supplierId },
  });
}

/**
 * Tạo mới nhà cung cấp
 */
async function createSupplier({
  supplier_code,
  supplier_name,
  phone_number,
  address,
  note,
  status = 'ACTIVE',
  createby,
}) {
  const created = await Supplier.create({
    supplier_code: supplier_code.trim(),
    supplier_name: supplier_name.trim(),
    phone_number: phone_number ? phone_number.trim() : null,
    address: address ? address.trim() : null,
    note: note ? note.trim() : null,
    status: status || 'ACTIVE',
    createby,
  });

  return created.toJSON ? created.toJSON() : created;
}

/**
 * Cập nhật thông tin nhà cung cấp (KHÔNG cho sửa supplier_code)
 */
async function updateSupplier(
  supplierId,
  { supplier_name, phone_number, address, note, status, modifieby },
) {
  const updateData = {};
  if (supplier_name !== undefined) updateData.supplier_name = supplier_name.trim();
  if (phone_number !== undefined) updateData.phone_number = phone_number ? phone_number.trim() : null;
  if (address !== undefined) updateData.address = address ? address.trim() : null;
  if (note !== undefined) updateData.note = note ? note.trim() : null;
  if (status !== undefined) updateData.status = status;
  if (modifieby !== undefined) updateData.modifieby = modifieby;

  const [affected] = await Supplier.update(updateData, {
    where: { supplier_id: supplierId },
  });

  if (affected === 0) return null;
  return findSupplierById(supplierId);
}

/**
 * Xóa nhà cung cấp
 */
async function deleteSupplier(supplierId) {
  const affected = await Supplier.destroy({
    where: { supplier_id: supplierId },
  });
  return affected > 0;
}

/**
 * Lấy danh sách các nhà cung cấp đang ACTIVE (phục vụ chọn NCC khi tạo phiếu nhập kho)
 */
async function getActiveSuppliers() {
  return Supplier.findAll({
    where: { status: 'ACTIVE' },
    attributes: [
      'supplier_id',
      'supplier_code',
      'supplier_name',
      'phone_number',
      'address',
      'status',
    ],
    order: [['supplier_name', 'ASC']],
    raw: true,
  });
}

/**
 * Helper kiểm tra hợp lệ khi chọn nhà cung cấp để tạo phiếu nhập mới
 * Quy tắc: Nhà cung cấp INACTIVE không được chọn khi tạo phiếu nhập mới
 */
async function validateSupplierForReceipt(supplierId) {
  const id = Number(supplierId);
  if (!id || isNaN(id) || id <= 0) {
    return {
      isValid: false,
      message: 'ID nhà cung cấp không hợp lệ',
    };
  }

  const supplier = await findSupplierById(id);
  if (!supplier) {
    return {
      isValid: false,
      message: 'Nhà cung cấp không tồn tại',
    };
  }

  if (supplier.status !== 'ACTIVE') {
    return {
      isValid: false,
      message: `Nhà cung cấp '${supplier.supplier_name}' đang ở trạng thái ngừng hoạt động (${supplier.status}), không thể tạo phiếu nhập mới`,
    };
  }

  return {
    isValid: true,
    supplier,
  };
}

/**
 * Tự động sinh mã nhà cung cấp tiếp theo (VD: NCC001, NCC002, ...)
 */
async function generateNextSupplierCode() {
  const lastSupplier = await Supplier.findOne({
    where: {
      supplier_code: { [Op.like]: 'NCC%' },
    },
    order: [['supplier_id', 'DESC']],
    attributes: ['supplier_id', 'supplier_code'],
    raw: true,
  });

  let nextNum = 1;
  if (lastSupplier && lastSupplier.supplier_code) {
    const match = lastSupplier.supplier_code.match(/^NCC(\d+)$/i);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    } else {
      const count = await Supplier.count();
      nextNum = count + 1;
    }
  }

  let candidate = `NCC${String(nextNum).padStart(3, '0')}`;
  while (await findSupplierByCode(candidate)) {
    nextNum++;
    candidate = `NCC${String(nextNum).padStart(3, '0')}`;
  }
  return candidate;
}

module.exports = {
  Supplier,
  findSupplierById,
  findSupplierByCode,
  getSuppliersWithPagination,
  getSupplierWithReceiptHistory,
  countMaterialReceiptsBySupplierId,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getActiveSuppliers,
  validateSupplierForReceipt,
  generateNextSupplierCode,
};
