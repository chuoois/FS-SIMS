// =========================================================
// saleOrderController.js
// Bộ điều khiển TÁCH BIỆT RIÊNG cho Role Bán hàng (Sale POS / Tạo đơn hàng)
// Tránh xung đột với các controller có sẵn (productController, userController...)
// Tuân thủ MVC: Controller chỉ điều phối req/res, gọi qua Model và Validator
// =========================================================

const {
  getProductsWithPagination,
  getProductMetadata: getProductMetadataModel,
  findProductById,
} = require('../models/ProductModel');

const {
  createOfflineContract: createOfflineContractModel,
  signContract: signContractModel,
  findContractById: findContractByIdModel,
  getContractsWithPagination: getContractsModel,
} = require('../models/ContractModel');

const {
  createOrderFromContract: createOrderFromContractModel,
  findOrderById: findOrderByIdModel,
  getOrdersWithPagination: getOrdersModel,
} = require('../models/CustomerOrderModel');

const {
  getRequestsWithPagination: getRequestsModel,
  findRequestById: findRequestByIdModel,
  convertRequestToContract: convertRequestToContractModel,
} = require('../models/SaleRequestModel');

const {
  validateCreateOfflineContractInput,
  validateSignContractInput,
  validateCreateOrderFromContractInput,
  toContractDTO,
  toOrderDTO,
} = require('../utils/saleOrderValidator');

const {
  validateProductQueryParams,
  toProductDTO,
} = require('../utils/productValidator');

/**
 * 1. GET /api/sale-orders/products
 * Lấy danh sách sản phẩm có trong kho dành cho màn hình POS
 */
async function getWarehouseProducts(req, res) {
  try {
    const params = validateProductQueryParams(req.query);
    const queryParams = {
      ...params,
      status: 'ACTIVE',
      include_children: false, // Hiển thị sản phẩm lẻ hoặc bộ combo chính
    };

    const result = await getProductsWithPagination(queryParams);

    return res.status(200).json({
      message: 'Lấy danh sách sản phẩm trong kho thành công',
      data: (result.products || []).map(toProductDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[saleOrderController.getWarehouseProducts]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách sản phẩm',
      error: error.message,
    });
  }
}

/**
 * 2. GET /api/sale-orders/products/:id
 * Lấy chi tiết thông tin sản phẩm (kích thước, bộ combo...) phục vụ xem chi tiết ở POS
 */
async function getProductDetail(req, res) {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    if (!productId || isNaN(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ.' });
    }

    const product = await findProductById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong kho.' });
    }

    return res.status(200).json({
      message: 'Lấy thông tin chi tiết sản phẩm thành công',
      data: toProductDTO(product),
    });
  } catch (error) {
    console.error('[saleOrderController.getProductDetail]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi xem chi tiết sản phẩm',
      error: error.message,
    });
  }
}

/**
 * 3. GET /api/sale-orders/metadata
 * Lấy metadata danh mục, phòng phục vụ các dropdown lọc ở POS
 */
async function getProductMetadata(req, res) {
  try {
    const metadata = await getProductMetadataModel();
    return res.status(200).json({
      message: 'Lấy metadata thành công',
      data: metadata,
    });
  } catch (error) {
    console.error('[saleOrderController.getProductMetadata]', error);
    return res.status(500).json({
      message: 'Lỗi khi lấy metadata',
      error: error.message,
    });
  }
}

/**
 * 4. POST /api/sale-orders/contracts
 * Bước 1: Nhân viên bấm "Tạo hợp đồng" tại quầy (OFFLINE - DRAFT)
 */
async function createOfflineContract(req, res) {
  try {
    const validation = validateCreateOfflineContractInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const {
      customer_name,
      customer_phone,
      customer_address,
      deposit_amount,
      delivery_date,
      signed_place,
      terms,
      note,
      items,
    } = validation.value;

    const contract = await createOfflineContractModel({
      customerName: customer_name,
      customerPhone: customer_phone,
      customerAddress: customer_address,
      depositAmount: deposit_amount,
      deliveryDate: delivery_date,
      signedPlace: signed_place,
      terms,
      note,
      signedBy: req.user?.sub,
      createBy: req.user?.email || 'STAFF',
      items,
    });

    return res.status(201).json({
      message: 'Lập biên bản hợp đồng thành công',
      data: toContractDTO(contract),
    });
  } catch (error) {
    console.error('[saleOrderController.createOfflineContract]', error);
    const isInventoryShortage = error.message && error.message.includes('chỉ còn');
    return res.status(isInventoryShortage ? 400 : 500).json({
      message: error.message || 'Lỗi hệ thống khi tạo hợp đồng',
      error: error.message,
    });
  }
}

/**
 * 5. POST /api/sale-orders/contracts/:id/sign
 * Bước 2: Chốt và ký hợp đồng tại quầy (Chuyển trạng thái sang SIGNED)
 */
async function signContract(req, res) {
  try {
    const { id } = req.params;
    const contractId = parseInt(id, 10);
    if (!contractId || isNaN(contractId) || contractId <= 0) {
      return res.status(400).json({ message: 'Mã hợp đồng không hợp lệ.' });
    }

    const validation = validateSignContractInput(req.body);
    const { signed_place, contract_file_url } = validation.value;

    const contract = await signContractModel(contractId, {
      signedPlace: signed_place,
      contractFileUrl: contract_file_url,
      signedBy: req.user?.sub,
      modifieBy: req.user?.email || 'STAFF',
    });

    if (!contract) {
      return res.status(404).json({ message: 'Không tìm thấy hợp đồng.' });
    }

    return res.status(200).json({
      message: 'Chốt và ký hợp đồng thành công',
      data: toContractDTO(contract),
    });
  } catch (error) {
    console.error('[saleOrderController.signContract]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi ký hợp đồng',
      error: error.message,
    });
  }
}

/**
 * 6. GET /api/sale-orders/contracts
 * Lấy danh sách hợp đồng bán hàng
 */
async function getContracts(req, res) {
  try {
    const {
      search,
      search_by,
      customer_name,
      contract_code,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getContractsModel({
      search: typeof search === 'string' ? search.trim() : '',
      search_by: typeof search_by === 'string' ? search_by.trim().toUpperCase() : 'ALL',
      customer_name: typeof customer_name === 'string' ? customer_name.trim() : '',
      contract_code: typeof contract_code === 'string' ? contract_code.trim() : '',
      status: typeof status === 'string' ? status.trim().toUpperCase() : 'ALL',
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
    });

    return res.status(200).json({
      message: 'Lấy danh sách hợp đồng thành công',
      data: (result.contracts || []).map(toContractDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[saleOrderController.getContracts]', error);
    return res.status(500).json({
      message: 'Lỗi khi lấy danh sách hợp đồng',
      error: error.message,
    });
  }
}

/**
 * 7. GET /api/sale-orders/contracts/:id
 * Lấy chi tiết 1 hợp đồng
 */
async function getContractById(req, res) {
  try {
    const { id } = req.params;
    const contractId = parseInt(id, 10);
    if (!contractId || isNaN(contractId) || contractId <= 0) {
      return res.status(400).json({ message: 'Mã hợp đồng không hợp lệ.' });
    }

    const contract = await findContractByIdModel(contractId);
    if (!contract) {
      return res.status(404).json({ message: 'Không tìm thấy hợp đồng.' });
    }

    return res.status(200).json({
      message: 'Lấy thông tin hợp đồng thành công',
      data: toContractDTO(contract),
    });
  } catch (error) {
    console.error('[saleOrderController.getContractById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết hợp đồng',
      error: error.message,
    });
  }
}

/**
 * 8. POST /api/sale-orders/orders/from-contract/:contractId
 * Bước 3: Tạo đơn hàng từ hợp đồng đã ký kết
 */
async function createOrderFromContract(req, res) {
  try {
    const { contractId } = req.params;
    const validation = validateCreateOrderFromContractInput(contractId);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const order = await createOrderFromContractModel(validation.value, {
      assignedTo: req.user?.sub,
      createBy: req.user?.email || 'STAFF',
    });

    return res.status(201).json({
      message: 'Tạo đơn hàng từ hợp đồng thành công',
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error('[saleOrderController.createOrderFromContract]', error);
    const isConflict = error.message && error.message.includes('đã được tạo đơn hàng');
    const isClientError = error.message && (
      error.message.includes('chưa được ký') ||
      error.message.includes('không đủ để xuất') ||
      error.message.includes('không tìm thấy')
    );
    const status = isConflict ? 409 : isClientError ? 400 : 500;

    return res.status(status).json({
      message: error.message || 'Lỗi hệ thống khi tạo đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 9. GET /api/sale-orders/orders
 * Lấy danh sách đơn hàng
 */
async function getOrders(req, res) {
  try {
    const {
      search,
      search_by,
      order_code,
      customer_name,
      status,
      order_type,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getOrdersModel({
      search: typeof search === 'string' ? search.trim() : '',
      search_by: typeof search_by === 'string' ? search_by.trim().toUpperCase() : 'ALL',
      order_code: typeof order_code === 'string' ? order_code.trim() : '',
      customer_name: typeof customer_name === 'string' ? customer_name.trim() : '',
      status: typeof status === 'string' ? status.trim().toUpperCase() : 'ALL',
      order_type: typeof order_type === 'string' ? order_type.trim().toUpperCase() : 'ALL',
      sort: typeof sort === 'string' ? sort.trim().toUpperCase() : 'NEWEST',
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
    });

    return res.status(200).json({
      message: 'Lấy danh sách đơn hàng thành công',
      data: (result.orders || []).map(toOrderDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[saleOrderController.getOrders]', error);
    return res.status(500).json({
      message: 'Lỗi khi lấy danh sách đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 10. GET /api/sale-orders/orders/:id
 * Lấy chi tiết đơn hàng
 */
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const order = await findOrderByIdModel(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết đơn hàng thành công',
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error('[saleOrderController.getOrderById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 11. GET /api/sale-orders/requests
 * Lấy danh sách yêu cầu của khách hàng
 */
async function getRequests(req, res) {
  try {
    const {
      search,
      search_by,
      status,
      order_type,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getRequestsModel({
      search: typeof search === 'string' ? search.trim() : '',
      search_by: typeof search_by === 'string' ? search_by.trim().toUpperCase() : 'ALL',
      status: typeof status === 'string' ? status.trim().toUpperCase() : 'ALL',
      order_type: typeof order_type === 'string' ? order_type.trim().toUpperCase() : 'ALL',
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
    });

    return res.status(200).json({
      message: 'Lấy danh sách yêu cầu khách hàng thành công',
      data: (result.requests || []).map(toRequestDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[saleOrderController.getRequests]', error);
    return res.status(500).json({
      message: 'Lỗi khi lấy danh sách yêu cầu',
      error: error.message,
    });
  }
}

/**
 * 12. GET /api/sale-orders/requests/:id
 * Lấy chi tiết 1 yêu cầu
 */
async function getRequestById(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }
    const request = await findRequestByIdModel(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });
    }
    return res.status(200).json({
      message: 'Lấy chi tiết yêu cầu thành công',
      data: toRequestDTO(request),
    });
  } catch (error) {
    console.error('[saleOrderController.getRequestById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết yêu cầu',
      error: error.message,
    });
  }
}

/**
 * 13. POST /api/sale-orders/requests/:id/convert-to-contract
 * Chuyển yêu cầu thành hợp đồng DRAFT
 */
async function convertRequestToContract(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const { deposit_amount, delivery_date, signed_place, terms, note } = req.body;

    const result = await convertRequestToContractModel({
      requestId,
      depositAmount: deposit_amount !== undefined && deposit_amount !== '' ? Number(deposit_amount) : null,
      deliveryDate: delivery_date || null,
      signedPlace: signed_place || null,
      terms: terms || null,
      note: note || null,
      signedBy: req.user?.sub,
      createBy: req.user?.email || 'STAFF',
    });

    return res.status(201).json({
      message: 'Chuyển yêu cầu thành hợp đồng thành công',
      data: result,
    });
  } catch (error) {
    console.error('[saleOrderController.convertRequestToContract]', error);
    const statusCode = error.statusCode || (
      error.message && (
        error.message.includes('đã được chuyển') ? 409 :
        error.message.includes('không tìm thấy') || error.message.includes('Không tìm thấy') ? 404 :
        400
      )
    ) || 500;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi hệ thống khi chuyển yêu cầu thành hợp đồng',
      error: error.message,
    });
  }
}

/**
 * DTO chuyển đổi OrderRequest sang JSON trả về FE
 */
function toRequestDTO(raw) {
  if (!raw) return null;
  const r = raw.toJSON ? raw.toJSON() : raw;
  return {
    requestId: r.request_id,
    requestCode: r.request_code,
    orderType: r.order_type,
    requestType: r.request_type,
    customerAccountId: r.customer_account_id,
    customerName: r.contact_name,
    customerPhone: r.contact_phone,
    customerEmail: r.contact_email,
    deliveryAddress: r.delivery_address,
    title: r.title,
    description: r.description,
    budgetMin: r.budget_min ? Number(r.budget_min) : null,
    budgetMax: r.budget_max ? Number(r.budget_max) : null,
    expectedDate: r.expected_date,
    status: r.status,
    quotedPrice: r.quoted_price ? Number(r.quoted_price) : null,
    quotedAt: r.quoted_at,
    approvedAt: r.approved_at,
    staffNote: r.staff_note,
    rejectReason: r.reject_reason,
    assignedTo: r.assigned_to,
    assigneeName: r.assignee?.full_name || null,
    customerFullName: r.customer?.full_name || r.contact_name,
    createdAt: r.createdate,
    updatedAt: r.modifiedate,
    contract: r.contract ? {
      contractId: r.contract.contract_id,
      contractCode: r.contract.contract_code,
      status: r.contract.status,
    } : null,
    items: (r.items || []).map((it) => ({
      requestItemId: it.request_item_id,
      productId: it.product_id,
      itemName: it.item_name,
      quantity: it.quantity,
      unitPrice: it.unit_price ? Number(it.unit_price) : null,
      description: it.description,
      lengthCm: it.length_cm,
      widthCm: it.width_cm,
      heightCm: it.height_cm,
    })),
    images: (r.images || []).map((img) => ({
      imageId: img.request_image_id,
      imageUrl: img.image_url,
      sortOrder: img.sort_order,
    })),
  };
}

module.exports = {
  getWarehouseProducts,
  getProductDetail,
  getProductMetadata,
  createOfflineContract,
  signContract,
  getContracts,
  getContractById,
  createOrderFromContract,
  getOrders,
  getOrderById,
  getRequests,
  getRequestById,
  convertRequestToContract,
};

