// =========================================================
// supplierValidator.js
// DTO Validation & Transformation cho Supplier (Nhà cung cấp)
// =========================================================

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const CODE_REGEX = /^[A-Za-z0-9_-]{1,50}$/;

/**
 * Validate dữ liệu tạo mới nhà cung cấp (Create Supplier DTO)
 * @param {object} payload
 * @returns {{ isValid: boolean, error?: string, value?: object }}
 */
function validateCreateSupplierInput(payload = {}) {
  const { supplier_code, supplier_name, phone_number, address, note, status } = payload;

  // 1. Kiểm tra supplier_code (tùy chọn; nếu để trống hệ thống sẽ tự động sinh mã)
  let cleanCode = null;
  if (supplier_code !== undefined && supplier_code !== null && typeof supplier_code === 'string' && supplier_code.trim() !== '') {
    const trimmed = supplier_code.trim();
    if (trimmed.length > 50) {
      return { isValid: false, error: 'Mã nhà cung cấp không được vượt quá 50 ký tự' };
    }
    if (!CODE_REGEX.test(trimmed)) {
      return {
        isValid: false,
        error: 'Mã nhà cung cấp chỉ được chứa chữ cái, số, dấu gạch nối (-) hoặc gạch dưới (_)',
      };
    }
    cleanCode = trimmed.toUpperCase();
  } else if (supplier_code !== undefined && supplier_code !== null && typeof supplier_code !== 'string') {
    return { isValid: false, error: 'Mã nhà cung cấp không hợp lệ' };
  }

  // 2. Kiểm tra supplier_name
  if (typeof supplier_name !== 'string' || !supplier_name.trim()) {
    return { isValid: false, error: 'Tên nhà cung cấp là bắt buộc' };
  }
  const cleanName = supplier_name.trim();
  if (cleanName.length > 200) {
    return { isValid: false, error: 'Tên nhà cung cấp không được vượt quá 200 ký tự' };
  }

  // 3. Kiểm tra phone_number (tùy chọn)
  let cleanPhone = null;
  if (phone_number !== undefined && phone_number !== null && phone_number !== '') {
    if (typeof phone_number !== 'string' || !PHONE_REGEX.test(phone_number.trim())) {
      return { isValid: false, error: 'Số điện thoại không hợp lệ (độ dài 7-20 ký tự số)' };
    }
    cleanPhone = phone_number.trim();
  }

  // 4. Kiểm tra address (tùy chọn)
  let cleanAddress = null;
  if (address !== undefined && address !== null && address !== '') {
    if (typeof address !== 'string' || address.trim().length > 255) {
      return { isValid: false, error: 'Địa chỉ không được vượt quá 255 ký tự' };
    }
    cleanAddress = address.trim();
  }

  // 5. Kiểm tra note (tùy chọn)
  let cleanNote = null;
  if (note !== undefined && note !== null && note !== '') {
    if (typeof note !== 'string' || note.trim().length > 255) {
      return { isValid: false, error: 'Ghi chú không được vượt quá 255 ký tự' };
    }
    cleanNote = note.trim();
  }

  // 6. Kiểm tra status (mặc định ACTIVE)
  let cleanStatus = 'ACTIVE';
  if (status !== undefined && status !== null && status !== '') {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return { isValid: false, error: 'Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE' };
    }
    cleanStatus = status;
  }

  return {
    isValid: true,
    value: {
      supplier_code: cleanCode ? cleanCode.toUpperCase() : null,
      supplier_name: cleanName,
      phone_number: cleanPhone,
      address: cleanAddress,
      note: cleanNote,
      status: cleanStatus,
    },
  };
}

/**
 * Validate dữ liệu cập nhật nhà cung cấp (Update Supplier DTO)
 * Lưu ý: Không cho phép đổi supplier_code
 * @param {object} payload
 * @returns {{ isValid: boolean, error?: string, value?: object }}
 */
function validateUpdateSupplierInput(payload = {}) {
  const { supplier_code, supplier_name, phone_number, address, note, status } = payload;
  const result = {};

  // Cấm cập nhật supplier_code
  if (supplier_code !== undefined && supplier_code !== null) {
    return {
      isValid: false,
      error: 'Không được phép thay đổi mã nhà cung cấp (supplier_code)',
    };
  }

  // Validate supplier_name nếu có truyền
  if (supplier_name !== undefined) {
    if (typeof supplier_name !== 'string' || !supplier_name.trim()) {
      return { isValid: false, error: 'Tên nhà cung cấp không được để trống' };
    }
    const cleanName = supplier_name.trim();
    if (cleanName.length > 200) {
      return { isValid: false, error: 'Tên nhà cung cấp không được vượt quá 200 ký tự' };
    }
    result.supplier_name = cleanName;
  }

  // Validate phone_number nếu có truyền
  if (phone_number !== undefined) {
    if (phone_number === null || phone_number === '') {
      result.phone_number = null;
    } else {
      if (typeof phone_number !== 'string' || !PHONE_REGEX.test(phone_number.trim())) {
        return { isValid: false, error: 'Số điện thoại không hợp lệ (độ dài 7-20 ký tự số)' };
      }
      result.phone_number = phone_number.trim();
    }
  }

  // Validate address nếu có truyền
  if (address !== undefined) {
    if (address === null || address === '') {
      result.address = null;
    } else {
      if (typeof address !== 'string' || address.trim().length > 255) {
        return { isValid: false, error: 'Địa chỉ không được vượt quá 255 ký tự' };
      }
      result.address = address.trim();
    }
  }

  // Validate note nếu có truyền
  if (note !== undefined) {
    if (note === null || note === '') {
      result.note = null;
    } else {
      if (typeof note !== 'string' || note.trim().length > 255) {
        return { isValid: false, error: 'Ghi chú không được vượt quá 255 ký tự' };
      }
      result.note = note.trim();
    }
  }

  // Validate status nếu có truyền
  if (status !== undefined) {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return { isValid: false, error: 'Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE' };
    }
    result.status = status;
  }

  return {
    isValid: true,
    value: result,
  };
}

/**
 * Validate query params cho tìm kiếm và phân trang
 */
function validateSupplierQueryParams(query = {}) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  let status = 'ALL';
  if (typeof query.status === 'string') {
    const normalized = query.status.trim().toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'INACTIVE') {
      status = normalized;
    }
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));

  return {
    search,
    status,
    page,
    limit,
  };
}

/**
 * DTO format response chuẩn cho 1 nhà cung cấp
 */
function toSupplierDTO(supplier) {
  if (!supplier) return null;
  return {
    supplier_id: supplier.supplier_id,
    supplier_code: supplier.supplier_code,
    supplier_name: supplier.supplier_name,
    phone_number: supplier.phone_number || null,
    address: supplier.address || null,
    note: supplier.note || null,
    status: supplier.status,
    createdate: supplier.createdate,
    modifiedate: supplier.modifiedate,
    createby: supplier.createby || null,
    modifieby: supplier.modifieby || null,
  };
}

/**
 * DTO format response chi tiết kèm lịch sử phiếu nhập kho
 */
function toSupplierDetailDTO(supplier) {
  if (!supplier) return null;
  const base = toSupplierDTO(supplier);
  const receipts = supplier.materialReceiptSupplierIdRecords || [];
  return {
    ...base,
    materialReceipts: receipts.map((r) => ({
      receipt_id: r.receipt_id,
      receipt_code: r.receipt_code,
      receipt_date: r.receipt_date,
      total_amount: r.total_amount,
      status: r.status,
      received_by: r.received_by,
      note: r.note,
      createdate: r.createdate,
    })),
    totalReceipts: receipts.length,
  };
}

module.exports = {
  validateCreateSupplierInput,
  validateUpdateSupplierInput,
  validateSupplierQueryParams,
  toSupplierDTO,
  toSupplierDetailDTO,
};
