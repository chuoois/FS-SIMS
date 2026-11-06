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
 * Validate input khi sales tạo / cập nhật Order Request
 */
function validateCreateSalesRequestInput(data = {}) {
  const {
    customer_account_id,
    customerAccountId,
    contact_name,
    contactName,
    contact_phone,
    contactPhone,
    contact_email,
    contactEmail,
    delivery_address,
    deliveryAddress,
    title,
    description,
    expected_date,
    expectedDate,
    budget_min,
    budgetMin,
    budget_max,
    budgetMax,
    items,
    images,
  } = data;

  const finalName = (contactName || contact_name || '').trim();
  if (!finalName) {
    return { isValid: false, error: 'Họ tên khách hàng là bắt buộc.' };
  }
  if (finalName.length < 2 || finalName.length > 150) {
    return { isValid: false, error: 'Họ tên khách hàng phải từ 2 đến 150 ký tự.' };
  }

  const finalPhone = (contactPhone || contact_phone || '').trim();
  if (!finalPhone) {
    return { isValid: false, error: 'Số điện thoại khách hàng là bắt buộc.' };
  }
  if (!PHONE_REGEX.test(finalPhone)) {
    return { isValid: false, error: 'Số điện thoại không hợp lệ (từ 7 đến 20 ký tự số).' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'Đơn hàng phải có ít nhất một sản phẩm yêu cầu.' };
  }

  const validatedItems = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const itemName = (it.itemName || it.item_name || '').trim();
    if (!itemName) {
      return { isValid: false, error: `Sản phẩm thứ ${i + 1} phải có tên sản phẩm.` };
    }
    const qty = parseInt(it.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return { isValid: false, error: `Số lượng cho sản phẩm thứ ${i + 1} phải lớn hơn 0.` };
    }

    validatedItems.push({
      productId: it.productId || it.product_id ? parseInt(it.productId || it.product_id, 10) : null,
      itemName,
      categoryId: it.categoryId || it.category_id ? parseInt(it.categoryId || it.category_id, 10) : null,
      roomId: it.roomId || it.room_id ? parseInt(it.roomId || it.room_id, 10) : null,
      materialId: it.materialId || it.material_id ? parseInt(it.materialId || it.material_id, 10) : null,
      colorId: it.colorId || it.color_id ? parseInt(it.colorId || it.color_id, 10) : null,
      lengthCm: it.lengthCm != null ? parseInt(it.lengthCm, 10) : (it.length_cm != null ? parseInt(it.length_cm, 10) : null),
      widthCm: it.widthCm != null ? parseInt(it.widthCm, 10) : (it.width_cm != null ? parseInt(it.width_cm, 10) : null),
      heightCm: it.heightCm != null ? parseInt(it.heightCm, 10) : (it.height_cm != null ? parseInt(it.height_cm, 10) : null),
      quantity: qty,
      unitPrice: it.unitPrice != null ? parseInt(it.unitPrice, 10) : (it.unit_price != null ? parseInt(it.unit_price, 10) : null),
      description: it.description ? String(it.description).trim().slice(0, 500) : null,
    });
  }

  return {
    isValid: true,
    value: {
      customerAccountId: customerAccountId || customer_account_id ? parseInt(customerAccountId || customer_account_id, 10) : null,
      contactName: finalName,
      contactPhone: finalPhone,
      contactEmail: (contactEmail || contact_email || '').trim() || null,
      deliveryAddress: (deliveryAddress || delivery_address || '').trim() || null,
      title: (title || '').trim() || `Đơn đặt hàng ${finalName}`,
      description: (description || '').trim() || null,
      expectedDate: expectedDate || expected_date || null,
      budgetMin: budgetMin != null ? parseInt(budgetMin, 10) : (budget_min != null ? parseInt(budget_min, 10) : null),
      budgetMax: budgetMax != null ? parseInt(budgetMax, 10) : (budget_max != null ? parseInt(budget_max, 10) : null),
      items: validatedItems,
      images: Array.isArray(images) ? images : [],
    },
  };
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
      unitPrice: it.unit_price,
      totalPrice: it.quantity * it.unit_price,
      description: it.description,
    })),
  };
}

/**
 * Chuyển đổi dữ liệu OrderRequest sang DTO
 */
function toRequestDTO(raw) {
  if (!raw) return null;
  const req = raw.toJSON ? raw.toJSON() : raw;

  return {
    requestId: req.request_id,
    requestCode: req.request_code,
    orderType: req.order_type,
    requestType: req.request_type,
    customerAccountId: req.customer_account_id,
    contactName: req.contact_name,
    contactPhone: req.contact_phone,
    contactEmail: req.contact_email,
    deliveryAddress: req.delivery_address,
    title: req.title,
    description: req.description,
    budgetMin: req.budget_min,
    budgetMax: req.budget_max,
    expectedDate: req.expected_date,
    status: req.status,
    assignedTo: req.assigned_to,
    assigneeName: req.assignee?.full_name || null,
    quotedPrice: req.quoted_price,
    quotedAt: req.quoted_at,
    approvedAt: req.approved_at,
    staffNote: req.staff_note,
    rejectReason: req.reject_reason,
    createBy: req.createby,
    modifieBy: req.modifieby,
    createdAt: req.createdate,
    updatedAt: req.modifiedate,
    contract: req.contract ? {
      contractId: req.contract.contract_id,
      contractCode: req.contract.contract_code,
      status: req.contract.status,
    } : null,
    customer: req.customer ? {
      userAccountId: req.customer.user_account_id,
      fullName: req.customer.full_name,
      email: req.customer.email,
      phoneNumber: req.customer.phone_number,
    } : null,
    items: (req.items || []).map((it) => ({
      requestItemId: it.request_item_id,
      productId: it.product_id,
      productCode: it.product?.product_code || null,
      productName: it.product?.product_name || null,
      itemName: it.item_name,
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
      unitPrice: it.unit_price,
      description: it.description,
    })),
    images: (req.images || []).map((img) => ({
      requestImageId: img.request_image_id,
      requestItemId: img.request_item_id,
      imageUrl: img.image_url,
      sortOrder: img.sort_order,
    })),
  };
}

module.exports = {
  validateCreateOfflineContractInput,
  validateSignContractInput,
  validateCreateOrderFromContractInput,
  validateCreateSalesRequestInput,
  toContractDTO,
  toOrderDTO,
  toRequestDTO,
};

