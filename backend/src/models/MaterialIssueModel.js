// =========================================================
// MaterialIssueModel.js
// Entity Model & Repository Functions for Material Export / Issue Slips (Phiếu xuất kho nguyên vật liệu)
// =========================================================

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { ProductionOrder } = require('./ProductionOrderModel');
const { UserAccount } = require('./userAccount.model');
const { MaterialIssueItem } = require('./MaterialIssueItemModel');
const { RawMaterial } = require('./RawMaterialModel');

const MaterialIssue = sequelize.define(
  'MaterialIssue',
  {
    issue_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    issue_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    production_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'production_order', key: 'production_id' },
    },
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    issued_by: {
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
    tableName: 'material_issue',
    timestamps: true,
    createdAt: 'createdate',
    updatedAt: 'modifiedate',
    indexes: [
      { name: 'uk_material_issue_code', unique: true, fields: ['issue_code'] },
      { name: 'idx_material_issue_production', unique: false, fields: ['production_id'] },
      { name: 'idx_material_issue_status', unique: false, fields: ['status'] },
      { name: 'idx_material_issue_issued_by', unique: false, fields: ['issued_by'] },
    ],
  }
);

// Setup associations safely to prevent Jest mock issues
const isModel = (m) => typeof m === 'function' && typeof m.belongsTo === 'function';

if (isModel(MaterialIssue) && isModel(ProductionOrder)) {
  if (!MaterialIssue.associations || !MaterialIssue.associations.productionOrder) {
    MaterialIssue.belongsTo(ProductionOrder, { foreignKey: 'production_id', as: 'productionOrder' });
    ProductionOrder.hasMany(MaterialIssue, { foreignKey: 'production_id', as: 'issues' });
  }
}

if (isModel(MaterialIssue) && isModel(UserAccount)) {
  if (!MaterialIssue.associations || !MaterialIssue.associations.issuer) {
    MaterialIssue.belongsTo(UserAccount, { foreignKey: 'issued_by', as: 'issuer' });
  }
}

if (isModel(MaterialIssue) && isModel(MaterialIssueItem)) {
  if (!MaterialIssue.associations || !MaterialIssue.associations.items) {
    MaterialIssue.hasMany(MaterialIssueItem, { foreignKey: 'issue_id', as: 'items' });
    MaterialIssueItem.belongsTo(MaterialIssue, { foreignKey: 'issue_id', as: 'issue' });
  }
}

if (isModel(MaterialIssueItem) && isModel(RawMaterial)) {
  if (!MaterialIssueItem.associations || !MaterialIssueItem.associations.rawMaterial) {
    MaterialIssueItem.belongsTo(RawMaterial, { foreignKey: 'raw_material_id', as: 'rawMaterial' });
    RawMaterial.hasMany(MaterialIssueItem, { foreignKey: 'raw_material_id', as: 'issueItems' });
  }
}

// =========================================================
// Repository / Query Functions (Data Access Layer)
// =========================================================

/**
 * Tìm phiếu xuất kho theo ID kèm chi tiết Lệnh gia công, Người xuất và Danh sách nguyên vật liệu
 */
async function findIssueById(issueId) {
  const include = [];

  if (isModel(ProductionOrder)) {
    include.push({
      model: ProductionOrder,
      as: 'productionOrder',
      attributes: ['production_id', 'production_code', 'production_type', 'status', 'planned_start', 'planned_end', 'note'],
    });
  }

  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'issuer',
      attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
    });
  }

  if (isModel(MaterialIssueItem)) {
    const itemInclude = [];
    if (isModel(RawMaterial)) {
      itemInclude.push({
        model: RawMaterial,
        as: 'rawMaterial',
        attributes: ['raw_material_id', 'raw_code', 'raw_name', 'unit', 'quantity_on_hand'],
      });
    }
    include.push({
      model: MaterialIssueItem,
      as: 'items',
      include: itemInclude,
    });
  }

  return MaterialIssue.findByPk(issueId, { include });
}

/**
 * Tìm phiếu xuất kho theo mã phiếu
 */
async function findIssueByCode(issueCode) {
  return MaterialIssue.findOne({
    where: { issue_code: issueCode },
  });
}

/**
 * Lấy danh sách phiếu xuất kho có tìm kiếm, lọc trạng thái, lệnh gia công, ngày và phân trang
 */
async function getIssuesWithPagination({
  search,
  status,
  production_id,
  from_date,
  to_date,
  page = 1,
  limit = 10,
  sort_by = 'createdate',
  sort_dir = 'DESC',
}) {
  const where = {};

  // Lọc theo trạng thái
  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Lọc theo lệnh gia công
  if (production_id && production_id !== 'ALL') {
    where.production_id = Number(production_id);
  }

  // Lọc theo khoảng ngày xuất kho
  if (from_date && to_date) {
    where.issue_date = { [Op.between]: [from_date, to_date] };
  } else if (from_date) {
    where.issue_date = { [Op.gte]: from_date };
  } else if (to_date) {
    where.issue_date = { [Op.lte]: to_date };
  }

  // Tìm kiếm từ khóa theo mã phiếu hoặc ghi chú
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    where[Op.or] = [
      { issue_code: { [Op.like]: s } },
      { note: { [Op.like]: s } },
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);

  const include = [];

  if (isModel(ProductionOrder)) {
    include.push({
      model: ProductionOrder,
      as: 'productionOrder',
      attributes: ['production_id', 'production_code', 'production_type', 'status'],
    });
  }

  if (isModel(UserAccount)) {
    include.push({
      model: UserAccount,
      as: 'issuer',
      attributes: ['user_account_id', 'full_name', 'email'],
    });
  }

  if (isModel(MaterialIssueItem)) {
    const itemInclude = [];
    if (isModel(RawMaterial)) {
      itemInclude.push({
        model: RawMaterial,
        as: 'rawMaterial',
        attributes: ['raw_material_id', 'raw_code', 'raw_name', 'unit', 'quantity_on_hand'],
      });
    }
    include.push({
      model: MaterialIssueItem,
      as: 'items',
      include: itemInclude,
    });
  }

  const allowedSortFields = ['createdate', 'issue_date', 'issue_code', 'status'];
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'createdate';
  const sortDirection = ['ASC', 'DESC'].includes(String(sort_dir).toUpperCase())
    ? String(sort_dir).toUpperCase()
    : 'DESC';

  const { count, rows } = await MaterialIssue.findAndCountAll({
    where,
    include,
    order: [[sortField, sortDirection]],
    limit: Number(limit),
    offset: Number(offset),
    distinct: true,
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / Number(limit)) || 1,
    currentPage: Number(page),
    itemsPerPage: Number(limit),
    issues: rows,
  };
}

/**
 * Thống kê tổng quan phiếu xuất kho
 */
async function getIssueStatistics() {
  const [totalIssues, draftCount, confirmedCount, cancelledCount] = await Promise.all([
    MaterialIssue.count(),
    MaterialIssue.count({ where: { status: 'DRAFT' } }),
    MaterialIssue.count({ where: { status: 'CONFIRMED' } }),
    MaterialIssue.count({ where: { status: 'CANCELLED' } }),
  ]);

  // Tổng số lượng nguyên vật liệu đã xuất kho (chỉ tính phiếu CONFIRMED)
  let totalQuantityIssued = 0;
  if (isModel(MaterialIssueItem)) {
    const confirmedIssues = await MaterialIssue.findAll({
      where: { status: 'CONFIRMED' },
      attributes: ['issue_id'],
    });
    const confirmedIds = confirmedIssues.map((i) => i.issue_id);

    if (confirmedIds.length > 0) {
      const sumResult = await MaterialIssueItem.sum('quantity', {
        where: { issue_id: { [Op.in]: confirmedIds } },
      });
      totalQuantityIssued = sumResult || 0;
    }
  }

  return {
    totalIssues,
    draftCount,
    confirmedCount,
    cancelledCount,
    totalQuantityIssued,
  };
}

/**
 * Sinh mã phiếu xuất tiếp theo: EXP-YYYYMMDD-0001
 */
async function generateNextIssueCode(dateStr) {
  let targetDate = dateStr;
  if (!targetDate) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    targetDate = `${yyyy}-${mm}-${dd}`;
  }

  const cleanDate = targetDate.replace(/-/g, '');
  const prefix = `EXP-${cleanDate}-`;

  const latestIssue = await MaterialIssue.findOne({
    where: {
      issue_code: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [['issue_code', 'DESC']],
    attributes: ['issue_code'],
  });

  let nextSequence = 1;
  if (latestIssue && latestIssue.issue_code) {
    const parts = latestIssue.issue_code.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Tạo mới phiếu xuất kho và các mặt hàng bên trong
 * Hỗ trợ giao dịch (transaction)
 */
async function createIssueWithItems({ issueData, items }, customTransaction = null) {
  const itemModel = MaterialIssueItem;
  const rawModel = RawMaterial;

  const execute = async (t) => {
    // 1. Tạo phiếu xuất
    const issue = await MaterialIssue.create(issueData, { transaction: t });

    // 2. Tạo các dòng chi tiết phiếu xuất
    const issueItemsData = items.map((item) => ({
      issue_id: issue.issue_id,
      raw_material_id: item.raw_material_id,
      quantity: item.quantity,
      note: item.note || null,
      createby: issueData.createby || null,
    }));

    await itemModel.bulkCreate(issueItemsData, { transaction: t });

    // 3. Nếu trạng thái là CONFIRMED ngay từ đầu -> kiểm tra tồn kho & trừ tồn kho
    if (issueData.status === 'CONFIRMED') {
      for (const item of items) {
        const raw = await rawModel.findByPk(item.raw_material_id, { transaction: t });
        if (!raw) {
          throw new Error(`Nguyên vật liệu ID ${item.raw_material_id} không tồn tại.`);
        }
        if (raw.quantity_on_hand < item.quantity) {
          throw new Error(
            `Không thể xuất kho: Nguyên vật liệu '${raw.raw_name}' hiện chỉ còn tồn kho ${raw.quantity_on_hand}, không đủ để xuất ${item.quantity}.`
          );
        }

        await rawModel.decrement('quantity_on_hand', {
          by: Number(item.quantity),
          where: { raw_material_id: item.raw_material_id },
          transaction: t,
        });
      }
    }

    return issue;
  };

  if (customTransaction) {
    const createdIssue = await execute(customTransaction);
    return findIssueById(createdIssue.issue_id);
  }

  const result = await sequelize.transaction(execute);
  return findIssueById(result.issue_id);
}

/**
 * Cập nhật phiếu xuất kho và các mặt hàng (chỉ cho phép khi ở trạng thái DRAFT)
 */
async function updateIssueWithItems(issueId, { issueData, items }, customTransaction = null) {
  const itemModel = MaterialIssueItem;
  const rawModel = RawMaterial;

  const execute = async (t) => {
    const issue = await MaterialIssue.findByPk(issueId, { transaction: t });
    if (!issue) {
      throw new Error('Không tìm thấy phiếu xuất kho');
    }

    const prevStatus = issue.status;
    const newStatus = issueData.status || prevStatus;

    if (prevStatus === 'CONFIRMED') {
      throw new Error('Phiếu xuất kho đã xác nhận (CONFIRMED) là chứng từ đã chốt, không thể chỉnh sửa hoặc hủy bỏ.');
    }

    if (prevStatus === 'CANCELLED') {
      throw new Error('Phiếu xuất kho đã hủy (CANCELLED), không thể chỉnh sửa.');
    }

    // Trường hợp prevStatus === 'DRAFT'
    if (items && Array.isArray(items)) {
      // Xóa mặt hàng cũ, thêm mặt hàng mới
      await itemModel.destroy({
        where: { issue_id: issueId },
        transaction: t,
      });

      const issueItemsData = items.map((item) => ({
        issue_id: issueId,
        raw_material_id: item.raw_material_id,
        quantity: item.quantity,
        note: item.note || null,
        createby: issue.createby,
        modifieby: issueData.modifieby || null,
      }));

      await itemModel.bulkCreate(issueItemsData, { transaction: t });
    }

    // Cập nhật thông tin phiếu xuất
    await issue.update(
      {
        production_id: issueData.production_id !== undefined ? issueData.production_id : issue.production_id,
        issue_date: issueData.issue_date || issue.issue_date,
        status: newStatus,
        issued_by: issueData.issued_by !== undefined ? issueData.issued_by : issue.issued_by,
        note: issueData.note !== undefined ? issueData.note : issue.note,
        modifieby: issueData.modifieby || issue.modifieby,
      },
      { transaction: t }
    );

    // Nếu chuyển từ DRAFT sang CONFIRMED -> kiểm tra tồn kho & trừ tồn kho
    if (newStatus === 'CONFIRMED') {
      const confirmedItems = await itemModel.findAll({
        where: { issue_id: issueId },
        transaction: t,
      });

      for (const item of confirmedItems) {
        const raw = await rawModel.findByPk(item.raw_material_id, { transaction: t });
        if (!raw) {
          throw new Error(`Nguyên vật liệu ID ${item.raw_material_id} không tồn tại.`);
        }
        if (raw.quantity_on_hand < item.quantity) {
          throw new Error(
            `Không thể xuất kho: Nguyên vật liệu '${raw.raw_name}' hiện chỉ còn tồn kho ${raw.quantity_on_hand}, không đủ để xuất ${item.quantity}.`
          );
        }

        await rawModel.decrement('quantity_on_hand', {
          by: Number(item.quantity),
          where: { raw_material_id: item.raw_material_id },
          transaction: t,
        });
      }
    }

    return issue;
  };

  if (customTransaction) {
    const updated = await execute(customTransaction);
    return findIssueById(updated.issue_id);
  }

  const result = await sequelize.transaction(execute);
  return findIssueById(result.issue_id);
}

/**
 * Xóa phiếu xuất kho (chỉ cho phép khi ở trạng thái DRAFT hoặc CANCELLED)
 */
async function deleteIssue(issueId) {
  const itemModel = MaterialIssueItem;

  return sequelize.transaction(async (t) => {
    const issue = await MaterialIssue.findByPk(issueId, { transaction: t });
    if (!issue) {
      throw new Error('Không tìm thấy phiếu xuất kho để xóa.');
    }

    if (issue.status === 'CONFIRMED') {
      throw new Error('Không thể xóa phiếu xuất kho đã xác nhận (CONFIRMED).');
    }

    // Xóa các mặt hàng trước
    await itemModel.destroy({
      where: { issue_id: issueId },
      transaction: t,
    });

    // Xóa phiếu xuất
    await issue.destroy({ transaction: t });

    return true;
  });
}

module.exports = {
  MaterialIssue,
  findIssueById,
  findIssueByCode,
  getIssuesWithPagination,
  getIssueStatistics,
  generateNextIssueCode,
  createIssueWithItems,
  updateIssueWithItems,
  deleteIssue,
};
