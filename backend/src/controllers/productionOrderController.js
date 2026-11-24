// =========================================================
// productionOrderController.js
// Controller Quản lý Lệnh Gia Công (Manage Production Orders)
// Tuân thủ kiến trúc MVC chuẩn:
// routes/ -> controllers/ -> models/
// Không viết SQL/query Sequelize trực tiếp tại controller
// =========================================================

const {
  findProductionOrderById,
  getAllProductionOrders,
  createProductionOrder,
  assignLeaderToOrder,
  cancelProductionOrder,
  getEligibleCustomerOrders,
} = require('../models/ProductionOrderModel');

const { getStaffLeaders } = require('../models/userAccount.model');

const {
  validateCreateProductionOrderInput,
  validateAssignLeaderInput,
  toProductionOrderDTO,
} = require('../utils/productionOrderValidator');

const {
  findOrderById,
  ownerInspectOrder,
} = require('../models/CustomerOrderModel');

const { CustomerOrderImage } = require('../models/CustomerOrderImageModel');

const { toOrderManagementDTO } = require('../utils/orderManagementValidator');

/**
 * GET /api/production-orders
 * Lấy danh sách lệnh gia công có tìm kiếm, lọc trạng thái và phân trang
 */
async function getProductionOrders(req, res) {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const result = await getAllProductionOrders({
      page: Number(page),
      limit: Number(limit),
      status,
      search,
    });

    return res.status(200).json({
      message: 'Lấy danh sách lệnh gia công thành công',
      productionOrders: (result.productionOrders || []).map(toProductionOrderDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[productionOrderController.getProductionOrders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách lệnh gia công',
      error: error.message,
    });
  }
}

/**
 * GET /api/production-orders/eligible-orders
 * Lấy danh sách đơn hàng CONFIRMED + CUSTOM chưa có lệnh gia công
 */
async function getEligibleOrders(req, res) {
  try {
    const orders = await getEligibleCustomerOrders();
    return res.status(200).json({
      message: 'Lấy danh sách đơn hàng đủ điều kiện thành công',
      data: orders,
    });
  } catch (error) {
    console.error('[productionOrderController.getEligibleOrders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách đơn hàng',
      error: error.message,
    });
  }
}

/**
 * GET /api/production-orders/staff-leaders
 * Lấy danh sách người dùng có role LEADERSTAFF (trưởng nhóm)
 */
async function getStaffLeadersList(req, res) {
  try {
    const leaders = await getStaffLeaders();
    return res.status(200).json({
      message: 'Lấy danh sách trưởng nhóm thành công',
      data: leaders,
    });
  } catch (error) {
    console.error('[productionOrderController.getStaffLeadersList]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách trưởng nhóm',
      error: error.message,
    });
  }
}

/**
 * POST /api/production-orders
 * Tạo mới lệnh gia công từ đơn hàng khách hàng CONFIRMED + CUSTOM
 */
async function createProductionOrderHandler(req, res) {
  try {
    const validation = validateCreateProductionOrderInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { order_id, planned_start, planned_end, assigned_to } = validation.value;
    const userEmail = req.user ? req.user.email : 'system';

    const po = await createProductionOrder({
      orderId: order_id,
      plannedStart: planned_start,
      plannedEnd: planned_end,
      assignedTo: assigned_to || req.body.assigned_to || req.body.assignedTo || null,
      createBy: userEmail,
    });

    const poDetail = await findProductionOrderById(po.production_id);


    return res.status(201).json({
      message: 'Tạo lệnh gia công thành công.',
      productionOrder: toProductionOrderDTO(poDetail),
    });
  } catch (error) {
    console.error('[productionOrderController.createProductionOrderHandler]', error);
    // Business logic errors return 400
    const clientErrors = [
      'Đơn hàng không tồn tại',
      'phải ở trạng thái',
      'Chỉ đơn hàng',
      'đã có lệnh gia công',
    ];
    const isClientError = clientErrors.some((msg) => error.message && error.message.includes(msg));
    return res.status(isClientError ? 400 : 500).json({
      message: error.message || 'Lỗi máy chủ khi tạo lệnh gia công',
      error: error.message,
    });
  }
}

/**
 * PATCH /api/production-orders/:id/assign-leader
 * Gán trưởng nhóm sản xuất cho lệnh gia công
 */
async function assignLeader(req, res) {
  const { id } = req.params;
  const productionId = Number(id);

  if (!productionId || isNaN(productionId) || productionId <= 0) {
    return res.status(400).json({ message: 'ID lệnh gia công không hợp lệ.' });
  }

  try {
    // Kiểm tra lệnh gia công tồn tại
    const existing = await findProductionOrderById(productionId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh gia công.' });
    }

    const validation = validateAssignLeaderInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { assigned_to } = validation.value;
    const userEmail = req.user ? req.user.email : 'system';

    const updated = await assignLeaderToOrder(productionId, assigned_to, userEmail);

    return res.status(200).json({
      message: 'Gán trưởng nhóm thành công.',
      productionOrder: toProductionOrderDTO(updated),
    });
  } catch (error) {
    console.error('[productionOrderController.assignLeader]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi gán trưởng nhóm',
      error: error.message,
    });
  }
}

/**
 * POST /api/production-orders/:id/cancel
 * Hủy lệnh gia công (DRAFT hoặc IN_PROGRESS)
 */
async function cancelProductionOrderHandler(req, res) {
  const { id } = req.params;
  const productionId = Number(id);

  if (!productionId || isNaN(productionId) || productionId <= 0) {
    return res.status(400).json({ message: 'ID lệnh gia công không hợp lệ.' });
  }

  try {
    const existing = await findProductionOrderById(productionId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh gia công.' });
    }

    const userEmail = req.user ? req.user.email : 'system';
    await cancelProductionOrder(productionId, userEmail);


    return res.status(200).json({
      message: 'Hủy lệnh gia công thành công. Đơn hàng liên kết đã được hoàn trả về trạng thái CONFIRMED.',
    });
  } catch (error) {
    console.error('[productionOrderController.cancelProductionOrderHandler]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi hủy lệnh gia công',
      error: error.message,
    });
  }
}


/**
 * GET /api/production-orders/:id
 * Lấy chi tiết lệnh gia công kèm thông tin đơn hàng và ảnh thiết kế / nghiệm thu
 */
async function getProductionOrderDetail(req, res) {
  const { id } = req.params;
  const productionId = Number(id);

  if (!productionId || isNaN(productionId) || productionId <= 0) {
    return res.status(400).json({ message: 'ID lệnh gia công không hợp lệ.' });
  }

  try {
    const po = await findProductionOrderById(productionId);
    if (!po) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh gia công.' });
    }

    const poDto = toProductionOrderDTO(po);

    // Lấy ảnh của đơn hàng liên kết (cả DESIGN và INSPECTION)
    let generalDesignImages = [];
    let generalInspectionImages = [];
    let allDesignImages = [];
    let allInspectionImages = [];
    let orderDetail = null;

    // Danh sách ảnh từ bảng CustomerOrderImage
    let orderImageRecords = [];
    if (po.order_id) {
      try {
        orderImageRecords = await CustomerOrderImage.findAll({
          where: { order_id: po.order_id },
          order: [['sort_order', 'ASC'], ['createdate', 'ASC']],
          attributes: ['order_image_id', 'order_item_id', 'image_url', 'image_type', 'sort_order', 'createdate'],
        });
      } catch (imgErr) {
        console.warn('[productionOrderController.getProductionOrderDetail] Không thể tải ảnh CustomerOrderImage:', imgErr.message);
      }

      // 1. Tải chi tiết đơn hàng (hồ sơ thiết kế gốc từ order_request_image, contract, item images)
      try {
        const orderRaw = await findOrderById(po.order_id);
        if (orderRaw) {
          orderDetail = toOrderManagementDTO(orderRaw);
          // Ảnh thiết kế chung của toàn đơn hàng
          if (Array.isArray(orderDetail.images)) {
            orderDetail.images.forEach((img) => {
              const url = typeof img === 'string' ? img : (img.imageUrl || img.image_url);
              if (url && !generalDesignImages.includes(url)) generalDesignImages.push(url);
            });
          }
          // Ảnh nghiệm thu chung từ orderDetail (nếu có)
          if (Array.isArray(orderDetail.inspectionImages)) {
            orderDetail.inspectionImages.forEach((url) => {
              if (url && !generalInspectionImages.includes(url)) generalInspectionImages.push(url);
            });
          }
        }
      } catch (ordErr) {
        console.warn('[productionOrderController.getProductionOrderDetail] Không thể tải orderDetail:', ordErr.message);
      }

      // Ảnh chung từ CustomerOrderImage (order_item_id = null)
      orderImageRecords.forEach((i) => {
        if (!i.order_item_id) {
          if (i.image_type === 'DESIGN' && !generalDesignImages.includes(i.image_url)) {
            generalDesignImages.push(i.image_url);
          } else if (i.image_type === 'INSPECTION' && !generalInspectionImages.includes(i.image_url)) {
            generalInspectionImages.push(i.image_url);
          }
        }
      });
    }

    // 2. Gắn ảnh thiết kế và ảnh nghiệm thu riêng cho TỪNG sản phẩm
    const enrichedItems = (poDto.items || []).map((it, idx) => {
      const matchedOrderItem = (orderDetail?.items || []).find(
        (oi) => Number(oi.orderItemId) === Number(it.order_item_id)
      ) || (orderDetail?.items || [])[idx];

      const itemDesignImages = [];
      const itemInspectionImages = [];

      // Ảnh từ đơn hàng gốc (order_request_item images)
      if (matchedOrderItem) {
        if (matchedOrderItem.imageUrl && !itemDesignImages.includes(matchedOrderItem.imageUrl)) {
          itemDesignImages.push(matchedOrderItem.imageUrl);
        }
        if (Array.isArray(matchedOrderItem.images)) {
          matchedOrderItem.images.forEach((img) => {
            const url = typeof img === 'string' ? img : (img.imageUrl || img.image_url);
            if (url && !itemDesignImages.includes(url)) itemDesignImages.push(url);
          });
        }
      }

      // Ảnh riêng từ bảng CustomerOrderImage gắn với order_item_id này
      orderImageRecords.forEach((i) => {
        if (i.order_item_id && Number(i.order_item_id) === Number(it.order_item_id)) {
          if (i.image_type === 'DESIGN' && !itemDesignImages.includes(i.image_url)) {
            itemDesignImages.push(i.image_url);
          } else if (i.image_type === 'INSPECTION' && !itemInspectionImages.includes(i.image_url)) {
            itemInspectionImages.push(i.image_url);
          }
        }
      });

      // Gom vào danh sách tổng
      itemDesignImages.forEach((u) => { if (!allDesignImages.includes(u)) allDesignImages.push(u); });
      itemInspectionImages.forEach((u) => { if (!allInspectionImages.includes(u)) allInspectionImages.push(u); });

      return {
        ...it,
        designImages: itemDesignImages,
        inspectionImages: itemInspectionImages,
        imageUrl: itemDesignImages[0] || it.imageUrl || null,
        materialName: matchedOrderItem?.materialName || null,
        colorName: matchedOrderItem?.colorName || null,
        roomName: matchedOrderItem?.roomName || null,
        categoryName: matchedOrderItem?.categoryName || null,
      };
    });

    // Tổng hợp tất cả ảnh (cả riêng và chung) để tương thích ngược
    generalDesignImages.forEach((u) => { if (!allDesignImages.includes(u)) allDesignImages.push(u); });
    generalInspectionImages.forEach((u) => { if (!allInspectionImages.includes(u)) allInspectionImages.push(u); });

    return res.status(200).json({
      message: 'Lấy chi tiết lệnh gia công thành công',
      productionOrder: {
        ...poDto,
        items: enrichedItems,
        generalDesignImages,
        generalInspectionImages,
        designImages: allDesignImages,
        inspectionImages: allInspectionImages,
        orderStatus: orderDetail?.status || po.customerOrder?.status || null,
        order_status: orderDetail?.status || po.customerOrder?.status || null,
        orderId: po.order_id,
        orderDetail,
      },
    });
  } catch (error) {
    console.error('[productionOrderController.getProductionOrderDetail]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết lệnh gia công', error: error.message });
  }
}

/**
 * POST /api/production-orders/:id/upload-design-images
 * Chủ xưởng upload ảnh thiết kế / bản vẽ mẫu cho lệnh gia công
 * Hình ảnh được lưu vào customer_order_image (image_type='DESIGN') gắn với order_id của lệnh
 */
async function uploadDesignImages(req, res) {
  const { id } = req.params;
  const productionId = Number(id);

  if (!productionId || isNaN(productionId) || productionId <= 0) {
    return res.status(400).json({ message: 'ID lệnh gia công không hợp lệ.' });
  }

  try {
    const po = await findProductionOrderById(productionId);
    if (!po) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh gia công.' });
    }
    if (!po.order_id) {
      return res.status(400).json({ message: 'Lệnh gia công này không có đơn hàng liên kết để gắn ảnh.' });
    }

    const uploadedUrls = (req.files || []).map((f) => f.path || f.url || f.secure_url).filter(Boolean);

    // Thêm URL thủ công từ body (nếu FE gửi kèm)
    const manualUrls = req.body?.urls
      ? (Array.isArray(req.body.urls) ? req.body.urls : [req.body.urls]).filter(Boolean)
      : [];

    const allUrls = [...uploadedUrls, ...manualUrls];

    if (allUrls.length === 0) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ít nhất 1 ảnh thiết kế.' });
    }

    const uploadedBy = req.user?.email || 'owner';
    const targetOrderItemId = req.body?.order_item_id ? Number(req.body.order_item_id) : null;

    // Xóa ảnh DESIGN cũ (nếu upload cho item thì xóa của item đó, nếu upload chung thì xóa ảnh chung)
    const destroyWhere = {
      order_id: po.order_id,
      image_type: 'DESIGN',
      order_item_id: targetOrderItemId,
    };
    await CustomerOrderImage.destroy({ where: destroyWhere });

    const imageRecords = allUrls.map((url, idx) => ({
      order_id: po.order_id,
      order_item_id: targetOrderItemId,
      image_url: url,
      image_type: 'DESIGN',
      sort_order: idx,
      createby: uploadedBy,
    }));

    await CustomerOrderImage.bulkCreate(imageRecords);

    return res.status(200).json({
      message: `Đã lưu ${allUrls.length} ảnh thiết kế cho lệnh gia công thành công`,
      urls: allUrls,
      count: allUrls.length,
    });
  } catch (error) {
    console.error('[productionOrderController.uploadDesignImages]', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lưu ảnh thiết kế', error: error.message });
  }
}

/**
 * POST /api/production-orders/:id/inspect
 * Chủ xưởng nghiệm thu (Duyệt / Từ chối) lệnh gia công
 * Chuyển tiếp đến ownerInspectOrder dùng order_id liên kết
 * Body: { passed: boolean, rejectReason?: string }
 */
async function ownerInspectProductionOrder(req, res) {
  const { id } = req.params;
  const productionId = Number(id);

  if (!productionId || isNaN(productionId) || productionId <= 0) {
    return res.status(400).json({ message: 'ID lệnh gia công không hợp lệ.' });
  }

  try {
    const po = await findProductionOrderById(productionId);
    if (!po) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh gia công.' });
    }
    if (!po.order_id) {
      return res.status(400).json({ message: 'Lệnh gia công này không có đơn hàng liên kết.' });
    }

    const { passed, rejectReason, reason } = req.body;
    const isPassed = passed !== undefined ? Boolean(passed) : false;
    const finalReason = rejectReason || reason;
    const inspectedBy = req.user?.email || req.user?.full_name || 'Owner';

    const order = await ownerInspectOrder(po.order_id, {
      passed: isPassed,
      rejectReason: finalReason,
      inspectedBy,
    });

    return res.status(200).json({
      message: isPassed
        ? 'Nghiệm thu ĐẠT — Đơn hàng sẵn sàng để giao'
        : 'Đã từ chối nghiệm thu — Chuyển lại thợ xưởng xử lý',
      order: toOrderManagementDTO(order),
    });
  } catch (error) {
    console.error('[productionOrderController.ownerInspectProductionOrder]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi nghiệm thu lệnh gia công',
      error: error.message,
    });
  }
}

module.exports = {
  getProductionOrders,
  getEligibleOrders,
  getStaffLeadersList,
  createProductionOrderHandler,
  assignLeader,
  cancelProductionOrderHandler,
  uploadDesignImages,
  getProductionOrderDetail,
  ownerInspectProductionOrder,
};

