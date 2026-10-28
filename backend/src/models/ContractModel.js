const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { ContractItem } = require('./ContractItemModel');
const { Product } = require('./ProductModel');
const { UserAccount } = require('./userAccount.model');

const Contract = sequelize.define('Contract', {
  contract_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
  contract_code: { type: DataTypes.STRING(30), allowNull: false },
  source: { type: DataTypes.STRING(20), allowNull: false },
  contract_type: { type: DataTypes.STRING(20), allowNull: false },
  request_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'order_request', key: 'request_id' } },
  customer_account_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
  customer_name: { type: DataTypes.STRING(150), allowNull: false },
  customer_phone: { type: DataTypes.STRING(20), allowNull: false },
  customer_address: { type: DataTypes.STRING(255), allowNull: true },
  total_amount: { type: DataTypes.BIGINT, allowNull: false },
  deposit_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'DRAFT' },
  signed_date: { type: DataTypes.DATEONLY, allowNull: true },
  signed_place: { type: DataTypes.STRING(255), allowNull: true },
  delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
  contract_file_url: { type: DataTypes.STRING(255), allowNull: true },
  terms: { type: DataTypes.TEXT, allowNull: true },
  signed_by: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'user_account', key: 'user_account_id' } },
  note: { type: DataTypes.STRING(500), allowNull: true },
  createby: { type: DataTypes.STRING(100), allowNull: true },
  modifieby: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'contract',
  timestamps: true,
  createdAt: 'createdate',
  updatedAt: 'modifiedate',
  indexes: [
    { name: 'uk_contract_code', unique: true, fields: ['contract_code'] },
    { name: 'uk_contract_request', unique: true, fields: ['request_id'] },
    { name: 'idx_contract_customer', unique: false, fields: ['customer_account_id'] },
    { name: 'idx_contract_status', unique: false, fields: ['status'] },
    { name: 'idx_contract_signed_by', unique: false, fields: ['signed_by'] }
  ],
});

// Setup associations
if (!Contract.associations || !Contract.associations.items) {
  Contract.hasMany(ContractItem, { foreignKey: 'contract_id', as: 'items' });
  ContractItem.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
}
if (!Contract.associations || !Contract.associations.signer) {
  Contract.belongsTo(UserAccount, { foreignKey: 'signed_by', as: 'signer' });
}
if (!ContractItem.associations || !ContractItem.associations.product) {
  ContractItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
}

/**
 * Tự động sinh mã hợp đồng tiếp theo (vd HD-20261028-0001)
 */
async function generateNextContractCode() {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  const prefix = `HD-${dateStr}-`;

  const latest = await Contract.findOne({
    where: { contract_code: { [Op.like]: `${prefix}%` } },
    order: [['contract_id', 'DESC']],
    attributes: ['contract_code'],
    raw: true,
  });

  if (!latest || !latest.contract_code) {
    return `${prefix}0001`;
  }

  const parts = latest.contract_code.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  const nextSeq = isNaN(seq) ? 1 : seq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Tạo hợp đồng bán hàng trực tiếp tại quầy (OFFLINE)
 */
async function createOfflineContract({
  customerName,
  customerPhone,
  customerAddress,
  depositAmount = 0,
  deliveryDate,
  signedPlace = 'Cửa hàng Góc Nhà',
  terms,
  note,
  signedBy,
  createBy,
  items = [],
}) {
  const transaction = await sequelize.transaction();
  try {
    const productIds = items.map((i) => i.product_id);
    const products = await Product.findAll({
      where: { product_id: productIds },
      transaction,
    });

    const productMap = new Map();
    products.forEach((p) => productMap.set(p.product_id, p));

    let calculatedTotal = 0;
    const contractItemsData = [];

    for (const item of items) {
      const prod = productMap.get(item.product_id);
      if (!prod) {
        throw new Error(`Sản phẩm ID ${item.product_id} không tồn tại.`);
      }
      if (prod.status !== 'ACTIVE') {
        throw new Error(`Sản phẩm "${prod.product_name}" hiện không còn kinh doanh.`);
      }
      if (prod.stock_quantity < item.quantity) {
        throw new Error(
          `Sản phẩm "${prod.product_name}" trong kho chỉ còn ${prod.stock_quantity} (bạn chọn ${item.quantity}).`
        );
      }

      const itemTotal = item.quantity * item.unit_price;
      calculatedTotal += itemTotal;

      contractItemsData.push({
        product_id: prod.product_id,
        item_name: prod.product_name,
        category_id: prod.category_id,
        room_id: prod.room_id,
        material_id: prod.material_id,
        color_id: prod.color_id,
        length_cm: prod.length_cm,
        width_cm: prod.width_cm,
        height_cm: prod.height_cm,
        quantity: item.quantity,
        unit_price: item.unit_price,
        description: item.description || prod.description,
        createby: createBy,
      });
    }

    const contractCode = await generateNextContractCode();

    const contract = await Contract.create(
      {
        contract_code: contractCode,
        source: 'OFFLINE',
        contract_type: 'READY',
        request_id: null,
        customer_account_id: null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress || null,
        total_amount: calculatedTotal,
        deposit_amount: depositAmount || 0,
        status: 'DRAFT',
        signed_date: null,
        signed_place: signedPlace,
        delivery_date: deliveryDate || null,
        terms: terms || null,
        signed_by: signedBy || null,
        note: note || null,
        createby: createBy,
      },
      { transaction }
    );

    const itemsToCreate = contractItemsData.map((it) => ({
      ...it,
      contract_id: contract.contract_id,
    }));

    await ContractItem.bulkCreate(itemsToCreate, { transaction });

    await transaction.commit();

    return findContractById(contract.contract_id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Ký và chốt hợp đồng (Chuyển trạng thái sang SIGNED)
 */
async function signContract(contractId, { signedPlace, signedBy, modifieBy } = {}) {
  const contract = await Contract.findByPk(contractId);
  if (!contract) {
    return null;
  }
  if (contract.status === 'SIGNED') {
    throw new Error('Hợp đồng này đã được ký trước đó.');
  }
  if (contract.status === 'CANCELLED') {
    throw new Error('Hợp đồng đã bị hủy, không thể ký.');
  }

  const today = new Date().toISOString().split('T')[0];
  contract.status = 'SIGNED';
  contract.signed_date = today;
  if (signedPlace) contract.signed_place = signedPlace;
  if (signedBy) contract.signed_by = signedBy;
  if (modifieBy) contract.modifieby = modifieBy;

  await contract.save();
  return findContractById(contractId);
}

/**
 * Tìm hợp đồng theo ID
 */
async function findContractById(contractId) {
  return Contract.findByPk(contractId, {
    include: [
      {
        model: ContractItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'price', 'stock_quantity', 'image_url'],
          },
        ],
      },
      {
        model: UserAccount,
        as: 'signer',
        attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
      },
    ],
  });
}

/**
 * Tìm hợp đồng theo mã hợp đồng
 */
async function findContractByCode(contractCode) {
  if (!contractCode) return null;
  return Contract.findOne({
    where: { contract_code: contractCode.trim() },
    include: [
      {
        model: ContractItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'price', 'stock_quantity', 'image_url'],
          },
        ],
      },
    ],
  });
}

/**
 * Lấy danh sách hợp đồng có tìm kiếm, lọc và phân trang
 */
async function getContractsWithPagination({ page = 1, limit = 10, status, search } = {}) {
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
      { contract_code: { [Op.like]: `%${trimmed}%` } },
      { customer_name: { [Op.like]: `%${trimmed}%` } },
      { customer_phone: { [Op.like]: `%${trimmed}%` } },
    ];
  }

  const { rows, count } = await Contract.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: ContractItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name', 'image_url'],
          },
        ],
      },
      {
        model: UserAccount,
        as: 'signer',
        attributes: ['user_account_id', 'full_name'],
      },
    ],
    order: [['contract_id', 'DESC']],
    limit: limitNum,
    offset,
    distinct: true,
  });

  return {
    contracts: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limitNum) || 1,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

module.exports = {
  Contract,
  generateNextContractCode,
  createOfflineContract,
  signContract,
  findContractById,
  findContractByCode,
  getContractsWithPagination,
};
