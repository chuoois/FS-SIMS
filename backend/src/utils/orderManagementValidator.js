// =========================================================
// orderManagementValidator.js
// Validation & DTO chuyên biệt cho Quản lý Đơn hàng (Owner)
// Thuộc utils/ -> Dễ unit test, hàm thuần không phụ thuộc DB/network
// =========================================================

const {
  extractOrderDesignContext,
  mapOrderItemDesignFields,
} = require('./saleOrderValidator');

const VALID_STATUSES = [
  'NEW',
  'CONFIRMED',
  'ASSIGNED',
  'IN_PRODUCTION',
  'IN_PROGRESS',
  'PROCESSING',
  'UNDER_INSPECTION',
  'PENDING_APPROVAL',
  'READY_TO_DELIVER',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
];

const STATUS_LABELS = {
  NEW: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  ASSIGNED: 'Đã giao thợ',
  IN_PRODUCTION: 'Đang gia công',
  IN_PROGRESS: 'Đang gia công',
  PROCESSING: 'Đang gia công',
  UNDER_INSPECTION: 'Chờ duyệt nghiệm thu',
  PENDING_APPROVAL: 'Chờ duyệt nghiệm thu',
  READY_TO_DELIVER: 'Sẵn sàng giao',
  DELIVERING: 'Đang giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const ORDER_TYPE_LABELS = {
  READY: 'Hàng sẵn',
  CUSTOM: 'Đặt theo yêu cầu',
};

// Quy trình chuyển trạng thái đơn hàng tuần tự
const NEXT_ORDER_STATUS = {
  NEW: 'CONFIRMED',
  CONFIRMED: 'IN_PRODUCTION',
  ASSIGNED: 'IN_PRODUCTION',
  IN_PRODUCTION: 'UNDER_INSPECTION',
  IN_PROGRESS: 'UNDER_INSPECTION',
  PROCESSING: 'UNDER_INSPECTION',
  UNDER_INSPECTION: 'READY_TO_DELIVER',
  PENDING_APPROVAL: 'READY_TO_DELIVER',
  READY_TO_DELIVER: 'DELIVERING',
  DELIVERING: 'COMPLETED',
};

/**
 * Lấy trạng thái kế tiếp hợp lệ trong quy trình
 */
function getNextOrderStatus(currentStatus) {
  if (!currentStatus) return null;
  return NEXT_ORDER_STATUS[currentStatus] || null;
}

/**
 * Validate input cập nhật trạng thái đơn hàng
 */
function validateUpdateStatusInput(data = {}) {
  const { status } = data;

  if (!status || typeof status !== 'string' || !status.trim()) {
    return { isValid: false, error: 'Trạng thái đơn hàng là bắt buộc.' };
  }

  let trimmed = status.trim().toUpperCase();
  if (trimmed === 'PROCESSING') {
    trimmed = 'IN_PRODUCTION';
  }

  if (!VALID_STATUSES.includes(trimmed)) {
    return {
      isValid: false,
      error: `Trạng thái "${trimmed}" không hợp lệ. Các trạng thái hợp lệ: NEW, CONFIRMED, IN_PRODUCTION, COMPLETED, CANCELLED.`,
    };
  }

  return { isValid: true, value: { status: trimmed } };
}

/**
 * Chuyển đổi dữ liệu CustomerOrder sang DTO đầy đủ (Order Management)
 */
function toOrderManagementDTO(raw) {
  if (!raw) return null;
  const order = raw.toJSON ? raw.toJSON() : raw;
  const nextStatus = getNextOrderStatus(order.status);
  const designContext = extractOrderDesignContext(order);
  const rawOrderItems = order.items || [];
  let inspectionImages = [];
  let inspectionNote = null;

  // 1. Ưu tiên lấy từ bảng customer_order_image (lọc rõ image_type = INSPECTION)
  const tableImages = order.inspectionImages || order.customerOrderImages || order.customerOrderImageOrderIdRecords;
  if (Array.isArray(tableImages) && tableImages.length > 0) {
    inspectionImages = tableImages
      .filter((img) => !img.image_type || img.image_type === 'INSPECTION')
      .map((img) => (typeof img === 'string' ? img : img.image_url))
      .filter(Boolean);

    // Gộp thêm ảnh thiết kế lưu từ customer_order_image (nếu có) vào designContext.images
    const extraDesignImages = tableImages
      .filter((img) => img.image_type === 'DESIGN')
      .map((img) => (typeof img === 'string' ? img : img.image_url))
      .filter(Boolean);
    if (extraDesignImages.length > 0) {
      extraDesignImages.forEach((url) => {
        if (!designContext.images.some((d) => (d.imageUrl || d.image_url) === url)) {
          designContext.images.push({ imageUrl: url, isOwnerDesign: true });
        }
      });
    }
  }

  // 2. Fallback đọc từ note cũ nếu bảng chưa có ảnh (tương thích ngược đơn cũ)
  if (order.note) {
    if (inspectionImages.length === 0) {
      const imgMatch = order.note.match(/\[(?:Ảnh nghiệm thu|INSPECTION_IMAGES)\]:\s*([^\n\r]+)/i);
      if (imgMatch && imgMatch[1]) {
        inspectionImages = imgMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    const noteMatch = order.note.match(/\[Gửi nghiệm thu\]:\s*([^\n\r]+)/i);
    if (noteMatch && noteMatch[1]) {
      inspectionNote = noteMatch[1].trim();
    }
  }

  let isProductionCompleted = false;
  let rejectReason = null;
  if (order.note) {
    const lastDoneIdx = order.note.lastIndexOf('[PRODUCTION_DONE');
    const lastPendingIdx = order.note.lastIndexOf('[PRODUCTION_PENDING');
    if (lastDoneIdx !== -1) {
      isProductionCompleted = lastDoneIdx > lastPendingIdx;
    }
    const rejectMatch = order.note.match(/\[Nghiệm thu KHÔNG ĐẠT[^\]]*\]:\s*([^\n\r]+)/i);
    if (rejectMatch && rejectMatch[1]) {
      rejectReason = rejectMatch[1].trim();
    }
  }

  return {
    orderId: order.order_id,
    orderCode: order.order_code,
    orderType: order.order_type,
    orderTypeLabel: ORDER_TYPE_LABELS[order.order_type] || order.order_type,
    contractId: order.contract_id,
    contractCode: order.contract?.contract_code || null,
    requestId: designContext.requestId,
    requestCode: designContext.requestCode,
    requestTitle: designContext.requestTitle,
    requestDescription: designContext.requestDescription,
    customerAccountId: order.customer_account_id,
    contactName: order.contact_name,
    contactPhone: order.contact_phone,
    deliveryAddress: order.delivery_address,
    totalAmount: Number(order.total_amount) || 0,
    depositAmount: Number(order.deposit_amount) || 0,
    paidAmount: Number(order.paid_amount) || 0,
    remainingAmount: Math.max(
      0,
      (Number(order.total_amount) || 0) - (Number(order.paid_amount) || 0)
    ),
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] || order.status,
    nextStatus,
    nextStatusLabel: nextStatus ? STATUS_LABELS[nextStatus] || nextStatus : null,
    expectedDate: order.expected_date,
    deliveredDate: order.delivered_date,
    assignedTo: order.assigned_to,
    leaderId: order.assigned_to,
    staffName: order.staff?.full_name || null,
    leaderName: order.staff?.full_name || null,
    inspectionImages,
    inspectionNote,
    isProductionCompleted,
    rejectReason,
    note: order.note,
    createdAt: order.createdate,
    updatedAt: order.modifiedate,
    images: designContext.images,
    items: rawOrderItems.map((it) => ({
      orderItemId: it.order_item_id,
      contractItemId: it.contract_item_id,
      productId: it.product_id,
      productCode: it.product?.product_code || null,
      productName: it.item_name || it.product?.product_name || null,
      quantity: it.quantity,
      unitPrice: Number(it.unit_price) || 0,
      totalPrice: it.quantity * (Number(it.unit_price) || 0),
      ...mapOrderItemDesignFields(it, designContext.requestItems, rawOrderItems.length),
    })),
  };
}

module.exports = {
  VALID_STATUSES,
  STATUS_LABELS,
  ORDER_TYPE_LABELS,
  NEXT_ORDER_STATUS,
  getNextOrderStatus,
  validateUpdateStatusInput,
  toOrderManagementDTO,
};
