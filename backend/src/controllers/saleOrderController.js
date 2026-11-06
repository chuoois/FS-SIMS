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
  confirmDelivery: confirmDeliveryModel,
  completeDelivery: completeDeliveryModel,
} = require('../models/CustomerOrderModel');

const {
<<<<<<< Updated upstream
=======
  getRequestsWithPagination: getRequestsModel,
  findRequestById: findRequestByIdModel,
  convertRequestToContract: convertRequestToContractModel,
  getCustomersForSales: getCustomersModel,
  createSalesOrderRequest: createSalesOrderRequestModel,
  updateSalesOrderRequest: updateSalesOrderRequestModel,
} = require('../models/SaleRequestModel');

const {
>>>>>>> Stashed changes
  validateCreateOfflineContractInput,
  validateSignContractInput,
  validateCreateOrderFromContractInput,
  validateCreateSalesRequestInput,
  toContractDTO,
  toOrderDTO,
  toRequestDTO,
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
      message: 'Lỗi máy chủ khi lấy metadata',
      error: error.message,
    });
  }
}

/**
 * 3b. GET /api/sale-orders/customers
 * Lấy danh sách khách hàng phục vụ dropdown khách hàng của Sales
 */
async function getCustomers(req, res) {
  try {
    const { search } = req.query;
    const customers = await getCustomersModel({ search });
    return res.status(200).json({
      message: 'Lấy danh sách khách hàng thành công',
      data: customers,
    });
  } catch (error) {
    console.error('[saleOrderController.getCustomers]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách khách hàng',
      error: error.message,
    });
  }
}

/**
 * 4. POST /api/sale-orders/contracts
 * Tạo hợp đồng bán hàng trực tiếp tại quầy (OFFLINE)
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
    const isClientError = error.message && (
      error.message.includes('không tồn tại') ||
      error.message.includes('chỉ còn') ||
      error.message.includes('không còn kinh doanh')
    );
    const statusCode = isClientError ? 400 : 500;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi tạo hợp đồng',
      error: error.message,
    });
  }
}

/**
 * 5. POST /api/sale-orders/contracts/:id/sign
 * Ký và chốt hợp đồng giấy (Chuyển trạng thái sang SIGNED)
 */
async function signContract(req, res) {
  try {
    const { id } = req.params;
    const contractId = parseInt(id, 10);
    if (!contractId || isNaN(contractId) || contractId <= 0) {
      return res.status(400).json({ message: 'Mã hợp đồng không hợp lệ.' });
    }

    const validation = validateSignContractInput(req.body);
<<<<<<< Updated upstream
    const { signed_place } = validation.value;

    const contract = await signContractModel(contractId, {
      signedPlace: signed_place,
=======
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const contract = await signContractModel(contractId, {
      signedPlace: validation.value.signed_place,
>>>>>>> Stashed changes
      signedBy: req.user?.sub,
      modifieBy: req.user?.email || 'STAFF',
      contractFileUrl: validation.value.contract_file_url,
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
    const isConflict = error.message && (
      error.message.includes('đã được ký') ||
      error.message.includes('đã bị hủy')
    );
    const statusCode = isConflict ? 409 : 500;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi ký hợp đồng',
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
<<<<<<< Updated upstream
    const { search, status, page = 1, limit = 10 } = req.query;
    const result = await getContractsModel({
      search: typeof search === 'string' ? search.trim() : '',
=======
    const {
      search,
      search_by,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getContractsModel({
      search: typeof search === 'string' ? search.trim() : '',
      search_by: typeof search_by === 'string' ? search_by.trim().toUpperCase() : 'ALL',
>>>>>>> Stashed changes
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
      message: 'Lỗi máy chủ khi lấy danh sách hợp đồng',
      error: error.message,
    });
  }
}

/**
 * 7. GET /api/sale-orders/contracts/:id
 * Xem chi tiết 1 hợp đồng
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
      message: 'Lấy chi tiết hợp đồng thành công',
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
 * Tạo đơn hàng chính thức từ hợp đồng đã ký
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
    const isConflict = error.message && (
      error.message.includes('đã được tạo đơn hàng') ||
      error.message.includes('chưa được ký') ||
      error.message.includes('không đủ để xuất')
    );
    const statusCode = isConflict ? 409 : 500;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi tạo đơn hàng',
      error: error.message,
    });
  }
}

/**
 * 9. GET /api/sale-orders/orders
 * Lấy danh sách đơn hàng đã tạo của Sale
 */
async function getOrders(req, res) {
  try {
<<<<<<< Updated upstream
    const { search, status, page = 1, limit = 10 } = req.query;
    const result = await getOrdersModel({
      search: typeof search === 'string' ? search.trim() : '',
=======
    const {
      search,
      search_by,
      status,
      order_type,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getOrdersModel({
      search: typeof search === 'string' ? search.trim() : '',
      search_by: typeof search_by === 'string' ? search_by.trim().toUpperCase() : 'ALL',
>>>>>>> Stashed changes
      status: typeof status === 'string' ? status.trim().toUpperCase() : 'ALL',
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
      message: 'Lỗi máy chủ khi lấy danh sách đơn hàng',
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

<<<<<<< Updated upstream
=======
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
 * 13. POST /api/sale-orders/requests
 * Sales tạo đơn đặt hàng mới gửi Owner duyệt
 */
async function createSalesRequest(req, res) {
  try {
    const validation = validateCreateSalesRequestInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const request = await createSalesOrderRequestModel({
      ...validation.value,
      assignedTo: req.user?.sub,
      createBy: req.user?.email || 'SALES',
    });

    return res.status(201).json({
      message: 'Tạo đơn đặt hàng thành công và đã gửi Chủ xưởng duyệt',
      data: toRequestDTO(request),
    });
  } catch (error) {
    console.error('[saleOrderController.createSalesRequest]', error);
    return res.status(500).json({
      message: error.message || 'Lỗi máy chủ khi tạo đơn đặt hàng',
      error: error.message,
    });
  }
}

/**
 * 14. PUT /api/sale-orders/requests/:id
 * Sales chỉnh sửa đơn đặt hàng (khi PENDING hoặc khi Owner yêu cầu REQUEST_CHANGE)
 */
async function updateSalesRequest(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const validation = validateCreateSalesRequestInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const request = await updateSalesOrderRequestModel(requestId, {
      ...validation.value,
      updatedBy: req.user?.email || 'SALES',
      userId: req.user?.sub,
      userRole: req.user?.role,
    });

    return res.status(200).json({
      message: 'Cập nhật đơn đặt hàng thành công và đã gửi lại Chủ xưởng duyệt',
      data: toRequestDTO(request),
    });
  } catch (error) {
    console.error('[saleOrderController.updateSalesRequest]', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi cập nhật đơn đặt hàng',
      error: error.message,
    });
  }
}

/**
 * 15. POST /api/sale-orders/requests/:id/convert-to-contract
 * Chuyển yêu cầu thành hợp đồng DRAFT (sau khi Owner chốt thiết kế)
 */
async function convertRequestToContract(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const {
      customer_name,
      customer_phone,
      customer_address,
      items,
      deposit_amount,
      delivery_date,
      signed_place,
      terms,
      note,
    } = req.body;

    const result = await convertRequestToContractModel({
      requestId,
      customerName: customer_name,
      customerPhone: customer_phone,
      customerAddress: customer_address,
      items,
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
 * 16. POST /api/sale-orders/orders/:id/deliver
 * Sales xác nhận giao hàng (READY_TO_DELIVER -> DELIVERING)
 */
async function confirmDeliveryController(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const { delivered_date, deliveredDate, delivery_address, deliveryAddress } = req.body;
    const order = await confirmDeliveryModel(orderId, {
      deliveredDate: deliveredDate || delivered_date,
      deliveryAddress: deliveryAddress || delivery_address,
      salesId: req.user?.sub,
      modifieBy: req.user?.email || 'SALES',
    });

    return res.status(200).json({
      message: 'Xác nhận giao hàng thành công',
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error('[saleOrderController.confirmDeliveryController]', error);
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi xác nhận giao hàng',
      error: error.message,
    });
  }
}

/**
 * 17. POST /api/sale-orders/orders/:id/complete
 * Sales xác nhận hoàn tất đơn hàng (DELIVERING -> COMPLETED)
 */
async function completeDeliveryController(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    }

    const order = await completeDeliveryModel(orderId, {
      salesId: req.user?.sub,
      modifieBy: req.user?.email || 'SALES',
    });

    return res.status(200).json({
      message: 'Xác nhận giao hàng thành công, đơn hàng đã hoàn tất',
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error('[saleOrderController.completeDeliveryController]', error);
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi máy chủ khi hoàn tất đơn hàng',
      error: error.message,
    });
  }
}

>>>>>>> Stashed changes
module.exports = {
  getWarehouseProducts,
  getProductDetail,
  getProductMetadata,
  getCustomers,
  createOfflineContract,
  signContract,
  getContracts,
  getContractById,
  createOrderFromContract,
  getOrders,
  getOrderById,
<<<<<<< Updated upstream
=======
  getRequests,
  getRequestById,
  createSalesRequest,
  updateSalesRequest,
  convertRequestToContract,
  confirmDeliveryController,
  completeDeliveryController,
>>>>>>> Stashed changes
};
