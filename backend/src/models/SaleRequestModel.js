// =========================================================
// SaleRequestModel.js
// Model / Repository dành cho Sale & Owner quản lý Order Requests
// MVC: Logic truy vấn DB nằm ở Model, không đưa vào Controller
// =========================================================

const { Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { OrderRequest } = require('./OrderRequestModel');
const { OrderRequestItem } = require('./OrderRequestItemModel');
const { OrderRequestImage } = require('./OrderRequestImageModel');
const { UserAccount } = require('./userAccount.model');
const { Contract } = require('./ContractModel');
const { ContractItem } = require('./ContractItemModel');
const { ProductCategory } = require('./ProductCategoryModel');
const { ProductRoom } = require('./ProductRoomModel');
const { ProductMaterial } = require('./ProductMaterialModel');
const { ProductColor } = require('./ProductColorModel');
const { Product } = require('./ProductModel');

// Setup associations (guard to avoid re-define)
if (!OrderRequest.associations || !OrderRequest.associations.items) {
  OrderRequest.hasMany(OrderRequestItem, { foreignKey: 'request_id', as: 'items' });
  OrderRequestItem.belongsTo(OrderRequest, { foreignKey: 'request_id', as: 'request' });
}
if (!OrderRequest.associations || !OrderRequest.associations.images) {
  OrderRequest.hasMany(OrderRequestImage, { foreignKey: 'request_id', as: 'images' });
}
if (!OrderRequest.associations || !OrderRequest.associations.customer) {
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') {
    OrderRequest.belongsTo(UserAccount, { foreignKey: 'customer_account_id', as: 'customer' });
  }
}
if (!OrderRequest.associations || !OrderRequest.associations.assignee) {
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') {
    OrderRequest.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'assignee' });
  }
}
if (!OrderRequest.associations || !OrderRequest.associations.contract) {
  if (typeof Contract === 'function' && typeof Contract.belongsTo === 'function') {
    OrderRequest.hasOne(Contract, { foreignKey: 'request_id', as: 'contract' });
  }
}

// Associations for OrderRequestItem
if (!OrderRequestItem.associations || !OrderRequestItem.associations.category) {
  if (typeof ProductCategory === 'function' && typeof ProductCategory.belongsTo === 'function') {
    OrderRequestItem.belongsTo(ProductCategory, { foreignKey: 'category_id', as: 'category' });
  }
}
if (!OrderRequestItem.associations || !OrderRequestItem.associations.room) {
  if (typeof ProductRoom === 'function' && typeof ProductRoom.belongsTo === 'function') {
    OrderRequestItem.belongsTo(ProductRoom, { foreignKey: 'room_id', as: 'room' });
  }
}
if (!OrderRequestItem.associations || !OrderRequestItem.associations.material) {
  if (typeof ProductMaterial === 'function' && typeof ProductMaterial.belongsTo === 'function') {
    OrderRequestItem.belongsTo(ProductMaterial, { foreignKey: 'material_id', as: 'material' });
  }
}
if (!OrderRequestItem.associations || !OrderRequestItem.associations.color) {
  if (typeof ProductColor === 'function' && typeof ProductColor.belongsTo === 'function') {
    OrderRequestItem.belongsTo(ProductColor, { foreignKey: 'color_id', as: 'color' });
  }
}
if (!OrderRequestItem.associations || !OrderRequestItem.associations.product) {
  if (typeof Product === 'function' && typeof Product.belongsTo === 'function') {
    OrderRequestItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  }
}

/**
 * Tự động sinh mã OrderRequest tiếp theo (vd RQ-20261106-0001)
 */
async function generateNextRequestCode() {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  const prefix = `RQ-${dateStr}-`;

  const latest = await OrderRequest.findOne({
    where: { request_code: { [Op.like]: `${prefix}%` } },
    order: [['request_id', 'DESC']],
    attributes: ['request_code'],
    raw: true,
  });

  if (!latest || !latest.request_code) {
    return `${prefix}0001`;
  }

  const parts = latest.request_code.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  const nextSeq = isNaN(seq) ? 1 : seq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Lấy danh sách khách hàng phục vụ dropdown trong form tạo đơn của Sales
 */
async function getCustomersForSales({ search } = {}) {
  const { UserRole } = require('./userRole.model');
  const whereClause = { status: 'ACTIVE' };
  if (search && search.trim()) {
    const trimmed = search.trim();
    whereClause[Op.or] = [
      { full_name: { [Op.like]: `%${trimmed}%` } },
      { phone_number: { [Op.like]: `%${trimmed}%` } },
      { email: { [Op.like]: `%${trimmed}%` } },
    ];
  }

  return UserAccount.findAll({
    where: whereClause,
    attributes: ['user_account_id', 'full_name', 'email', 'phone_number', 'address'],
    include: [
      {
        model: UserRole,
        as: 'role',
        where: { role_code: 'CUSTOMER' },
        attributes: ['role_id', 'role_code', 'role_name'],
        required: true,
      },
    ],
    order: [['full_name', 'ASC']],
  });
}

/**
 * Lấy danh sách request của khách hàng có tìm kiếm, lọc và phân trang
 */
async function getRequestsWithPagination({
  page = 1,
  limit = 10,
  status,
  search,
  search_by,
  order_type,
  assigned_to,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {};

  if (status && status !== 'ALL') {
    whereClause.status = status;
  }
  if (order_type && order_type !== 'ALL') {
    whereClause.order_type = order_type;
  }
  if (assigned_to) {
    whereClause.assigned_to = assigned_to;
  }
  if (search && search.trim()) {
    const trimmed = search.trim();
    const by = (search_by || 'ALL').toUpperCase();
    if (by === 'CUSTOMER_NAME') {
      whereClause.contact_name = { [Op.like]: `%${trimmed}%` };
    } else if (by === 'REQUEST_CODE') {
      whereClause.request_code = { [Op.like]: `%${trimmed}%` };
    } else if (by === 'PHONE') {
      whereClause.contact_phone = { [Op.like]: `%${trimmed}%` };
    } else {
      whereClause[Op.or] = [
        { request_code: { [Op.like]: `%${trimmed}%` } },
        { contact_name: { [Op.like]: `%${trimmed}%` } },
        { contact_phone: { [Op.like]: `%${trimmed}%` } },
      ];
    }
  }

  const { rows, count } = await OrderRequest.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: UserAccount,
        as: 'customer',
        attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
      },
      {
        model: UserAccount,
        as: 'assignee',
        attributes: ['user_account_id', 'full_name'],
      },
      {
        model: OrderRequestItem,
        as: 'items',
        required: false,
        include: [
          { model: ProductCategory, as: 'category', attributes: ['category_id', 'category_name'], required: false },
          { model: ProductRoom, as: 'room', attributes: ['room_id', 'room_name'], required: false },
          { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_name'], required: false },
          { model: ProductColor, as: 'color', attributes: ['color_id', 'color_name', 'hex_value'], required: false },
          { model: Product, as: 'product', attributes: ['product_id', 'product_code', 'product_name', 'image_url'], required: false },
        ],
      },
      {
        model: OrderRequestImage,
        as: 'images',
        required: false,
      },
      {
        model: Contract,
        as: 'contract',
        attributes: ['contract_id', 'contract_code', 'status'],
        required: false,
      },
    ],
    order: [['request_id', 'DESC']],
    limit: limitNum,
    offset,
    distinct: true,
  });

  return {
    requests: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limitNum) || 1,
    currentPage: pageNum,
    itemsPerPage: limitNum,
  };
}

/**
 * Tìm request theo ID (đầy đủ thông tin cho Detail Modal)
 */
async function findRequestById(requestId) {
  return OrderRequest.findByPk(requestId, {
    include: [
      {
        model: UserAccount,
        as: 'customer',
        attributes: ['user_account_id', 'full_name', 'email', 'phone_number'],
      },
      {
        model: UserAccount,
        as: 'assignee',
        attributes: ['user_account_id', 'full_name'],
      },
      {
        model: OrderRequestItem,
        as: 'items',
        required: false,
        include: [
          { model: ProductCategory, as: 'category', attributes: ['category_id', 'category_name'], required: false },
          { model: ProductRoom, as: 'room', attributes: ['room_id', 'room_name'], required: false },
          { model: ProductMaterial, as: 'material', attributes: ['material_id', 'material_name'], required: false },
          { model: ProductColor, as: 'color', attributes: ['color_id', 'color_name', 'hex_value'], required: false },
          { model: Product, as: 'product', attributes: ['product_id', 'product_code', 'product_name', 'image_url'], required: false },
        ],
      },
      {
        model: OrderRequestImage,
        as: 'images',
        required: false,
      },
      {
        model: Contract,
        as: 'contract',
        attributes: ['contract_id', 'contract_code', 'status'],
        required: false,
      },
    ],
  });
}

/**
 * Tạo Order Request bởi Sales từ form Đặt hàng mới
 */
async function createSalesOrderRequest({
  customerAccountId,
  contactName,
  contactPhone,
  contactEmail,
  deliveryAddress,
  title,
  description,
  expectedDate,
  budgetMin,
  budgetMax,
  items = [],
  images = [],
  assignedTo,
  createBy,
}) {
  const transaction = await sequelize.transaction();
  try {
    let finalCustomerAccountId = customerAccountId;

    if (!finalCustomerAccountId) {
      const existingCustomer = await UserAccount.findOne({
        where: { phone_number: contactPhone },
        transaction,
      });
      if (existingCustomer) {
        finalCustomerAccountId = existingCustomer.user_account_id;
      } else {
        const { findUserRoleByCode } = require('./userRole.model');
        const custRole = await findUserRoleByCode('CUSTOMER');
        const roleId = custRole ? custRole.role_id : 4;
        const newCustomer = await UserAccount.create(
          {
            role_id: roleId,
            email: contactEmail || `customer_${Date.now()}@fssims.local`,
            password_hash: '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH',
            full_name: contactName,
            phone_number: contactPhone,
            address: deliveryAddress || null,
            status: 'ACTIVE',
            createby: createBy,
          },
          { transaction }
        );
        finalCustomerAccountId = newCustomer.user_account_id;
      }
    }

    const requestCode = await generateNextRequestCode();
    const isSet = items && items.length > 1;

    const request = await OrderRequest.create(
      {
        request_code: requestCode,
        order_type: 'CUSTOM',
        request_type: isSet ? 'SET' : 'SINGLE',
        customer_account_id: finalCustomerAccountId,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail || null,
        delivery_address: deliveryAddress || null,
        title: title || `Đơn đặt hàng ${contactName} (${requestCode})`,
        description: description || null,
        budget_min: budgetMin || null,
        budget_max: budgetMax || null,
        expected_date: expectedDate || null,
        status: 'PENDING',
        assigned_to: assignedTo || null,
        createby: createBy || null,
      },
      { transaction }
    );

    if (Array.isArray(items) && items.length > 0) {
      const itemRecords = items.map((it) => ({
        request_id: request.request_id,
        product_id: it.productId || it.product_id || null,
        item_name: it.itemName || it.item_name || 'Sản phẩm đặt làm',
        category_id: it.categoryId || it.category_id || null,
        room_id: it.roomId || it.room_id || null,
        material_id: it.materialId || it.material_id || null,
        color_id: it.colorId || it.color_id || null,
        length_cm: it.lengthCm != null ? Number(it.lengthCm) : (it.length_cm != null ? Number(it.length_cm) : null),
        width_cm: it.widthCm != null ? Number(it.widthCm) : (it.width_cm != null ? Number(it.width_cm) : null),
        height_cm: it.heightCm != null ? Number(it.heightCm) : (it.height_cm != null ? Number(it.height_cm) : null),
        quantity: Math.max(1, Number(it.quantity) || 1),
        unit_price: it.unitPrice != null ? Number(it.unitPrice) : (it.unit_price != null ? Number(it.unit_price) : null),
        description: it.description || null,
        createby: createBy,
      }));

      const createdItems = await OrderRequestItem.bulkCreate(itemRecords, { transaction });

      if (Array.isArray(images) && images.length > 0) {
        const imageRecords = images
          .map((img, idx) => {
            const imgUrl = typeof img === 'string' ? img : (img.imageUrl || img.image_url || img.url);
            let itemRefId = null;
            if (typeof img === 'object' && img.itemIndex != null && createdItems[img.itemIndex]) {
              itemRefId = createdItems[img.itemIndex].request_item_id;
            } else if (typeof img === 'object' && img.requestItemId) {
              itemRefId = img.requestItemId;
            }
            return {
              request_id: request.request_id,
              request_item_id: itemRefId,
              image_url: imgUrl,
              sort_order: (typeof img === 'object' && img.sortOrder != null) ? img.sortOrder : idx,
              createby: createBy,
            };
          })
          .filter((r) => Boolean(r.image_url));

        if (imageRecords.length > 0) {
          await OrderRequestImage.bulkCreate(imageRecords, { transaction });
        }
      }
    }

    await transaction.commit();
    return findRequestById(request.request_id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Cập nhật Order Request bởi Sales (khi PENDING hoặc khi Owner yêu cầu REQUEST_CHANGE)
 */
async function updateSalesOrderRequest(
  requestId,
  {
    contactName,
    contactPhone,
    contactEmail,
    deliveryAddress,
    title,
    description,
    expectedDate,
    budgetMin,
    budgetMax,
    items,
    images,
    updatedBy,
    userRole,
    userId,
  }
) {
  const transaction = await sequelize.transaction();
  try {
    const request = await OrderRequest.findByPk(requestId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!request) {
      const err = new Error('Không tìm thấy yêu cầu đặt hàng.');
      err.statusCode = 404;
      throw err;
    }

    // Owner đã chốt thiết kế -> Cấm Sales / Leader tự ý sửa
    if (request.status === 'DESIGN_FINALIZED') {
      const err = new Error('Thiết kế đã được Chủ xưởng chốt, không thể chỉnh sửa.');
      err.statusCode = 400;
      throw err;
    }
    if (['CONVERTED', 'CONTRACT_SIGNED', 'REJECTED', 'CANCELLED'].includes(request.status)) {
      const err = new Error('Không thể chỉnh sửa đơn ở trạng thái hiện tại.');
      err.statusCode = 400;
      throw err;
    }

    // Kiểm tra quyền sở hữu đơn nếu role là Sales
    if (userRole && userRole !== 'OWNER' && request.assigned_to && Number(request.assigned_to) !== Number(userId)) {
      const err = new Error('Bạn không có quyền chỉnh sửa đơn hàng của nhân viên khác.');
      err.statusCode = 403;
      throw err;
    }

    // Nếu đơn trước đó bị Owner yêu cầu sửa -> chuyển lại về PENDING để Owner duyệt lại
    if (request.status === 'REQUEST_CHANGE') {
      request.status = 'PENDING';
      request.staff_note = `Sales đã cập nhật lại theo phản hồi: ${request.staff_note || ''}`;
    }

    if (contactName) request.contact_name = contactName;
    if (contactPhone) request.contact_phone = contactPhone;
    if (contactEmail !== undefined) request.contact_email = contactEmail;
    if (deliveryAddress !== undefined) request.delivery_address = deliveryAddress;
    if (title) request.title = title;
    if (description !== undefined) request.description = description;
    if (expectedDate !== undefined) request.expected_date = expectedDate;
    if (budgetMin !== undefined) request.budget_min = budgetMin;
    if (budgetMax !== undefined) request.budget_max = budgetMax;
    request.modifieby = updatedBy;

    if (Array.isArray(items) && items.length > 0) {
      request.request_type = items.length > 1 ? 'SET' : 'SINGLE';
      await OrderRequestItem.destroy({ where: { request_id: requestId }, transaction });

      const itemRecords = items.map((it) => ({
        request_id: requestId,
        product_id: it.productId || it.product_id || null,
        item_name: it.itemName || it.item_name || 'Sản phẩm đặt làm',
        category_id: it.categoryId || it.category_id || null,
        room_id: it.roomId || it.room_id || null,
        material_id: it.materialId || it.material_id || null,
        color_id: it.colorId || it.color_id || null,
        length_cm: it.lengthCm != null ? Number(it.lengthCm) : (it.length_cm != null ? Number(it.length_cm) : null),
        width_cm: it.widthCm != null ? Number(it.widthCm) : (it.width_cm != null ? Number(it.width_cm) : null),
        height_cm: it.heightCm != null ? Number(it.heightCm) : (it.height_cm != null ? Number(it.height_cm) : null),
        quantity: Math.max(1, Number(it.quantity) || 1),
        unit_price: it.unitPrice != null ? Number(it.unitPrice) : (it.unit_price != null ? Number(it.unit_price) : null),
        description: it.description || null,
        createby: updatedBy,
        modifieby: updatedBy,
      }));

      const createdItems = await OrderRequestItem.bulkCreate(itemRecords, { transaction });

      if (Array.isArray(images)) {
        await OrderRequestImage.destroy({ where: { request_id: requestId }, transaction });

        const imageRecords = images
          .map((img, idx) => {
            const imgUrl = typeof img === 'string' ? img : (img.imageUrl || img.image_url || img.url);
            let itemRefId = null;
            if (typeof img === 'object' && img.itemIndex != null && createdItems[img.itemIndex]) {
              itemRefId = createdItems[img.itemIndex].request_item_id;
            } else if (typeof img === 'object' && img.requestItemId) {
              itemRefId = img.requestItemId;
            }
            return {
              request_id: requestId,
              request_item_id: itemRefId,
              image_url: imgUrl,
              sort_order: (typeof img === 'object' && img.sortOrder != null) ? img.sortOrder : idx,
              createby: updatedBy,
            };
          })
          .filter((r) => Boolean(r.image_url));

        if (imageRecords.length > 0) {
          await OrderRequestImage.bulkCreate(imageRecords, { transaction });
        }
      }
    }

    await request.save({ transaction });
    await transaction.commit();
    return findRequestById(requestId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Owner xem xét yêu cầu: Yêu cầu sửa / Từ chối / Duyệt thiết kế / Chốt thiết kế cuối cùng
 */
async function reviewOrderRequest(requestId, action, { reason, note, reviewedBy } = {}) {
  const request = await OrderRequest.findByPk(requestId);
  if (!request) {
    const err = new Error('Không tìm thấy yêu cầu đặt hàng.');
    err.statusCode = 404;
    throw err;
  }

  const normalizedAction = (action || '').toUpperCase();
  if (normalizedAction === 'REQUEST_CHANGE') {
    if (!reason && !note) {
      const err = new Error('Vui lòng nhập lý do hoặc nội dung yêu cầu chỉnh sửa.');
      err.statusCode = 400;
      throw err;
    }
    request.status = 'REQUEST_CHANGE';
    request.staff_note = note || reason;
    request.reject_reason = reason || null;
    request.modifieby = reviewedBy;
  } else if (normalizedAction === 'REJECT') {
    if (!reason) {
      const err = new Error('Vui lòng nhập lý do từ chối yêu cầu.');
      err.statusCode = 400;
      throw err;
    }
    request.status = 'REJECTED';
    request.reject_reason = reason;
    request.modifieby = reviewedBy;
  } else if (normalizedAction === 'APPROVE') {
    request.status = 'APPROVED';
    request.approved_at = new Date();
    request.modifieby = reviewedBy;
    if (note) request.staff_note = note;
  } else if (normalizedAction === 'FINALIZE_DESIGN') {
    // OWNER LÀ NGƯỜI DUY NHẤT CÓ QUYỀN CHỐT THIẾT KẾ CUỐI CÙNG
    request.status = 'DESIGN_FINALIZED';
    request.approved_at = new Date();
    request.modifieby = reviewedBy;
    request.staff_note = note || 'Chủ xưởng đã chốt thiết kế cuối cùng.';
  } else {
    const err = new Error(
      `Hành động "${action}" không hợp lệ. Cho phép: APPROVE, FINALIZE_DESIGN, REQUEST_CHANGE, REJECT.`
    );
    err.statusCode = 400;
    throw err;
  }

  await request.save();
  return findRequestById(requestId);
}

/**
 * Chuyển đổi request thành hợp đồng (DRAFT).
 * Sau khi Owner chốt thiết kế:
 * - Sales nhận lại đơn
 * - Tạo contract mới với source = 'ONLINE', request_id = request.request_id
 * - Tạo ContractItem từ các OrderRequestItem đã chốt
 * - Cập nhật request: status → 'CONVERTED'
 */
async function convertRequestToContract({
  requestId,
  customerName,
  customerPhone,
  customerAddress,
  items,
  depositAmount,
  deliveryDate,
  signedPlace,
  terms,
  note,
  signedBy,
  createBy,
}) {
  const transaction = await sequelize.transaction();
  try {
    const request = await OrderRequest.findByPk(requestId, {
      include: [{ model: OrderRequestItem, as: 'items' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!request) {
      const err = new Error('Không tìm thấy yêu cầu.');
      err.statusCode = 404;
      throw err;
    }
    if (request.status === 'CONVERTED') {
      const err = new Error('Yêu cầu này đã được chuyển thành hợp đồng trước đó.');
      err.statusCode = 409;
      throw err;
    }
    if (request.status === 'REJECTED') {
      const err = new Error('Yêu cầu đã bị từ chối, không thể chuyển thành hợp đồng.');
      err.statusCode = 409;
      throw err;
    }
    // Với đơn CUSTOM, phải được duyệt và chốt thiết kế trước khi lập hợp đồng
    if (request.order_type === 'CUSTOM' && request.status !== 'DESIGN_FINALIZED' && request.status !== 'APPROVED') {
      const err = new Error(
        `Chỉ có thể lập hợp đồng sau khi Chủ xưởng duyệt và chốt thiết kế (Trạng thái hiện tại: ${request.status}).`
      );
      err.statusCode = 400;
      throw err;
    }

    const itemsToProcess = Array.isArray(items) && items.length > 0 ? items : request.items || [];

    if (itemsToProcess.length === 0) {
      const err = new Error('Yêu cầu không có sản phẩm nào, không thể tạo hợp đồng.');
      err.statusCode = 400;
      throw err;
    }

    // Kiểm tra contract đã tồn tại chưa
    const existingContract = await Contract.findOne({
      where: { request_id: requestId },
      transaction,
    });
    if (existingContract) {
      const err = new Error('Yêu cầu này đã được chuyển thành hợp đồng trước đó.');
      err.statusCode = 409;
      throw err;
    }

    // Tính tổng tiền
    const totalAmount = itemsToProcess.reduce((sum, item) => {
      const price = Number(item.unit_price ?? item.unitPrice) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);

    const minDeposit = totalAmount > 10000000 ? Math.round(totalAmount * 0.3) : 0;
    const finalDeposit = depositAmount !== null && depositAmount !== undefined ? Number(depositAmount) : minDeposit;

    const finalCustomerName = (customerName && String(customerName).trim()) || request.contact_name;
    const finalCustomerPhone = (customerPhone && String(customerPhone).trim()) || request.contact_phone;
    const finalCustomerAddress = (customerAddress && String(customerAddress).trim()) || request.delivery_address || null;

    const { generateNextContractCode } = require('./ContractModel');
    const contractCode = await generateNextContractCode();

    const contract = await Contract.create(
      {
        contract_code: contractCode,
        source: 'ONLINE',
        contract_type: request.order_type || 'CUSTOM',
        request_id: requestId,
        customer_account_id: request.customer_account_id || null,
        customer_name: finalCustomerName,
        customer_phone: finalCustomerPhone,
        customer_address: finalCustomerAddress,
        total_amount: totalAmount,
        deposit_amount: finalDeposit,
        status: 'DRAFT',
        signed_place: signedPlace || 'Cửa hàng Góc Nhà',
        delivery_date: deliveryDate || request.expected_date || null,
        terms: terms || null,
        signed_by: signedBy || null,
        note: note || null,
        createby: createBy,
      },
      { transaction }
    );

    const contractItemsData = itemsToProcess.map((item) => {
      const productId = item.product_id || item.productId || null;
      const hasProductId = Boolean(productId);
      const reqItemId = item.request_item_id || item.requestItemId || null;
      return {
        contract_id: contract.contract_id,
        product_id: hasProductId ? productId : null,
        request_item_id: hasProductId ? null : reqItemId,
        item_name: item.item_name || item.itemName || 'Sản phẩm',
        category_id: item.category_id || item.categoryId || null,
        room_id: item.room_id || item.roomId || null,
        material_id: item.material_id || item.materialId || null,
        color_id: item.color_id || item.colorId || null,
        length_cm: item.length_cm || item.lengthCm || null,
        width_cm: item.width_cm || item.widthCm || null,
        height_cm: item.height_cm || item.heightCm || null,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price ?? item.unitPrice) || 0,
        description: item.description || null,
        createby: createBy,
      };
    });

    await ContractItem.bulkCreate(contractItemsData, { transaction });

    request.status = 'CONVERTED';
    request.modifieby = createBy;
    if (finalCustomerAddress) request.delivery_address = finalCustomerAddress;
    if (finalCustomerName) request.contact_name = finalCustomerName;
    if (finalCustomerPhone) request.contact_phone = finalCustomerPhone;
    await request.save({ transaction });

    await transaction.commit();

    return {
      contractId: contract.contract_id,
      contractCode: contract.contract_code,
      requestCode: request.request_code,
      totalAmount,
      depositAmount: finalDeposit,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  getRequestsWithPagination,
  findRequestById,
  convertRequestToContract,
  generateNextRequestCode,
  getCustomersForSales,
  createSalesOrderRequest,
  updateSalesOrderRequest,
  reviewOrderRequest,
};
