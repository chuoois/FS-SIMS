// =========================================================
// orderManagementValidator.js
// Validation & DTO chuyên biệt cho Quản lý Đơn hàng (Owner & Leader)
// Thuộc utils/ -> Dễ unit test, hàm thuần không phụ thuộc DB/network
// =========================================================

const VALID_STATUSES = [
  'NEW',
  'CONFIRMED',
  'IN_PRODUCTION',
  'PROCESSING',
  'UNDER_INSPECTION',
  'READY_TO_DELIVER',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
];

const STATUS_LABELS = {
  NEW: 'Mới',
  CONFIRMED: 'Đã xác nhận',
  IN_PRODUCTION: 'Đang xử lý',
  PROCESSING: 'Đang xử lý',
  UNDER_INSPECTION: 'Chờ nghiệm thu',
  READY_TO_DELIVER: 'Đã nghiệm thu / Chờ giao',
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
  IN_PRODUCTION: 'COMPLETED',
  PROCESSING: 'COMPLETED',
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

  // Lấy ảnh thiết kế từ Contract -> OrderRequest nếu có
  const designImages = order.contract?.request?.images || [];

  return {
    orderId: order.order_id,
    orderCode: order.order_code,
    orderType: order.order_type,
    orderTypeLabel: ORDER_TYPE_LABELS[order.order_type] || order.order_type,
    contractId: order.contract_id,
    contractCode: order.contract?.contract_code || null,
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
    staffName: order.staff?.full_name || null,
    note: order.note,
    createdAt: order.createdate,
    updatedAt: order.modifiedate,
    designImages: designImages.map((img) => ({
      imageId: img.request_image_id,
      imageUrl: img.image_url,
      requestItemId: img.request_item_id,
    })),
    items: (order.items || []).map((it) => ({
      orderItemId: it.order_item_id,
      contractItemId: it.contract_item_id,
      productId: it.product_id,
      productCode: it.product?.product_code || null,
      productName: it.item_name || it.product?.product_name || null,
      imageUrl: it.product?.image_url || null,
      categoryId: it.category_id,
      categoryName: it.category?.category_name || null,
      roomId: it.room_id,
      roomName: it.room?.room_name || null,
      materialId: it.material_id,
      materialName: it.material?.material_name || null,
      colorId: it.color_id,
      colorName: it.color?.color_name || null,
      hexValue: it.color?.hex_value || null,
      lengthCm: it.length_cm,
      widthCm: it.width_cm,
      heightCm: it.height_cm,
      quantity: it.quantity,
      unitPrice: Number(it.unit_price) || 0,
      totalPrice: it.quantity * (Number(it.unit_price) || 0),
      description: it.description,
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
