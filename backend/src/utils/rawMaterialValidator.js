// =========================================================
// rawMaterialValidator.js
// DTO & Validation utilities cho Nguyên vật liệu (Raw Material)
// =========================================================

const RAW_CODE_REGEX = /^[A-Za-z0-9_-]{2,50}$/;

/**
 * Validate dữ liệu đầu vào khi tạo mới nguyên vật liệu
 */
function validateCreateRawMaterialInput(data = {}) {
  const {
    raw_code,
    raw_name,
    material_id,
    unit,
    quantity_on_hand = 0,
    min_quantity = 0,
    description,
    status = 'ACTIVE',
  } = data;

  // 1. Validate raw_code
  let normalizedCode = null;
  if (raw_code !== undefined && raw_code !== null && String(raw_code).trim() !== '') {
    const trimmedCode = String(raw_code).trim().toUpperCase();
    if (!RAW_CODE_REGEX.test(trimmedCode)) {
      return {
        isValid: false,
        error: 'Mã nguyên vật liệu chỉ được chứa chữ cái, số, dấu gạch ngang (-), gạch dưới (_) và từ 2 đến 50 ký tự.',
      };
    }
    normalizedCode = trimmedCode;
  }

  // 2. Validate raw_name
  if (!raw_name || typeof raw_name !== 'string' || raw_name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Tên nguyên vật liệu là bắt buộc và không được để trống.',
    };
  }
  const trimmedName = raw_name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 200) {
    return {
      isValid: false,
      error: 'Tên nguyên vật liệu phải từ 2 đến 200 ký tự.',
    };
  }

  // 3. Validate material_id (optional)
  let validMaterialId = null;
  if (material_id !== undefined && material_id !== null && String(material_id).trim() !== '') {
    const parsedId = parseInt(material_id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      return { isValid: false, error: 'Chất liệu liên kết không hợp lệ.' };
    }
    validMaterialId = parsedId;
  }

  // 4. Validate unit
  if (!unit || typeof unit !== 'string' || unit.trim().length === 0) {
    return {
      isValid: false,
      error: 'Đơn vị tính là bắt buộc (ví dụ: BOARD, M2, KG, L, PCS...).',
    };
  }
  const trimmedUnit = unit.trim().toUpperCase();
  if (trimmedUnit.length > 20) {
    return { isValid: false, error: 'Đơn vị tính không được vượt quá 20 ký tự.' };
  }

  // 5. Validate quantity_on_hand & min_quantity
  const numQty = parseInt(quantity_on_hand, 10);
  if (isNaN(numQty) || numQty < 0) {
    return { isValid: false, error: 'Số lượng tồn kho phải là số nguyên không âm.' };
  }

  const numMin = parseInt(min_quantity, 10);
  if (isNaN(numMin) || numMin < 0) {
    return { isValid: false, error: 'Định mức tồn tối thiểu phải là số nguyên không âm.' };
  }

  // 6. Validate status
  const normalizedStatus = String(status).toUpperCase();
  if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
    return { isValid: false, error: 'Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE.' };
  }

  return {
    isValid: true,
    value: {
      raw_code: normalizedCode,
      raw_name: trimmedName,
      material_id: validMaterialId,
      unit: trimmedUnit,
      quantity_on_hand: numQty,
      min_quantity: numMin,
      description: description ? String(description).trim() : null,
      status: normalizedStatus,
    },
  };
}

/**
 * Validate dữ liệu khi cập nhật nguyên vật liệu
 */
function validateUpdateRawMaterialInput(data = {}) {
  const {
    raw_name,
    material_id,
    unit,
    quantity_on_hand,
    min_quantity,
    description,
    status,
  } = data;

  const value = {};

  if (raw_name !== undefined) {
    if (typeof raw_name !== 'string' || raw_name.trim().length === 0) {
      return { isValid: false, error: 'Tên nguyên vật liệu không được để trống.' };
    }
    const trimmed = raw_name.trim();
    if (trimmed.length < 2 || trimmed.length > 200) {
      return { isValid: false, error: 'Tên nguyên vật liệu phải từ 2 đến 200 ký tự.' };
    }
    value.raw_name = trimmed;
  }

  if (material_id !== undefined) {
    if (material_id === null || String(material_id).trim() === '') {
      value.material_id = null;
    } else {
      const parsedId = parseInt(material_id, 10);
      if (isNaN(parsedId) || parsedId <= 0) {
        return { isValid: false, error: 'Chất liệu liên kết không hợp lệ.' };
      }
      value.material_id = parsedId;
    }
  }

  if (unit !== undefined) {
    if (typeof unit !== 'string' || unit.trim().length === 0) {
      return { isValid: false, error: 'Đơn vị tính không được để trống.' };
    }
    const trimmedUnit = unit.trim().toUpperCase();
    if (trimmedUnit.length > 20) {
      return { isValid: false, error: 'Đơn vị tính không được vượt quá 20 ký tự.' };
    }
    value.unit = trimmedUnit;
  }

  if (quantity_on_hand !== undefined) {
    const numQty = parseInt(quantity_on_hand, 10);
    if (isNaN(numQty) || numQty < 0) {
      return { isValid: false, error: 'Số lượng tồn kho phải là số nguyên không âm.' };
    }
    value.quantity_on_hand = numQty;
  }

  if (min_quantity !== undefined) {
    const numMin = parseInt(min_quantity, 10);
    if (isNaN(numMin) || numMin < 0) {
      return { isValid: false, error: 'Định mức tồn tối thiểu phải là số nguyên không âm.' };
    }
    value.min_quantity = numMin;
  }

  if (description !== undefined) {
    value.description = description ? String(description).trim() : null;
  }

  if (status !== undefined) {
    const normalizedStatus = String(status).toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
      return { isValid: false, error: 'Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE.' };
    }
    value.status = normalizedStatus;
  }

  return { isValid: true, value };
}

/**
 * Validate query params cho tìm kiếm và phân trang nguyên vật liệu
 */
function validateRawMaterialQueryParams(query = {}) {
  const {
    search,
    material_id,
    status,
    stock_status,
    page = 1,
    limit = 10,
  } = query;

  return {
    search: search ? String(search).trim() : undefined,
    material_id: material_id && material_id !== 'ALL' ? parseInt(material_id, 10) : undefined,
    status: status && status !== 'ALL' ? String(status).toUpperCase() : undefined,
    stock_status: stock_status && stock_status !== 'ALL' ? String(stock_status).toUpperCase() : undefined,
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
  };
}

/**
 * Chuẩn hóa output DTO trả về cho client
 */
function toRawMaterialDTO(mat) {
  if (!mat) return null;
  const raw = typeof mat.toJSON === 'function' ? mat.toJSON() : mat;

  const qty = raw.quantity_on_hand ?? 0;
  const min = raw.min_quantity ?? 0;
  const isLowStock = qty <= min;

  return {
    rawMaterialId: raw.raw_material_id,
    rawCode: raw.raw_code,
    rawName: raw.raw_name,
    materialId: raw.material_id,
    materialName: raw.material?.material_name || null,
    materialCode: raw.material?.material_code || null,
    unit: raw.unit,
    quantityOnHand: qty,
    minQuantity: min,
    isLowStock,
    description: raw.description,
    status: raw.status,
    createdAt: raw.createdate,
    updatedAt: raw.modifiedate,
  };
}

module.exports = {
  validateCreateRawMaterialInput,
  validateUpdateRawMaterialInput,
  validateRawMaterialQueryParams,
  toRawMaterialDTO,
};
