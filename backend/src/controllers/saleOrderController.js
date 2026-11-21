// =========================================================
// saleOrderController.js
// Bộ điều khiển quản lý Đơn Hàng & Kho hàng POS cho Role Bán hàng (Sale)
// Chức năng: Tra cứu kho sản phẩm POS, tạo đơn từ hợp đồng, theo dõi đơn, giao hàng & hoàn tất đơn
//
// Đồng thời re-export các hàm từ saleCustomerController và saleContractController
// để đảm bảo tính tương thích ngược 100% cho toàn bộ hệ thống.
// =========================================================

const {
  getProductsWithPagination,
  getProductMetadata: getProductMetadataModel,
  findProductById,
} = require("../models/ProductModel");

const {
  createOrderFromContract: createOrderFromContractModel,
  findOrderById: findOrderByIdModel,
  getOrdersWithPagination: getOrdersModel,
  confirmDelivery: confirmDeliveryModel,
  completeDelivery: completeDeliveryModel,
} = require("../models/CustomerOrderModel");

const {
  validateCreateOrderFromContractInput,
  toOrderDTO,
} = require("../utils/saleOrderValidator");

const {
  validateProductQueryParams,
  toProductDTO,
} = require("../utils/productValidator");

// Import controllers thành phần để re-export
const saleCustomerController = require("./saleCustomerController");
const saleContractController = require("./saleContractController");

/**
 * 1. GET /api/sale-orders/products
 * Lấy danh sách sản phẩm có trong kho dành cho màn hình POS
 */
async function getWarehouseProducts(req, res) {
  try {
    const params = validateProductQueryParams(req.query);
    const queryParams = {
      ...params,
      status: "ACTIVE",
      include_children: false,
    };

    const result = await getProductsWithPagination(queryParams);

    return res.status(200).json({
      message: "Lấy danh sách sản phẩm trong kho thành công",
      data: (result.products || []).map((product) =>
        toProductDTO(product, { showAvailableStock: true }),
      ),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error("[saleOrderController.getWarehouseProducts]", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi lấy danh sách sản phẩm",
      error: error.message,
    });
  }
}

/**
 * 2. GET /api/sale-orders/products/:id
 * Lấy chi tiết thông tin sản phẩm phục vụ xem chi tiết ở POS
 */
async function getProductDetail(req, res) {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    if (!productId || isNaN(productId) || productId <= 0) {
      return res.status(400).json({ message: "Mã sản phẩm không hợp lệ." });
    }

    const product = await findProductById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sản phẩm trong kho." });
    }

    return res.status(200).json({
      message: "Lấy thông tin chi tiết sản phẩm thành công",
      data: toProductDTO(product),
    });
  } catch (error) {
    console.error("[saleOrderController.getProductDetail]", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi xem chi tiết sản phẩm",
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
      message: "Lấy metadata thành công",
      data: metadata,
    });
  } catch (error) {
    console.error("[saleOrderController.getProductMetadata]", error);
    return res.status(500).json({
      message: "Lỗi khi lấy metadata",
      error: error.message,
    });
  }
}

/**
 * 4. POST /api/sale-orders/orders/from-contract/:contractId
 * Tạo đơn hàng từ hợp đồng đã ký kết
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
      createBy: req.user?.email || "STAFF",
    });

    return res.status(201).json({
      message: "Tạo đơn hàng từ hợp đồng thành công",
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error("[saleOrderController.createOrderFromContract]", error);
    const isConflict =
      error.message && error.message.includes("đã được tạo đơn hàng");
    const isClientError =
      error.message &&
      (error.message.includes("chưa được ký") ||
        error.message.includes("không đủ để xuất") ||
        error.message.includes("không tìm thấy"));
    const status = isConflict ? 409 : isClientError ? 400 : 500;

    return res.status(status).json({
      message: error.message || "Lỗi hệ thống khi tạo đơn hàng",
      error: error.message,
    });
  }
}

/**
 * 5. GET /api/sale-orders/orders
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
      search: typeof search === "string" ? search.trim() : "",
      search_by:
        typeof search_by === "string" ? search_by.trim().toUpperCase() : "ALL",
      order_code: typeof order_code === "string" ? order_code.trim() : "",
      customer_name:
        typeof customer_name === "string" ? customer_name.trim() : "",
      status: typeof status === "string" ? status.trim().toUpperCase() : "ALL",
      order_type:
        typeof order_type === "string"
          ? order_type.trim().toUpperCase()
          : "ALL",
      sort: typeof sort === "string" ? sort.trim().toUpperCase() : "NEWEST",
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
    });

    return res.status(200).json({
      message: "Lấy danh sách đơn hàng thành công",
      data: (result.orders || []).map(toOrderDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error("[saleOrderController.getOrders]", error);
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
}

/**
 * 6. GET /api/sale-orders/orders/:id
 * Lấy chi tiết đơn hàng
 */
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Mã đơn hàng không hợp lệ." });
    }

    const order = await findOrderByIdModel(orderId);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    return res.status(200).json({
      message: "Lấy chi tiết đơn hàng thành công",
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error("[saleOrderController.getOrderById]", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi lấy chi tiết đơn hàng",
      error: error.message,
    });
  }
}

/**
 * 7. POST /api/sale-orders/orders/:id/deliver
 * Sales cập nhật trạng thái bàn giao / giao hàng
 */
async function deliverOrder(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Mã đơn hàng không hợp lệ." });
    }

    const updatedBy = req.user?.email || req.user?.full_name || "Sales";
    const order = await confirmDeliveryModel(orderId, {
      deliveryAddress: req.body.deliveryAddress,
      deliveryDate: req.body.deliveryDate,
      note: req.body.note,
      updatedBy,
    });

    return res.status(200).json({
      message: "Kích hoạt giao hàng thành công",
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error("[saleOrderController.deliverOrder]", error);
    return res.status(400).json({
      message: error.message || "Lỗi khi kích hoạt giao hàng",
      error: error.message,
    });
  }
}

/**
 * 8. POST /api/sale-orders/orders/:id/complete
 * Sales xác nhận giao hàng thành công -> Hoàn tất đơn COMPLETED
 */
async function completeOrder(req, res) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (!orderId || isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Mã đơn hàng không hợp lệ." });
    }

    const updatedBy = req.user?.email || req.user?.full_name || "Sales";
    const order = await completeDeliveryModel(orderId, { updatedBy });

    return res.status(200).json({
      message: "Hoàn tất đơn hàng thành công (COMPLETED)",
      data: toOrderDTO(order),
    });
  } catch (error) {
    console.error("[saleOrderController.completeOrder]", error);
    return res.status(400).json({
      message: error.message || "Lỗi khi hoàn tất đơn hàng",
      error: error.message,
    });
  }
}

module.exports = {
  // Order & Catalog methods
  getWarehouseProducts,
  getProductDetail,
  getProductMetadata,
  createOrderFromContract,
  getOrders,
  getOrderById,
  deliverOrder,
  completeOrder,

  // Re-export Customer methods for full backward compatibility
  ...saleCustomerController,

  // Re-export Contract & Request methods for full backward compatibility
  ...saleContractController,
};
