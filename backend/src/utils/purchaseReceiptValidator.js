// =========================================================
// purchaseReceiptValidator.js
// DTO & Validation utilities cho Phiếu nhập kho (Purchase Receipts)
// =========================================================

const RECEIPT_CODE_REGEX = /^[A-Za-z0-9_-]{2,30}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate dữ liệu đầu vào khi tạo mới phiếu nhập
 */
function validateCreateReceiptInput(data = {}) {
  const {
    receipt_code,
    supplier_id,
    receipt_date,
    status = 'DRAFT',
    received_by,
    note,
    items,
  } = data;

  // 1. Validate supplier_id
  const supplierIdNum = Number(supplier_id);
  if (!supplierIdNum || isNaN(supplierIdNum) || supplierIdNum <= 0) {
    return {
      isValid: false,
      error: 'Vui lòng chọn nhà cung cấp hợp lệ.',
    };
  }

  // 2. Validate receipt_date
  if (!receipt_date || typeof receipt_date !== 'string' || !DATE_REGEX.test(receipt_date.trim())) {
    return {
      isValid: false,
      error: 'Ngày nhập kho không hợp lệ. Định dạng yêu cầu là YYYY-MM-DD.',
    };
  }
  const dateObj = new Date(receipt_date.trim());
  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      error: 'Ngày nhập kho không phải là ngày hợp lệ.',
    };
  }

  // 3. Validate receipt_code (nếu người dùng tự nhập)
  let normalizedCode = null;
  if (receipt_code !== undefined && receipt_code !== null && String(receipt_code).trim() !== '') {
    const trimmedCode = String(receipt_code).trim().toUpperCase();
    if (!RECEIPT_CODE_REGEX.test(trimmedCode)) {
      return {
        isValid: false,
        error: 'Mã phiếu nhập chỉ gồm chữ cái, số, gạch ngang (-), gạch dưới (_) và từ 2 đến 30 ký tự.',
      };
    }
    normalizedCode = trimmedCode;
  }

  // 4. Validate status
  const normalizedStatus = String(status || 'DRAFT').toUpperCase();
  if (!['DRAFT', 'CONFIRMED'].includes(normalizedStatus)) {
    return {
      isValid: false,
      error: 'Trạng thái khi tạo mới chỉ có thể là DRAFT (Lưu nháp) hoặc CONFIRMED (Xác nhận nhập kho).',
    };
  }

  // 5. Validate received_by (optional)
  let validReceivedBy = null;
  if (received_by !== undefined && received_by !== null && String(received_by).trim() !== '') {
    const parsed = Number(received_by);
    if (isNaN(parsed) || parsed <= 0) {
      return { isValid: false, error: 'Người nhận kho không hợp lệ.' };
    }
    validReceivedBy = parsed;
  }

  // 6. Validate note (optional)
  let trimmedNote = null;
  if (note !== undefined && note !== null && String(note).trim() !== '') {
    trimmedNote = String(note).trim();
    if (trimmedNote.length > 500) {
      return { isValid: false, error: 'Ghi chú không được vượt quá 500 ký tự.' };
    }
  }

  // 7. Validate items
  if (!Array.isArray(items) || items.length === 0) {
    return {
      isValid: false,
      error: 'Phiếu nhập phải có ít nhất 1 mặt hàng nguyên vật liệu.',
    };
  }

  const validatedItems = [];
  const seenRawIds = new Set();

  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    const rawId = Number(row.raw_material_id);
    if (!rawId || isNaN(rawId) || rawId <= 0) {
      return {
        isValid: false,
        error: `Mặt hàng tại dòng ${i + 1}: Vui lòng chọn nguyên vật liệu hợp lệ.`,
      };
    }

    if (seenRawIds.has(rawId)) {
      return {
        isValid: false,
        error: `Mặt hàng tại dòng ${i + 1}: Nguyên vật liệu bị trùng lặp. Mỗi loại chỉ được xuất hiện một lần trong một phiếu nhập.`,
      };
    }
    seenRawIds.add(rawId);

    const qty = parseInt(row.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return {
        isValid: false,
        error: `Mặt hàng tại dòng ${i + 1}: Số lượng nhập phải là số nguyên dương lớn hơn 0.`,
      };
    }

    const price = parseInt(row.unit_price, 10);
    if (isNaN(price) || price < 0) {
      return {
        isValid: false,
        error: `Mặt hàng tại dòng ${i + 1}: Đơn giá nhập phải là số nguyên không âm.`,
      };
    }

    let itemNote = null;
    if (row.note !== undefined && row.note !== null && String(row.note).trim() !== '') {
      itemNote = String(row.note).trim();
      if (itemNote.length > 255) {
        return {
          isValid: false,
          error: `Mặt hàng tại dòng ${i + 1}: Ghi chú không được vượt quá 255 ký tự.`,
        };
      }
    }

    validatedItems.push({
      raw_material_id: rawId,
      quantity: qty,
      unit_price: price,
      note: itemNote,
    });
  }

  return {
    isValid: true,
    value: {
      receipt_code: normalizedCode,
      supplier_id: supplierIdNum,
      receipt_date: receipt_date.trim(),
      status: normalizedStatus,
      received_by: validReceivedBy,
      note: trimmedNote,
      items: validatedItems,
    },
  };
}

/**
 * Validate dữ liệu đầu vào khi cập nhật phiếu nhập
 */
function validateUpdateReceiptInput(data = {}) {
  const {
    supplier_id,
    receipt_date,
    status,
    received_by,
    note,
    items,
  } = data;

  const result = {};

  // 1. supplier_id (optional on update)
  if (supplier_id !== undefined && supplier_id !== null) {
    const sId = Number(supplier_id);
    if (isNaN(sId) || sId <= 0) {
      return { isValid: false, error: 'ID nhà cung cấp không hợp lệ.' };
    }
    result.supplier_id = sId;
  }

  // 2. receipt_date (optional)
  if (receipt_date !== undefined && receipt_date !== null) {
    if (typeof receipt_date !== 'string' || !DATE_REGEX.test(receipt_date.trim())) {
      return { isValid: false, error: 'Ngày nhập kho không hợp lệ (YYYY-MM-DD).' };
    }
    result.receipt_date = receipt_date.trim();
  }

  // 3. status (optional)
  if (status !== undefined && status !== null) {
    const norm = String(status).toUpperCase();
    if (!['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(norm)) {
      return {
        isValid: false,
        error: 'Trạng thái không hợp lệ. Chỉ chấp nhận DRAFT, CONFIRMED hoặc CANCELLED.',
      };
    }
    result.status = norm;
  }

  // 4. received_by (optional)
  if (received_by !== undefined) {
    if (received_by === null || String(received_by).trim() === '') {
      result.received_by = null;
    } else {
      const rId = Number(received_by);
      if (isNaN(rId) || rId <= 0) {
        return { isValid: false, error: 'Người nhận kho không hợp lệ.' };
      }
      result.received_by = rId;
    }
  }

  // 5. note (optional)
  if (note !== undefined) {
    if (note === null || String(note).trim() === '') {
      result.note = null;
    } else {
      const trimmed = String(note).trim();
      if (trimmed.length > 500) {
        return { isValid: false, error: 'Ghi chú không được vượt quá 500 ký tự.' };
      }
      result.note = trimmed;
    }
  }

  // 6. items (optional)
  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        isValid: false,
        error: 'Danh sách mặt hàng không được để trống.',
      };
    }

    const validatedItems = [];
    const seenRawIds = new Set();

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rawId = Number(row.raw_material_id);
      if (!rawId || isNaN(rawId) || rawId <= 0) {
        return {
          isValid: false,
          error: `Mặt hàng tại dòng ${i + 1}: Vui lòng chọn nguyên vật liệu hợp lệ.`,
        };
      }

      if (seenRawIds.has(rawId)) {
        return {
          isValid: false,
          error: `Mặt hàng tại dòng ${i + 1}: Nguyên vật liệu bị trùng lặp trong phiếu nhập.`,
        };
      }
      seenRawIds.add(rawId);

      const qty = parseInt(row.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return {
          isValid: false,
          error: `Mặt hàng tại dòng ${i + 1}: Số lượng nhập phải là số nguyên dương > 0.`,
        };
      }

      const price = parseInt(row.unit_price, 10);
      if (isNaN(price) || price < 0) {
        return {
          isValid: false,
          error: `Mặt hàng tại dòng ${i + 1}: Đơn giá nhập phải là số nguyên không âm.`,
        };
      }

      let itemNote = null;
      if (row.note !== undefined && row.note !== null && String(row.note).trim() !== '') {
        itemNote = String(row.note).trim();
        if (itemNote.length > 255) {
          return {
            isValid: false,
            error: `Mặt hàng tại dòng ${i + 1}: Ghi chú không được vượt quá 255 ký tự.`,
          };
        }
      }

      validatedItems.push({
        raw_material_id: rawId,
        quantity: qty,
        unit_price: price,
        note: itemNote,
      });
    }

    result.items = validatedItems;
  }

  return {
    isValid: true,
    value: result,
  };
}

/**
 * Validate query params khi tìm kiếm, phân trang
 */
function validateReceiptQueryParams(query = {}) {
  const { search, status, supplier_id, from_date, to_date, page = 1, limit = 10 } = query;

  const validStatus = ['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(String(status).toUpperCase())
    ? String(status).toUpperCase()
    : 'ALL';

  let validSupplierId = 'ALL';
  if (supplier_id && supplier_id !== 'ALL') {
    const sId = Number(supplier_id);
    if (!isNaN(sId) && sId > 0) {
      validSupplierId = sId;
    }
  }

  let validFromDate = null;
  if (from_date && typeof from_date === 'string' && DATE_REGEX.test(from_date.trim())) {
    validFromDate = from_date.trim();
  }

  let validToDate = null;
  if (to_date && typeof to_date === 'string' && DATE_REGEX.test(to_date.trim())) {
    validToDate = to_date.trim();
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  return {
    search: search ? String(search).trim() : null,
    status: validStatus,
    supplier_id: validSupplierId,
    from_date: validFromDate,
    to_date: validToDate,
    page: pageNum,
    limit: limitNum,
  };
}

/**
 * Chuyển đổi dữ liệu model sang DTO trả về cho bảng danh sách
 */
function toReceiptDTO(receipt) {
  if (!receipt) return null;
  const raw = receipt.toJSON ? receipt.toJSON() : receipt;

  const items = raw.items || [];
  const itemsCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    receipt_id: Number(raw.receipt_id),
    receipt_code: raw.receipt_code,
    supplier_id: raw.supplier_id ? Number(raw.supplier_id) : null,
    supplier_name: raw.supplier?.supplier_name || 'N/A',
    supplier_code: raw.supplier?.supplier_code || 'N/A',
    receipt_date: raw.receipt_date,
    total_amount: Number(raw.total_amount || 0),
    status: raw.status,
    received_by: raw.received_by ? Number(raw.received_by) : null,
    receiver_name: raw.receiver?.full_name || 'N/A',
    note: raw.note,
    items_count: itemsCount,
    total_quantity: totalQuantity,
    createdate: raw.createdate,
    modifiedate: raw.modifiedate,
    createby: raw.createby,
    modifieby: raw.modifieby,
  };
}

/**
 * Chuyển đổi dữ liệu model sang DTO chi tiết đầy đủ để xem chi tiết / in phiếu
 */
function toReceiptDetailDTO(receipt) {
  if (!receipt) return null;
  const raw = receipt.toJSON ? receipt.toJSON() : receipt;

  const items = (raw.items || []).map((item, idx) => ({
    receipt_item_id: Number(item.receipt_item_id || idx + 1),
    receipt_id: Number(item.receipt_id),
    raw_material_id: Number(item.raw_material_id),
    raw_code: item.rawMaterial?.raw_code || 'N/A',
    raw_name: item.rawMaterial?.raw_name || 'N/A',
    unit: item.rawMaterial?.unit || 'N/A',
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    line_total: Number(item.quantity) * Number(item.unit_price),
    current_stock: item.rawMaterial ? Number(item.rawMaterial.quantity_on_hand) : null,
    note: item.note,
  }));

  return {
    receipt_id: Number(raw.receipt_id),
    receipt_code: raw.receipt_code,
    receipt_date: raw.receipt_date,
    total_amount: Number(raw.total_amount || 0),
    status: raw.status,
    note: raw.note,
    createdate: raw.createdate,
    modifiedate: raw.modifiedate,
    createby: raw.createby,
    modifieby: raw.modifieby,
    supplier: raw.supplier
      ? {
          supplier_id: Number(raw.supplier.supplier_id),
          supplier_code: raw.supplier.supplier_code,
          supplier_name: raw.supplier.supplier_name,
          phone_number: raw.supplier.phone_number,
          address: raw.supplier.address,
          status: raw.supplier.status,
        }
      : null,
    receiver: raw.receiver
      ? {
          user_account_id: Number(raw.receiver.user_account_id),
          full_name: raw.receiver.full_name,
          email: raw.receiver.email,
          phone_number: raw.receiver.phone_number,
        }
      : null,
    items,
    items_count: items.length,
    total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

module.exports = {
  validateCreateReceiptInput,
  validateUpdateReceiptInput,
  validateReceiptQueryParams,
  toReceiptDTO,
  toReceiptDetailDTO,
};
