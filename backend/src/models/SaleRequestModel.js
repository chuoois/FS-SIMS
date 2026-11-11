// =========================================================
// SaleRequestModel.js
// Model / Repository dành cho Sale quản lý Order Requests từ khách hàng
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

// Setup associations (guard to avoid re-define)
if (!OrderRequest.associations || !OrderRequest.associations.items) {
  if (typeof OrderRequest === 'function' && typeof OrderRequest.hasMany === 'function') {
    OrderRequest.hasMany(OrderRequestItem, { foreignKey: 'request_id', as: 'items' });
    OrderRequestItem.belongsTo(OrderRequest, { foreignKey: 'request_id', as: 'request' });
  }
}
if (!OrderRequestItem.associations || !OrderRequestItem.associations.images) {
  if (typeof OrderRequestItem === 'function' && typeof OrderRequestItem.hasMany === 'function') {
    OrderRequestItem.hasMany(OrderRequestImage, { foreignKey: 'request_item_id', as: 'images' });
  }
  if (typeof OrderRequestImage === 'function' && typeof OrderRequestImage.belongsTo === 'function') {
    OrderRequestImage.belongsTo(OrderRequestItem, { foreignKey: 'request_item_id', as: 'item' });
  }
}
if (!OrderRequest.associations || !OrderRequest.associations.images) {
  if (typeof OrderRequest === 'function' && typeof OrderRequest.hasMany === 'function') {
    OrderRequest.hasMany(OrderRequestImage, { foreignKey: 'request_id', as: 'images' });
  }
}
if (!OrderRequest.associations || !OrderRequest.associations.customer) {
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') OrderRequest.belongsTo(UserAccount, { foreignKey: 'customer_account_id', as: 'customer' });
}
if (!OrderRequest.associations || !OrderRequest.associations.assignee) {
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') OrderRequest.belongsTo(UserAccount, { foreignKey: 'assigned_to', as: 'assignee' });
}
if (!OrderRequest.associations || !OrderRequest.associations.contract) {
  if (typeof Contract === 'function' && typeof Contract.belongsTo === 'function') OrderRequest.hasOne(Contract, { foreignKey: 'request_id', as: 'contract' });
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
          {
            model: OrderRequestImage,
            as: 'images',
            required: false,
          },
        ],
      },
      {
        model: OrderRequestImage,
        as: 'images',
        where: { request_item_id: null },
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
          {
            model: OrderRequestImage,
            as: 'images',
            required: false,
          },
        ],
      },
      {
        model: OrderRequestImage,
        as: 'images',
        where: { request_item_id: null },
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
 * Chuyển đổi request thành hợp đồng (DRAFT).
 * - Cho phép sale điền/sửa thông tin khách hàng (tên, SĐT, địa chỉ giao hàng)
 * - Cho phép sale chỉnh sửa giỏ hàng (số lượng, đơn giá)
 * - Tạo contract mới với source = 'ONLINE', contract_type = order_type của request
 * - Tạo ContractItem từ các OrderRequestItem / items cập nhật
 * - Cập nhật request: bổ sung địa chỉ, tên, SĐT và status → 'CONVERTED'
 * - Gắn request_id vào contract
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

    const itemsToProcess = (Array.isArray(items) && items.length > 0)
      ? items
      : (request.items || []);

    if (itemsToProcess.length === 0) {
      const err = new Error('Yêu cầu không có sản phẩm nào, không thể tạo hợp đồng.');
      err.statusCode = 400;
      throw err;
    }

    // Kiểm tra contract đã tồn tại chưa (unique constraint request_id)
    const existingContract = await Contract.findOne({
      where: { request_id: requestId },
      transaction,
    });
    if (existingContract) {
      const err = new Error('Yêu cầu này đã được chuyển thành hợp đồng trước đó.');
      err.statusCode = 409;
      throw err;
    }

    // Tính tổng tiền từ các item
    const totalAmount = itemsToProcess.reduce((sum, item) => {
      const price = Number(item.unit_price ?? item.unitPrice) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);

    // Quy tắc đặt cọc
    const minDeposit = totalAmount > 10000000 ? Math.round(totalAmount * 0.3) : 0;
    const finalDeposit = depositAmount !== null && depositAmount !== undefined
      ? Number(depositAmount)
      : minDeposit;

    // Thông tin khách hàng (ưu tiên thông tin sale vừa điền/sửa)
    const finalCustomerName = (customerName && String(customerName).trim()) || request.contact_name;
    const finalCustomerPhone = (customerPhone && String(customerPhone).trim()) || request.contact_phone;
    const finalCustomerAddress = (customerAddress && String(customerAddress).trim()) || request.delivery_address || null;

    // Sinh mã hợp đồng
    const { generateNextContractCode } = require('./ContractModel');
    const contractCode = await generateNextContractCode();

    // Tạo contract
    const contract = await Contract.create({
      contract_code: contractCode,
      source: 'ONLINE',
      contract_type: request.order_type || 'READY',
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
    }, { transaction });

    // Tạo contract items
    const contractItemsData = itemsToProcess.map((item) => {
      const productId = item.product_id || item.productId || null;
      const hasProductId = Boolean(productId);
      const reqItemId = item.request_item_id || item.requestItemId || null;

      // Tìm thông tin gốc từ order_request_item nếu có
      const orig = (request.items || []).find((ri) => {
        const riId = ri.request_item_id || ri.requestItemId;
        const riPid = ri.product_id || ri.productId;
        return (reqItemId && String(riId) === String(reqItemId)) ||
               (productId && String(riPid) === String(productId));
      });

      const len = item.length_cm ?? item.lengthCm ?? orig?.length_cm ?? orig?.lengthCm ?? null;
      const wid = item.width_cm ?? item.widthCm ?? orig?.width_cm ?? orig?.widthCm ?? null;
      const hei = item.height_cm ?? item.heightCm ?? orig?.height_cm ?? orig?.heightCm ?? null;

      return {
        contract_id: contract.contract_id,
        product_id: hasProductId ? productId : null,
        request_item_id: hasProductId ? null : reqItemId,
        item_name: item.item_name || item.itemName || orig?.item_name || orig?.itemName || 'Sản phẩm',
        category_id: item.category_id || item.categoryId || orig?.category_id || orig?.categoryId || null,
        room_id: item.room_id || item.roomId || orig?.room_id || orig?.roomId || null,
        material_id: item.material_id || item.materialId || orig?.material_id || orig?.materialId || null,
        color_id: item.color_id || item.colorId || orig?.color_id || orig?.colorId || null,
        length_cm: len != null ? Number(len) : null,
        width_cm: wid != null ? Number(wid) : null,
        height_cm: hei != null ? Number(hei) : null,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price ?? item.unitPrice) || 0,
        description: item.description || orig?.description || null,
        createby: createBy,
      };
    });

    await ContractItem.bulkCreate(contractItemsData, { transaction });

    // Cập nhật trạng thái và thông tin bổ sung cho request
    request.status = 'CONVERTED';
    request.approved_at = new Date();
    request.modifieby = createBy;
    if (finalCustomerAddress) request.delivery_address = finalCustomerAddress;
    if (finalCustomerName) request.contact_name = finalCustomerName;
    if (finalCustomerPhone) request.contact_phone = finalCustomerPhone;
    await request.save({ transaction });

    await transaction.commit();

    // Trả về contract đã tạo (không eager load ở đây, sẽ load lại ở controller)
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


/**
 * Tự động sinh mã Order Request tiếp theo (RQ-YYYYMMDD-0001)
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
 * Lấy danh sách khách hàng (Role CUSTOMER) phục vụ dropdown/autocomplete cho Sales
 */
async function getCustomersForSales({ search } = {}) {
  const { UserRole } = require('./userRole.model');
  const customerRole = await UserRole.findOne({ where: { role_code: 'CUSTOMER' } });
  const roleId = customerRole ? customerRole.role_id : 4;

  const whereClause = {
    role_id: roleId,
    status: 'ACTIVE',
  };

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
    attributes: ['user_account_id', 'full_name', 'phone_number', 'email', 'address'],
    order: [['full_name', 'ASC']],
    limit: 50,
  });
}

/**
 * Sales tạo đơn đặt hàng may đo & thiết kế (Order Request)
 */
async function createSalesOrderRequest({
  customerAccountId,
  contactName,
  contactPhone,
  contactEmail,
  deliveryAddress,
  title,
  description,
  budgetMin,
  budgetMax,
  expectedDate,
  orderType = 'CUSTOM',
  items = [],
  images = [],
  createdBy,
}) {
  const transaction = await sequelize.transaction();

  try {
    const requestCode = await generateNextRequestCode();
    const finalTitle = title || (items.length > 0 ? (items[0].itemName || items[0].item_name || 'Yêu cầu may đo nội thất') : 'Yêu cầu thiết kế may đo');

    // Tạo OrderRequest
    const orderRequest = await OrderRequest.create({
      request_code: requestCode,
      order_type: orderType || 'CUSTOM',
      request_type: 'SINGLE',
      customer_account_id: customerAccountId || 4,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      delivery_address: deliveryAddress || null,
      title: finalTitle,
      description: description || null,
      budget_min: budgetMin || null,
      budget_max: budgetMax || null,
      expected_date: expectedDate || null,
      status: 'PENDING',
      createby: createdBy || 'Sales',
    }, { transaction });

    // Tạo OrderRequestItems
    const createdItems = [];
    if (items && items.length > 0) {
      for (const it of items) {
        const itemRecord = await OrderRequestItem.create({
          request_id: orderRequest.request_id,
          product_id: it.productId || it.product_id || null,
          item_name: it.itemName || it.item_name || 'Món đồ nội thất',
          category_id: it.categoryId || it.category_id || null,
          room_id: it.roomId || it.room_id || null,
          material_id: it.materialId || it.material_id || null,
          color_id: it.colorId || it.color_id || null,
          length_cm: it.lengthCm || it.length_cm || null,
          width_cm: it.widthCm || it.width_cm || null,
          height_cm: it.heightCm || it.height_cm || null,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unitPrice ?? it.unit_price) || 0,
          description: it.description || it.technicalNotes || it.technical_notes || null,
          createby: createdBy || 'Sales',
        }, { transaction });
        createdItems.push(itemRecord);
      }
    }

    // Tạo OrderRequestImages (từ images riêng của từng item hoặc mảng images tổng)
    const allImagesToCreate = [];

    // 1. Lấy ảnh từ từng item (nếu có it.images)
    if (items && items.length > 0) {
      items.forEach((it, idx) => {
        const targetItemId = createdItems[idx] ? createdItems[idx].request_item_id : null;
        if (it.images && Array.isArray(it.images)) {
          it.images.forEach((img, imgIdx) => {
            const url = typeof img === 'string' ? img : (img.imageUrl || img.image_url);
            if (url && typeof url === 'string' && url.trim()) {
              allImagesToCreate.push({
                request_id: orderRequest.request_id,
                request_item_id: targetItemId,
                image_url: url.trim().length > 255 ? url.trim().substring(0, 255) : url.trim(),
                sort_order: (typeof img === 'object' && img.sortOrder !== undefined) ? img.sortOrder : imgIdx,
                createby: createdBy || 'Sales',
              });
            }
          });
        }
      });
    }

    // 2. Lấy ảnh từ mảng images cấp cao nhất (nếu có)
    if (images && images.length > 0) {
      images.forEach((img, idx) => {
        const url = typeof img === 'string' ? img : (img.imageUrl || img.image_url);
        if (!url || typeof url !== 'string' || !url.trim()) return;

        let targetItemId = null;
        if (typeof img === 'object') {
          if (img.itemIndex !== undefined && createdItems[img.itemIndex]) {
            targetItemId = createdItems[img.itemIndex].request_item_id;
          } else if (img.requestItemId || img.request_item_id) {
            targetItemId = img.requestItemId || img.request_item_id;
          }
        }

        const cleanUrl = url.trim().length > 255 ? url.trim().substring(0, 255) : url.trim();
        const alreadyAdded = allImagesToCreate.some(
          (ex) => ex.image_url === cleanUrl && ex.request_item_id === targetItemId
        );
        if (!alreadyAdded) {
          allImagesToCreate.push({
            request_id: orderRequest.request_id,
            request_item_id: targetItemId,
            image_url: cleanUrl,
            sort_order: (typeof img === 'object' && img.sortOrder !== undefined) ? img.sortOrder : idx,
            createby: createdBy || 'Sales',
          });
        }
      });
    }

    if (allImagesToCreate.length > 0) {
      await OrderRequestImage.bulkCreate(allImagesToCreate, { transaction });
    }

    await transaction.commit();
    return findRequestById(orderRequest.request_id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Sales cập nhật đơn đặt hàng thiết kế (khi Owner yêu cầu sửa REQUEST_CHANGE hoặc PENDING)
 */
async function updateSalesOrderRequest(requestId, {
  contactName,
  contactPhone,
  contactEmail,
  deliveryAddress,
  title,
  description,
  budgetMin,
  budgetMax,
  expectedDate,
  items,
  images,
  updatedBy,
}) {
  const transaction = await sequelize.transaction();

  try {
    const request = await OrderRequest.findByPk(requestId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!request) {
      throw new Error('Không tìm thấy yêu cầu thiết kế.');
    }

    if (request.status !== 'PENDING' && request.status !== 'REQUEST_CHANGE') {
      throw new Error(`Không thể chỉnh sửa yêu cầu ở trạng thái "${request.status}". Chỉ cho phép sửa khi Chờ duyệt (PENDING) hoặc Cần chỉnh sửa (REQUEST_CHANGE).`);
    }

    // Cập nhật thông tin chính và đổi lại PENDING để Owner duyệt lại
    await request.update({
      contact_name: contactName || request.contact_name,
      contact_phone: contactPhone || request.contact_phone,
      contact_email: contactEmail !== undefined ? contactEmail : request.contact_email,
      delivery_address: deliveryAddress !== undefined ? deliveryAddress : request.delivery_address,
      title: title || request.title,
      description: description !== undefined ? description : request.description,
      budget_min: budgetMin !== undefined ? budgetMin : request.budget_min,
      budget_max: budgetMax !== undefined ? budgetMax : request.budget_max,
      expected_date: expectedDate !== undefined ? expectedDate : request.expected_date,
      status: 'PENDING',
      reject_reason: null,
      modifieby: updatedBy || null,
    }, { transaction });

    // Cập nhật items nếu truyền lên
    const createdItems = [];
    if (items && Array.isArray(items)) {
      await OrderRequestItem.destroy({ where: { request_id: requestId }, transaction });
      for (const it of items) {
        const itemRecord = await OrderRequestItem.create({
          request_id: requestId,
          product_id: it.productId || it.product_id || null,
          item_name: it.itemName || it.item_name || 'Món đồ nội thất',
          category_id: it.categoryId || it.category_id || null,
          room_id: it.roomId || it.room_id || null,
          material_id: it.materialId || it.material_id || null,
          color_id: it.colorId || it.color_id || null,
          length_cm: it.lengthCm || it.length_cm || null,
          width_cm: it.widthCm || it.width_cm || null,
          height_cm: it.heightCm || it.height_cm || null,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unitPrice ?? it.unit_price) || 0,
          description: it.description || it.technicalNotes || it.technical_notes || null,
          createby: updatedBy || 'Sales',
        }, { transaction });
        createdItems.push(itemRecord);
      }
    }

    // Cập nhật images nếu truyền lên
    if ((images && Array.isArray(images)) || (items && Array.isArray(items))) {
      await OrderRequestImage.destroy({ where: { request_id: requestId }, transaction });

      const allImagesToCreate = [];

      // 1. Lấy ảnh từ từng item (nếu có it.images)
      if (items && Array.isArray(items)) {
        items.forEach((it, idx) => {
          const targetItemId = createdItems[idx] ? createdItems[idx].request_item_id : null;
          if (it.images && Array.isArray(it.images)) {
            it.images.forEach((img, imgIdx) => {
              const url = typeof img === 'string' ? img : (img.imageUrl || img.image_url);
              if (url && typeof url === 'string' && url.trim()) {
                allImagesToCreate.push({
                  request_id: requestId,
                  request_item_id: targetItemId,
                  image_url: url.trim().length > 255 ? url.trim().substring(0, 255) : url.trim(),
                  sort_order: (typeof img === 'object' && img.sortOrder !== undefined) ? img.sortOrder : imgIdx,
                  createby: updatedBy || 'Sales',
                });
              }
            });
          }
        });
      }

      // 2. Lấy ảnh từ mảng images cấp cao nhất (nếu có)
      if (images && Array.isArray(images)) {
        images.forEach((img, idx) => {
          const url = typeof img === 'string' ? img : (img.imageUrl || img.image_url);
          if (!url || typeof url !== 'string' || !url.trim()) return;

          let targetItemId = null;
          if (typeof img === 'object') {
            if (img.itemIndex !== undefined && createdItems[img.itemIndex]) {
              targetItemId = createdItems[img.itemIndex].request_item_id;
            } else if (img.requestItemId || img.request_item_id) {
              targetItemId = img.requestItemId || img.request_item_id;
            }
          }

          const cleanUrl = url.trim().length > 255 ? url.trim().substring(0, 255) : url.trim();
          const alreadyAdded = allImagesToCreate.some(
            (ex) => ex.image_url === cleanUrl && ex.request_item_id === targetItemId
          );
          if (!alreadyAdded) {
            allImagesToCreate.push({
              request_id: requestId,
              request_item_id: targetItemId,
              image_url: cleanUrl,
              sort_order: (typeof img === 'object' && img.sortOrder !== undefined) ? img.sortOrder : idx,
              createby: updatedBy || 'Sales',
            });
          }
        });
      }

      if (allImagesToCreate.length > 0) {
        await OrderRequestImage.bulkCreate(allImagesToCreate, { transaction });
      }
    }

    await transaction.commit();
    return findRequestById(requestId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Owner đánh giá / duyệt / chốt thiết kế
 * - action = 'REQUEST_CHANGE': yêu cầu Sales chỉnh sửa lại bản vẽ/thông số
 * - action = 'REJECT': từ chối yêu cầu
 * - action = 'APPROVE': duyệt sơ bộ
 * - action = 'FINALIZE_DESIGN': CHỐT THIẾT KẾ CUỐI CÙNG (Khóa bản vẽ, đủ điều kiện lập hợp đồng)
 */
async function reviewOrderRequest(requestId, action, { reason, note, reviewedBy } = {}) {
  const request = await OrderRequest.findByPk(requestId);
  if (!request) {
    throw new Error('Không tìm thấy yêu cầu thiết kế.');
  }

  const validActions = ['REQUEST_CHANGE', 'REJECT', 'APPROVE', 'FINALIZE_DESIGN'];
  if (!validActions.includes(action)) {
    throw new Error(`Hành động "${action}" không hợp lệ. Các hành động hợp lệ: ${validActions.join(', ')}.`);
  }

  const updateData = { modifieby: reviewedBy || null };

  if (action === 'REQUEST_CHANGE') {
    if (!reason || !String(reason).trim()) {
      throw new Error('Vui lòng cung cấp lý do yêu cầu chỉnh sửa để Sales nắm thông tin.');
    }
    updateData.status = 'REQUEST_CHANGE';
    updateData.reject_reason = String(reason).trim();
    if (note) updateData.staff_note = note;
  } else if (action === 'REJECT') {
    if (!reason || !String(reason).trim()) {
      throw new Error('Vui lòng cung cấp lý do từ chối yêu cầu.');
    }
    updateData.status = 'REJECTED';
    updateData.reject_reason = String(reason).trim();
  } else if (action === 'APPROVE') {
    updateData.status = 'APPROVED';
    if (note) updateData.staff_note = note;
  } else if (action === 'FINALIZE_DESIGN') {
    updateData.status = 'DESIGN_FINALIZED';
    updateData.approved_at = new Date();
    if (note) updateData.staff_note = note;
  }

  await request.update(updateData);
  return findRequestById(requestId);
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
  updateDesignFile,
};

/**
 * Cập nhật bản thiết kế & mô tả kỹ thuật cho 1 yêu cầu CUSTOM:
 * - Hỗ trợ cập nhật cho từng sản phẩm (order_request_item) qua requestItemId:
 *   + Ảnh lưu vào bảng order_request_image (với request_item_id = requestItemId)
 *   + Ghi chú/mô tả lưu vào trường description của order_request_item
 * - Hoặc cập nhật cấp yêu cầu (toàn bộ đơn) khi không có requestItemId:
 *   + Ảnh lưu vào bảng order_request_image (với request_item_id = NULL)
 *   + Ghi chú/mô tả lưu vào trường description của order_request
 * Chỉ OWNER mới được gọi hàm này
 */
async function updateDesignFile(requestId, { requestItemId, description, imageUrl, updatedBy }) {
  const request = await OrderRequest.findByPk(requestId);
  if (!request) {
    const err = new Error('Không tìm thấy yêu cầu.');
    err.statusCode = 404;
    throw err;
  }
  if (request.order_type !== 'CUSTOM') {
    const err = new Error('Chỉ có thể gửi bản thiết kế cho đơn đặt theo yêu cầu (CUSTOM).');
    err.statusCode = 400;
    throw err;
  }

  let targetItem = null;
  if (requestItemId) {
    targetItem = await OrderRequestItem.findOne({
      where: {
        request_item_id: requestItemId,
        request_id: requestId,
      },
    });
    if (!targetItem) {
      const err = new Error('Không tìm thấy sản phẩm trong yêu cầu này.');
      err.statusCode = 404;
      throw err;
    }

    // 1. Cập nhật mô tả kỹ thuật cho từng sản phẩm
    if (description !== undefined && description !== null && description.trim() !== '') {
      targetItem.description = description.trim();
    }
    targetItem.modifieby = updatedBy || null;
    await targetItem.save();

    // 2. Lưu ảnh thiết kế gắn trực tiếp với sản phẩm này
    if (imageUrl) {
      const maxSort = (await OrderRequestImage.max('sort_order', {
        where: {
          request_id: requestId,
          request_item_id: requestItemId,
        },
      })) || 0;
      await OrderRequestImage.create({
        request_id: requestId,
        request_item_id: requestItemId,
        image_url: imageUrl,
        sort_order: (maxSort || 0) + 1,
        createby: updatedBy || null,
      });
    }
  } else {
    // Cập nhật chung ở cấp yêu cầu
    if (description !== undefined && description !== null && description.trim() !== '') {
      request.description = description.trim();
    }

    if (imageUrl) {
      const maxSort = (await OrderRequestImage.max('sort_order', {
        where: {
          request_id: requestId,
          request_item_id: null,
        },
      })) || 0;
      await OrderRequestImage.create({
        request_id: requestId,
        request_item_id: null,
        image_url: imageUrl,
        sort_order: (maxSort || 0) + 1,
        createby: updatedBy || null,
      });
    }
  }

  request.modifieby = updatedBy || null;
  await request.save();

  // Trả về request đầy đủ chi tiết sau khi cập nhật
  return findRequestById(requestId);
}
