// =========================================================
// productValidator.js
// DTO & Validation utilities cho Sản phẩm (Product)
// =========================================================

const PRODUCT_CODE_REGEX = /^[A-Za-z0-9_-]{3,50}$/;

/**
 * Validate dữ liệu đầu vào khi tạo mới sản phẩm
 */
function validateCreateProductInput(data = {}) {
  const {
    product_code,
    product_name,
    category_id,
    room_id,
    material_id,
    color_id,
    product_type = 'SINGLE',
    price = 0,
    stock_quantity = 0,
    length_cm,
    width_cm,
    height_cm,
    description,
    image_url,
    status = 'ACTIVE',
    set_items,
  } = data;

  // 1. Validate product_code
  let normalizedCode = null;
  if (product_code !== undefined && product_code !== null && String(product_code).trim() !== '') {
    const trimmedCode = String(product_code).trim().toUpperCase();
    if (!PRODUCT_CODE_REGEX.test(trimmedCode)) {
      return {
        isValid: false,
        error: 'Mã sản phẩm chỉ được chứa chữ cái, số, dấu gạch nối (-), dấu gạch dưới (_) và từ 3 đến 50 ký tự.',
      };
    }
    normalizedCode = trimmedCode;
  }

  // 2. Validate product_name
  if (!product_name || typeof product_name !== 'string' || product_name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Tên sản phẩm là bắt buộc và không được để trống.',
    };
  }
  const trimmedName = product_name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 200) {
    return {
      isValid: false,
      error: 'Tên sản phẩm phải từ 2 đến 200 ký tự.',
    };
  }

  // 3. Validate Foreign Keys: category_id, room_id, material_id, color_id
  const catId = parseInt(category_id, 10);
  if (!catId || isNaN(catId) || catId <= 0) {
    return { isValid: false, error: 'Danh mục sản phẩm không hợp lệ.' };
  }

  const rId = parseInt(room_id, 10);
  if (!rId || isNaN(rId) || rId <= 0) {
    return { isValid: false, error: 'Không gian phòng không hợp lệ.' };
  }

  const matId = parseInt(material_id, 10);
  if (!matId || isNaN(matId) || matId <= 0) {
    return { isValid: false, error: 'Chất liệu sản phẩm không hợp lệ.' };
  }

  const colId = parseInt(color_id, 10);
  if (!colId || isNaN(colId) || colId <= 0) {
    return { isValid: false, error: 'Màu sắc sản phẩm không hợp lệ.' };
  }

  // 4. Validate product_type
  const normalizedType = String(product_type).toUpperCase();
  if (!['SINGLE', 'SET'].includes(normalizedType)) {
    return { isValid: false, error: 'Loại sản phẩm phải là SINGLE hoặc SET.' };
  }

  // 5. Validate price
  const numPrice = parseInt(price, 10);
  if (isNaN(numPrice) || numPrice < 0) {
    return { isValid: false, error: 'Giá sản phẩm phải là số nguyên không âm.' };
  }

  // 6. Validate stock_quantity
  const numStock = parseInt(stock_quantity, 10);
  if (isNaN(numStock) || numStock < 0) {
    return { isValid: false, error: 'Số lượng tồn kho phải là số nguyên không âm.' };
  }

  // 7. Validate dimensions (optional)
  const parseDimension = (val) => {
    if (val === undefined || val === null || String(val).trim() === '') return null;
    const num = parseInt(val, 10);
    return isNaN(num) || num < 0 ? null : num;
  };

  // 8. Validate status
  const normalizedStatus = String(status).toUpperCase();
  if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
    return { isValid: false, error: 'Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE.' };
  }

  const parseSetItems = (raw) => {
    if (raw === undefined || raw === null) return undefined;
    let list = raw;
    if (typeof raw === 'string') {
      try {
        list = JSON.parse(raw);
      } catch {
        return null;
      }
    }
    if (!Array.isArray(list)) return null;
    const validated = [];
    for (const it of list) {
      if (!it) continue;
      const id = parseInt(it.item_product_id || it.productId, 10);
      const qty = parseInt(it.quantity, 10);
      if (isNaN(id) || id <= 0) return null;
      if (isNaN(qty) || qty <= 0) return null;
      validated.push({ item_product_id: id, quantity: qty });
    }
    return validated;
  };

  const parsedSetItems = parseSetItems(set_items);
  if (parsedSetItems === null) {
    return { isValid: false, error: 'Danh sách sản phẩm con trong bộ không hợp lệ.' };
  }

  const value = {
    product_code: normalizedCode,
    product_name: trimmedName,
    category_id: catId,
    room_id: rId,
    material_id: matId,
    color_id: colId,
    product_type: normalizedType,
    price: numPrice,
    stock_quantity: numStock,
    length_cm: parseDimension(length_cm),
    width_cm: parseDimension(width_cm),
    height_cm: parseDimension(height_cm),
    description: description ? String(description).trim() : null,
    image_url: image_url || null,
    status: normalizedStatus,
  };

  if (parsedSetItems !== undefined) {
    value.set_items = parsedSetItems;
  }

  return {
    isValid: true,
    value,
  };
}

/**
 * Validate dữ liệu khi cập nhật sản phẩm
 */
function validateUpdateProductInput(data = {}) {
  const {
    product_name,
    category_id,
    room_id,
    material_id,
    color_id,
    product_type,
    price,
    stock_quantity,
    length_cm,
    width_cm,
    height_cm,
    description,
    image_url,
    status,
    set_items,
  } = data;

  const value = {};

  if (product_name !== undefined) {
    if (typeof product_name !== 'string' || product_name.trim().length === 0) {
      return { isValid: false, error: 'Tên sản phẩm không được để trống.' };
    }
    const trimmed = product_name.trim();
    if (trimmed.length < 2 || trimmed.length > 200) {
      return { isValid: false, error: 'Tên sản phẩm phải từ 2 đến 200 ký tự.' };
    }
    value.product_name = trimmed;
  }

  if (category_id !== undefined) {
    const id = parseInt(category_id, 10);
    if (isNaN(id) || id <= 0) return { isValid: false, error: 'Danh mục sản phẩm không hợp lệ.' };
    value.category_id = id;
  }

  if (room_id !== undefined) {
    const id = parseInt(room_id, 10);
    if (isNaN(id) || id <= 0) return { isValid: false, error: 'Không gian phòng không hợp lệ.' };
    value.room_id = id;
  }

  if (material_id !== undefined) {
    const id = parseInt(material_id, 10);
    if (isNaN(id) || id <= 0) return { isValid: false, error: 'Chất liệu không hợp lệ.' };
    value.material_id = id;
  }

  if (color_id !== undefined) {
    const id = parseInt(color_id, 10);
    if (isNaN(id) || id <= 0) return { isValid: false, error: 'Màu sắc không hợp lệ.' };
    value.color_id = id;
  }

  if (product_type !== undefined) {
    const normalizedType = String(product_type).toUpperCase();
    if (!['SINGLE', 'SET'].includes(normalizedType)) {
      return { isValid: false, error: 'Loại sản phẩm phải là SINGLE hoặc SET.' };
    }
    value.product_type = normalizedType;
  }

  if (price !== undefined) {
    const numPrice = parseInt(price, 10);
    if (isNaN(numPrice) || numPrice < 0) {
      return { isValid: false, error: 'Giá sản phẩm phải là số nguyên không âm.' };
    }
    value.price = numPrice;
  }

  if (stock_quantity !== undefined) {
    const numStock = parseInt(stock_quantity, 10);
    if (isNaN(numStock) || numStock < 0) {
      return { isValid: false, error: 'Số lượng tồn kho phải là số nguyên không âm.' };
    }
    value.stock_quantity = numStock;
  }

  const parseDimension = (val) => {
    if (val === undefined || val === null || String(val).trim() === '') return null;
    const num = parseInt(val, 10);
    return isNaN(num) || num < 0 ? null : num;
  };

  if (length_cm !== undefined) value.length_cm = parseDimension(length_cm);
  if (width_cm !== undefined) value.width_cm = parseDimension(width_cm);
  if (height_cm !== undefined) value.height_cm = parseDimension(height_cm);

  if (description !== undefined) {
    value.description = description ? String(description).trim() : null;
  }

  if (image_url !== undefined) {
    value.image_url = image_url;
  }

  if (status !== undefined) {
    const normalizedStatus = String(status).toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
      return { isValid: false, error: 'Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE.' };
    }
    value.status = normalizedStatus;
  }

  if (set_items !== undefined) {
    let list = set_items;
    if (typeof set_items === 'string') {
      try {
        list = JSON.parse(set_items);
      } catch {
        return { isValid: false, error: 'Danh sách sản phẩm con trong bộ không hợp lệ.' };
      }
    }
    if (!Array.isArray(list)) {
      return { isValid: false, error: 'Danh sách sản phẩm con phải là một mảng.' };
    }
    const validated = [];
    for (const it of list) {
      if (!it) continue;
      const id = parseInt(it.item_product_id || it.productId, 10);
      const qty = parseInt(it.quantity, 10);
      if (isNaN(id) || id <= 0) {
        return { isValid: false, error: 'Mã sản phẩm con trong bộ không hợp lệ.' };
      }
      if (isNaN(qty) || qty <= 0) {
        return { isValid: false, error: 'Số lượng sản phẩm con trong bộ phải lớn hơn 0.' };
      }
      validated.push({ item_product_id: id, quantity: qty });
    }
    value.set_items = validated;
  }

  return { isValid: true, value };
}

/**
 * Validate query params cho tìm kiếm và phân trang sản phẩm
 */
function validateProductQueryParams(query = {}) {
  const {
    search,
    category_id,
    room_id,
    material_id,
    color_id,
    product_type,
    status,
    stock_status,
    page = 1,
    limit = 10,
    include_children,
    sort,
  } = query;

  const includeChildrenBool =
    include_children === 'true' ||
    include_children === true ||
    include_children === '1';

  return {
    search: search ? String(search).trim() : undefined,
    category_id: category_id && category_id !== 'ALL' ? parseInt(category_id, 10) : undefined,
    room_id: room_id && room_id !== 'ALL' ? parseInt(room_id, 10) : undefined,
    material_id: material_id && material_id !== 'ALL' ? parseInt(material_id, 10) : undefined,
    color_id: color_id && color_id !== 'ALL' ? parseInt(color_id, 10) : undefined,
    product_type: product_type && product_type !== 'ALL' ? String(product_type).toUpperCase() : undefined,
    status: status && status !== 'ALL' ? String(status).toUpperCase() : undefined,
    stock_status: stock_status && stock_status !== 'ALL' ? String(stock_status).toUpperCase() : undefined,
    include_children: includeChildrenBool,
    sort: sort ? String(sort).toLowerCase() : undefined,
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
  };
}

/**
 * Chuẩn hóa output DTO trả về cho client
 */
function toProductDTO(product) {
  if (!product) return null;
  const raw = typeof product.toJSON === 'function' ? product.toJSON() : product;

  const setItems = (raw.setItems || []).map((si) => {
    const item = typeof si.toJSON === 'function' ? si.toJSON() : si;
    const prod = item.itemProduct || {};
    const dim = [prod.length_cm, prod.width_cm, prod.height_cm].filter(Boolean).join(' x ');
    return {
      setItemId: item.set_item_id,
      productId: item.item_product_id,
      productCode: prod.product_code,
      productName: prod.product_name,
      quantity: item.quantity,
      unitPrice: prod.price,
      imageUrl: prod.image_url,
      stockQuantity: prod.stock_quantity,
      dimensions: dim ? `${dim} cm` : null,
      status: prod.status || 'ACTIVE',
    };
  });

  const inSets = (raw.inSets || []).map((is) => {
    const item = typeof is.toJSON === 'function' ? is.toJSON() : is;
    const parent = item.parentSet || {};
    return {
      setId: item.set_product_id,
      setCode: parent.product_code,
      setName: parent.product_name,
      quantity: item.quantity,
    };
  });

  const totalSetItems = setItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  return {
    productId: raw.product_id,
    productCode: raw.product_code,
    productName: raw.product_name,
    productType: raw.product_type,
    isSet: raw.product_type === 'SET',
    isPartOfSet: inSets.length > 0,
    inSets,
    setItems,
    totalSetItems,
    price: raw.price,
    stockQuantity: raw.stock_quantity,
    dimensions: {
      lengthCm: raw.length_cm,
      widthCm: raw.width_cm,
      heightCm: raw.height_cm,
      formatted: [raw.length_cm, raw.width_cm, raw.height_cm].filter(Boolean).join(' x ')
        ? `${[raw.length_cm, raw.width_cm, raw.height_cm].filter(Boolean).join(' x ')} cm`
        : null,
    },
    imageUrl: raw.image_url,
    description: raw.description,
    status: raw.status,
    categoryId: raw.category_id,
    categoryName: raw.category?.category_name || null,
    roomId: raw.room_id,
    roomName: raw.room?.room_name || null,
    materialId: raw.material_id,
    materialName: raw.material?.material_name || null,
    colorId: raw.color_id,
    colorName: raw.color?.color_name || null,
    colorHex: raw.color?.hex_value || null,
    createdAt: raw.createdate,
    updatedAt: raw.modifiedate,
  };
}

/**
 * Validate input khi tạo mới chất liệu
 */
function validateCreateMaterialInput(data = {}) {
  const { material_name, material_code, description } = data;
  if (!material_name || typeof material_name !== 'string' || !material_name.trim()) {
    return { isValid: false, error: 'Tên chất liệu là bắt buộc và không được để trống.' };
  }
  const trimmedName = material_name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return { isValid: false, error: 'Tên chất liệu phải từ 2 đến 100 ký tự.' };
  }

  let normalizedCode = null;
  if (material_code !== undefined && material_code !== null && String(material_code).trim() !== '') {
    const trimmedCode = String(material_code).trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{2,50}$/.test(trimmedCode)) {
      return { isValid: false, error: 'Mã chất liệu chỉ được chứa chữ cái, số, dấu gạch nối và từ 2 đến 50 ký tự.' };
    }
    normalizedCode = trimmedCode;
  }

  return {
    isValid: true,
    value: {
      material_name: trimmedName,
      material_code: normalizedCode,
      description: description ? String(description).trim().slice(0, 255) : null,
    },
  };
}

/**
 * Validate input khi tạo mới màu sắc
 */
function validateCreateColorInput(data = {}) {
  const { color_name, color_code, hex_value } = data;
  if (!color_name || typeof color_name !== 'string' || !color_name.trim()) {
    return { isValid: false, error: 'Tên màu sắc là bắt buộc và không được để trống.' };
  }
  const trimmedName = color_name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return { isValid: false, error: 'Tên màu sắc phải từ 2 đến 100 ký tự.' };
  }

  let normalizedCode = null;
  if (color_code !== undefined && color_code !== null && String(color_code).trim() !== '') {
    const trimmedCode = String(color_code).trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{2,50}$/.test(trimmedCode)) {
      return { isValid: false, error: 'Mã màu sắc chỉ được chứa chữ cái, số, dấu gạch nối và từ 2 đến 50 ký tự.' };
    }
    normalizedCode = trimmedCode;
  }

  let normalizedHex = null;
  if (hex_value !== undefined && hex_value !== null && String(hex_value).trim() !== '') {
    const trimmedHex = String(hex_value).trim();
    if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmedHex)) {
      return { isValid: false, error: 'Mã màu Hex không hợp lệ (ví dụ: #FFFFFF hoặc #FFF).' };
    }
    normalizedHex = trimmedHex.toUpperCase();
  }

  return {
    isValid: true,
    value: {
      color_name: trimmedName,
      color_code: normalizedCode,
      hex_value: normalizedHex,
    },
  };
}

module.exports = {
  validateCreateProductInput,
  validateUpdateProductInput,
  validateProductQueryParams,
  validateCreateMaterialInput,
  validateCreateColorInput,
  toProductDTO,
};

