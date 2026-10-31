// =========================================================
// saleOrderValidator.js
// Validation & DTO chuyên biệt cho Luồng Bán hàng tại quầy (Role Sale POS)
// Thuộc utils/ -> Dễ unit test, hàm thuần không phụ thuộc DB/network
// =========================================================

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

/**
 * Validate dữ liệu đầu vào khi sale tạo hợp đồng OFFLINE tại quầy
 */
function validateCreateOfflineContractInput(data = {}) {
  const {
    customer_name,
    customer_phone,
    customer_address,
    deposit_amount = 0,
    delivery_date,
    signed_place,
    terms,
    note,
    items,
  } = data;

  // 1. Tên khách hàng
  if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
    return { isValid: false, error: 'Họ tên khách hàng là bắt buộc và không được để trống.' };
  }
  const trimmedName = customer_name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 150) {
    return { isValid: false, error: 'Họ tên khách hàng phải từ 2 đến 150 ký tự.' };
  }

  // 2. Số điện thoại
  if (!customer_phone || typeof customer_phone !== 'string' || !customer_phone.trim()) {
    return { isValid: false, error: 'Số điện thoại khách hàng là bắt buộc.' };
  }
  const trimmedPhone = customer_phone.trim();
  if (!PHONE_REGEX.test(trimmedPhone)) {
    return { isValid: false, error: 'Số điện thoại không hợp lệ (từ 7 đến 20 ký tự số).' };
  }

  // 3. Tiền đặt cọc
  const deposit = Number(deposit_amount) || 0;
  if (isNaN(deposit) || deposit < 0) {
    return { isValid: false, error: 'Tiền đặt cọc phải là số không âm.' };
  }

  // 4. Danh sách sản phẩm (items)
  if (!Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'Hợp đồng phải có ít nhất một sản phẩm được chọn.' };
  }

  const validatedItems = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const productId = parseInt(item.product_id || item.productId, 10);
    const quantity = parseInt(item.quantity, 10);
    const unitPrice = parseInt(item.unit_price ?? item.unitPrice ?? item.price, 10);

    if (!productId || isNaN(productId) || productId <= 0) {
      return { isValid: false, error: `Sản phẩm thứ ${i + 1} có mã ID không hợp lệ.` };
    }
    if (isNaN(quantity) || quantity <= 0) {
      return { isValid: false, error: `Số lượng cho sản phẩm thứ ${i + 1} phải lớn hơn 0.` };
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      return { isValid: false, error: `Đơn giá cho sản phẩm thứ ${i + 1} phải là số không âm.` };
    }

    validatedItems.push({
      product_id: productId,
      quantity,
      unit_price: unitPrice,
      description: item.description ? String(item.description).trim().slice(0, 500) : null,
    });
  }

  // 5. Kiểm tra tổng tiền
  const totalAmount = validatedItems.reduce((acc, curr) => acc + curr.quantity * curr.unit_price, 0);
  if (totalAmount <= 0) {
    return { isValid: false, error: 'Tổng giá trị hợp đồng phải lớn hơn 0.' };
  }
  if (deposit > totalAmount) {
    return { isValid: false, error: 'Số tiền đặt cọc không được vượt quá tổng giá trị hợp đồng.' };
  }

  return {
    isValid: true,
    value: {
      customer_name: trimmedName,
      customer_phone: trimmedPhone,
      customer_address: customer_address ? String(customer_address).trim().slice(0, 255) : null,
      deposit_amount: deposit,
      total_amount: totalAmount,
      delivery_date: delivery_date ? String(delivery_date).trim() : null,
      signed_place: signed_place ? String(signed_place).trim().slice(0, 255) : 'Cửa hàng Góc Nhà',
      terms: terms ? String(terms).trim() : null,
      note: note ? String(note).trim().slice(0, 500) : null,
      items: validatedItems,
    },
  };
}

/**
 * Validate khi chốt và ký hợp đồng
 */
function validateSignContractInput(data = {}) {
  const { signed_place, note } = data;
  return {
    isValid: true,
    value: {
      signed_place: signed_place ? String(signed_place).trim().slice(0, 255) : 'Cửa hàng Góc Nhà',
      note: note ? String(note).trim().slice(0, 500) : null,
    },
  };
}

/**
 * Validate khi tạo đơn hàng từ hợp đồng đã ký
 */
function validateCreateOrderFromContractInput(contractId) {
  const parsedId = parseInt(contractId, 10);
  if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
    return { isValid: false, error: 'Mã hợp đồng (contractId) không hợp lệ.' };
  }
  return { isValid: true, value: parsedId };
}

/**
 * Chuyển đổi dữ liệu Contract sang DTO
 */
function toContractDTO(raw) {
  if (!raw) return null;
  const contract = raw.toJSON ? raw.toJSON() : raw;

  return {
    contractId: contract.contract_id,
    contractCode: contract.contract_code,
    source: contract.source,
    contractType: contract.contract_type,
    requestId: contract.request_id,
    customerAccountId: contract.customer_account_id,
    customerName: contract.customer_name,
    customerPhone: contract.customer_phone,
    customerAddress: contract.customer_address,
    totalAmount: Number(contract.total_amount) || 0,
    depositAmount: Number(contract.deposit_amount) || 0,
    remainingAmount: Math.max(0, (Number(contract.total_amount) || 0) - (Number(contract.deposit_amount) || 0)),
    status: contract.status,
    signedDate: contract.signed_date,
    signedPlace: contract.signed_place,
    deliveryDate: contract.delivery_date,
    contractFileUrl: contract.contract_file_url,
    terms: contract.terms,
    signedBy: contract.signed_by,
    signerName: contract.signer?.full_name || null,
    note: contract.note,
    createdAt: contract.createdate,
    updatedAt: contract.modifiedate,
    items: (contract.items || []).map((it) => ({
      contractItemId: it.contract_item_id,
      productId: it.product_id,
      productCode: it.product?.product_code || null,
      productName: it.item_name || it.product?.product_name || null,
      imageUrl: it.product?.image_url || null,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      totalPrice: it.quantity * it.unit_price,
      description: it.description,
    })),
  };
}

/**
 * Chuyển đổi dữ liệu CustomerOrder sang DTO
 */
function toOrderDTO(raw) {
  if (!raw) return null;
  const order = raw.toJSON ? raw.toJSON() : raw;

  return {
    orderId: order.order_id,
    orderCode: order.order_code,
    orderType: order.order_type,
    contractId: order.contract_id,
    contractCode: order.contract?.contract_code || null,
    customerAccountId: order.customer_account_id,
    contactName: order.contact_name,
    contactPhone: order.contact_phone,
    deliveryAddress: order.delivery_address,
    totalAmount: Number(order.total_amount) || 0,
    depositAmount: Number(order.deposit_amount) || 0,
    paidAmount: Number(order.paid_amount) || 0,
    remainingAmount: Math.max(0, (Number(order.total_amount) || 0) - (Number(order.paid_amount) || 0)),
    status: order.status,
    expectedDate: order.expected_date,
    deliveredDate: order.delivered_date,
    assignedTo: order.assigned_to,
    staffName: order.staff?.full_name || null,
    note: order.note,
    createdAt: order.createdate,
    updatedAt: order.modifiedate,
    items: (order.items || []).map((it) => ({
      orderItemId: it.order_item_id,
      contractItemId: it.contract_item_id,
      productId: it.product_id,
      productCode: it.product?.product_code || null,
      productName: it.item_name || it.product?.product_name || null,
      imageUrl: it.product?.image_url || null,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      totalPrice: it.quantity * it.unit_price,
      description: it.description,
    })),
  };
}

module.exports = {
  validateCreateOfflineContractInput,
  validateSignContractInput,
  validateCreateOrderFromContractInput,
  toContractDTO,
  toOrderDTO,
};

