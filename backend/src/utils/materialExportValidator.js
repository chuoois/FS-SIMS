// =========================================================
// materialExportValidator.js
// Utility & Validator cho Phiếu Xuất Kho Nguyên Vật Liệu (Material Export / Issue Slip)
// Hàm thuần túy (pure functions), dễ unit test độc lập
// =========================================================

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate dữ liệu đầu vào khi tạo mới phiếu xuất kho
 * @param {object} data
 */
function validateCreateExportInput(data = {}) {
  const {
    issue_code,
    production_id,
    issue_date,
    status = 'DRAFT',
    issued_by,
    note,
    items,
  } = data;

  // 1. Kiểm tra lệnh gia công (production_id)
  if (production_id === undefined || production_id === null || String(production_id).trim() === '') {
    return { isValid: false, error: 'Vui lòng chọn lệnh gia công cho phiếu xuất kho.' };
  }
  const pId = Number(production_id);
  if (isNaN(pId) || pId <= 0) {
    return { isValid: false, error: 'ID lệnh gia công không hợp lệ.' };
  }

  // 2. Kiểm tra ngày xuất kho (issue_date)
  if (!issue_date || typeof issue_date !== 'string' || !DATE_REGEX.test(issue_date.trim())) {
    return { isValid: false, error: 'Ngày xuất kho không hợp lệ. Định dạng yêu cầu là YYYY-MM-DD.' };
  }

  // 3. Kiểm tra trạng thái phiếu
  const validStatus = ['DRAFT', 'CONFIRMED'];
  const normStatus = String(status || 'DRAFT').toUpperCase();
  if (!validStatus.includes(normStatus)) {
    return { isValid: false, error: 'Trạng thái ban đầu chỉ có thể là DRAFT hoặc CONFIRMED.' };
  }

  // 4. Kiểm tra mã phiếu nhập tay (nếu có truyền lên)
  let cleanIssueCode = null;
  if (issue_code !== undefined && issue_code !== null && String(issue_code).trim() !== '') {
    const trimmed = String(issue_code).trim().toUpperCase();
    if (trimmed.length > 30) {
      return { isValid: false, error: 'Mã phiếu xuất kho không được vượt quá 30 ký tự.' };
    }
    cleanIssueCode = trimmed;
  }

  // 5. Kiểm tra người xuất kho (issued_by)
  let cleanIssuedBy = null;
  if (issued_by !== undefined && issued_by !== null && String(issued_by).trim() !== '') {
    const uId = Number(issued_by);
    if (isNaN(uId) || uId <= 0) {
      return { isValid: false, error: 'ID người xuất kho không hợp lệ.' };
    }
    cleanIssuedBy = uId;
  }

  // 6. Kiểm tra ghi chú
  let cleanNote = null;
  if (note !== undefined && note !== null && String(note).trim() !== '') {
    const trimmed = String(note).trim();
    if (trimmed.length > 500) {
      return { isValid: false, error: 'Ghi chú không được vượt quá 500 ký tự.' };
    }
    cleanNote = trimmed;
  }

  // 7. Kiểm tra danh sách nguyên vật liệu xuất kho
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'Phiếu xuất kho phải chứa ít nhất 1 loại nguyên vật liệu.' };
  }

  const validatedItems = [];
  const seenRawIds = new Set();

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const indexStr = `Dòng thứ ${i + 1}`;

    if (!it || typeof it !== 'object') {
      return { isValid: false, error: `${indexStr}: Dữ liệu mặt hàng không hợp lệ.` };
    }

    // raw_material_id
    if (it.raw_material_id === undefined || it.raw_material_id === null) {
      return { isValid: false, error: `${indexStr}: Vui lòng chọn nguyên vật liệu.` };
    }
    const rawId = Number(it.raw_material_id);
    if (isNaN(rawId) || rawId <= 0) {
      return { isValid: false, error: `${indexStr}: ID nguyên vật liệu không hợp lệ.` };
    }

    if (seenRawIds.has(rawId)) {
      return { isValid: false, error: `${indexStr}: Nguyên vật liệu bị trùng lặp trong phiếu xuất.` };
    }
    seenRawIds.add(rawId);

    // quantity
    if (it.quantity === undefined || it.quantity === null) {
      return { isValid: false, error: `${indexStr}: Vui lòng nhập số lượng xuất.` };
    }
    const qty = Number(it.quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return { isValid: false, error: `${indexStr}: Số lượng xuất phải là số nguyên dương lớn hơn 0.` };
    }

    // item note
    let itemNote = null;
    if (it.note !== undefined && it.note !== null && String(it.note).trim() !== '') {
      const trimmed = String(it.note).trim();
      if (trimmed.length > 255) {
        return { isValid: false, error: `${indexStr}: Ghi chú mặt hàng không được vượt quá 255 ký tự.` };
      }
      itemNote = trimmed;
    }

    validatedItems.push({
      raw_material_id: rawId,
      quantity: qty,
      note: itemNote,
    });
  }

  return {
    isValid: true,
    value: {
      issue_code: cleanIssueCode,
      production_id: pId,
      issue_date: issue_date.trim(),
      status: normStatus,
      issued_by: cleanIssuedBy,
      note: cleanNote,
      items: validatedItems,
    },
  };
}

/**
 * Validate dữ liệu đầu vào khi cập nhật phiếu xuất kho
 * @param {object} data
 */
function validateUpdateExportInput(data = {}) {
  const {
    production_id,
    issue_date,
    status,
    issued_by,
    note,
    items,
  } = data;

  const result = {};

  // 1. production_id
  if (production_id !== undefined && production_id !== null) {
    const pId = Number(production_id);
    if (isNaN(pId) || pId <= 0) {
      return { isValid: false, error: 'ID lệnh gia công không hợp lệ.' };
    }
    result.production_id = pId;
  }

  // 2. issue_date
  if (issue_date !== undefined && issue_date !== null) {
    if (typeof issue_date !== 'string' || !DATE_REGEX.test(issue_date.trim())) {
      return { isValid: false, error: 'Ngày xuất kho không hợp lệ (YYYY-MM-DD).' };
    }
    result.issue_date = issue_date.trim();
  }

  // 3. status
  if (status !== undefined && status !== null) {
    const norm = String(status).toUpperCase();
    if (!['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(norm)) {
      return { isValid: false, error: 'Trạng thái không hợp lệ. Chỉ chấp nhận DRAFT, CONFIRMED hoặc CANCELLED.' };
    }
    result.status = norm;
  }

  // 4. issued_by
  if (issued_by !== undefined) {
    if (issued_by === null || String(issued_by).trim() === '') {
      result.issued_by = null;
    } else {
      const uId = Number(issued_by);
      if (isNaN(uId) || uId <= 0) {
        return { isValid: false, error: 'ID người xuất kho không hợp lệ.' };
      }
      result.issued_by = uId;
    }
  }

  // 5. note
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

  // 6. items
  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0) {
      return { isValid: false, error: 'Danh sách nguyên vật liệu xuất kho không được để trống.' };
    }

    const validatedItems = [];
    const seenRawIds = new Set();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const indexStr = `Dòng thứ ${i + 1}`;

      if (!it || typeof it !== 'object') {
        return { isValid: false, error: `${indexStr}: Dữ liệu mặt hàng không hợp lệ.` };
      }

      if (it.raw_material_id === undefined || it.raw_material_id === null) {
        return { isValid: false, error: `${indexStr}: Vui lòng chọn nguyên vật liệu.` };
      }
      const rawId = Number(it.raw_material_id);
      if (isNaN(rawId) || rawId <= 0) {
        return { isValid: false, error: `${indexStr}: ID nguyên vật liệu không hợp lệ.` };
      }

      if (seenRawIds.has(rawId)) {
        return { isValid: false, error: `${indexStr}: Nguyên vật liệu bị trùng lặp trong phiếu xuất.` };
      }
      seenRawIds.add(rawId);

      if (it.quantity === undefined || it.quantity === null) {
        return { isValid: false, error: `${indexStr}: Vui lòng nhập số lượng xuất.` };
      }
      const qty = Number(it.quantity);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        return { isValid: false, error: `${indexStr}: Số lượng xuất phải là số nguyên dương lớn hơn 0.` };
      }

      let itemNote = null;
      if (it.note !== undefined && it.note !== null && String(it.note).trim() !== '') {
        const trimmed = String(it.note).trim();
        if (trimmed.length > 255) {
          return { isValid: false, error: `${indexStr}: Ghi chú mặt hàng không được vượt quá 255 ký tự.` };
        }
        itemNote = trimmed;
      }

      validatedItems.push({
        raw_material_id: rawId,
        quantity: qty,
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
 * Validate query parameters cho danh sách phiếu xuất kho
 */
function validateExportQueryParams(query = {}) {
  const {
    search,
    status,
    production_id,
    from_date,
    to_date,
    page = 1,
    limit = 10,
    sort_by = 'createdate',
    sort_dir = 'DESC',
  } = query;

  let pageNum = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;

  let limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
  if (limitNum > 100) limitNum = 100;

  const validStatus = ['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'];
  const normStatus = status ? String(status).toUpperCase() : 'ALL';
  const cleanStatus = validStatus.includes(normStatus) ? normStatus : 'ALL';

  let cleanProductionId = 'ALL';
  if (production_id && production_id !== 'ALL') {
    const pId = Number(production_id);
    if (!isNaN(pId) && pId > 0) {
      cleanProductionId = pId;
    }
  }

  let cleanFromDate = null;
  if (from_date && typeof from_date === 'string' && DATE_REGEX.test(from_date.trim())) {
    cleanFromDate = from_date.trim();
  }

  let cleanToDate = null;
  if (to_date && typeof to_date === 'string' && DATE_REGEX.test(to_date.trim())) {
    cleanToDate = to_date.trim();
  }

  return {
    search: search ? String(search).trim() : '',
    status: cleanStatus,
    production_id: cleanProductionId,
    from_date: cleanFromDate,
    to_date: cleanToDate,
    page: pageNum,
    limit: limitNum,
    sort_by: String(sort_by || 'createdate'),
    sort_dir: String(sort_dir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
  };
}

/**
 * Chuyển đổi bản ghi MaterialIssue sang DTO danh sách
 */
function toExportDTO(issue) {
  if (!issue) return null;
  const raw = issue.toJSON ? issue.toJSON() : issue;

  const items = raw.items || [];
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  return {
    issue_id: raw.issue_id,
    issue_code: raw.issue_code,
    production_id: raw.production_id,
    production_code: raw.productionOrder?.production_code || '—',
    production_type: raw.productionOrder?.production_type || '—',
    issue_date: raw.issue_date,
    status: raw.status,
    issued_by: raw.issued_by,
    issuer_name: raw.issuer?.full_name || '—',
    items_count: items.length,
    total_quantity: totalQuantity,
    note: raw.note,
    createdate: raw.createdate,
    modifiedate: raw.modifiedate,
    createby: raw.createby,
    modifieby: raw.modifieby,
  };
}

/**
 * Chuyển đổi bản ghi MaterialIssue sang DTO chi tiết đầy đủ
 */
function toExportDetailDTO(issue) {
  if (!issue) return null;
  const raw = issue.toJSON ? issue.toJSON() : issue;

  const items = (raw.items || []).map((it) => {
    return {
      issue_item_id: it.issue_item_id,
      raw_material_id: it.raw_material_id,
      raw_code: it.rawMaterial?.raw_code || '—',
      raw_name: it.rawMaterial?.raw_name || '—',
      unit: it.rawMaterial?.unit || '—',
      quantity_on_hand: it.rawMaterial?.quantity_on_hand !== undefined ? it.rawMaterial.quantity_on_hand : 0,
      quantity: it.quantity,
      note: it.note || null,
    };
  });

  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  return {
    issue_id: raw.issue_id,
    issue_code: raw.issue_code,
    production_id: raw.production_id,
    production_order: raw.productionOrder
      ? {
          production_id: raw.productionOrder.production_id,
          production_code: raw.productionOrder.production_code,
          production_type: raw.productionOrder.production_type,
          status: raw.productionOrder.status,
          planned_start: raw.productionOrder.planned_start,
          planned_end: raw.productionOrder.planned_end,
          note: raw.productionOrder.note,
        }
      : null,
    issue_date: raw.issue_date,
    status: raw.status,
    issued_by: raw.issued_by,
    issuer: raw.issuer
      ? {
          user_account_id: raw.issuer.user_account_id,
          full_name: raw.issuer.full_name,
          email: raw.issuer.email,
          phone_number: raw.issuer.phone_number,
        }
      : null,
    note: raw.note,
    items,
    items_count: items.length,
    total_quantity: totalQuantity,
    createdate: raw.createdate,
    modifiedate: raw.modifiedate,
    createby: raw.createby,
    modifieby: raw.modifieby,
  };
}

module.exports = {
  validateCreateExportInput,
  validateUpdateExportInput,
  validateExportQueryParams,
  toExportDTO,
  toExportDetailDTO,
};
