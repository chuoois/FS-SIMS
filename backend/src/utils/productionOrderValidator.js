// =========================================================
// productionOrderValidator.js
// Utility & Validator cho Lệnh Gia Công (Production Order)
// Hàm thuần túy (pure functions), dễ unit test độc lập
// =========================================================

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate dữ liệu đầu vào khi tạo lệnh gia công mới
 * @param {object} data
 * @returns {{ isValid: boolean, error?: string, value?: object }}
 */
function validateCreateProductionOrderInput(data = {}) {
  const { order_id, planned_start, planned_end } = data;

  // 1. Kiểm tra order_id (bắt buộc, số nguyên dương)
  if (order_id === undefined || order_id === null || String(order_id).trim() === '') {
    return { isValid: false, error: 'Vui lòng chọn đơn hàng để tạo lệnh gia công.' };
  }
  const oId = Number(order_id);
  if (isNaN(oId) || !Number.isInteger(oId) || oId <= 0) {
    return { isValid: false, error: 'ID đơn hàng không hợp lệ.' };
  }

  // 2. Kiểm tra planned_start (bắt buộc, định dạng YYYY-MM-DD)
  if (!planned_start || typeof planned_start !== 'string' || !DATE_REGEX.test(planned_start.trim())) {
    return { isValid: false, error: 'Ngày bắt đầu dự kiến không hợp lệ. Định dạng yêu cầu là YYYY-MM-DD.' };
  }

  // 3. Kiểm tra planned_end (bắt buộc, định dạng YYYY-MM-DD, phải >= planned_start)
  if (!planned_end || typeof planned_end !== 'string' || !DATE_REGEX.test(planned_end.trim())) {
    return { isValid: false, error: 'Ngày kết thúc dự kiến không hợp lệ. Định dạng yêu cầu là YYYY-MM-DD.' };
  }

  if (planned_end.trim() < planned_start.trim()) {
    return { isValid: false, error: 'Ngày kết thúc dự kiến phải lớn hơn hoặc bằng ngày bắt đầu.' };
  }

  return {
    isValid: true,
    value: {
      order_id: oId,
      planned_start: planned_start.trim(),
      planned_end: planned_end.trim(),
    },
  };
}

/**
 * Validate dữ liệu khi gán trưởng nhóm
 * @param {object} data
 * @returns {{ isValid: boolean, error?: string, value?: object }}
 */
function validateAssignLeaderInput(data = {}) {
  const { assigned_to } = data;

  if (assigned_to === undefined || assigned_to === null || String(assigned_to).trim() === '') {
    return { isValid: false, error: 'Vui lòng chọn trưởng nhóm sản xuất.' };
  }
  const userId = Number(assigned_to);
  if (isNaN(userId) || !Number.isInteger(userId) || userId <= 0) {
    return { isValid: false, error: 'ID trưởng nhóm không hợp lệ.' };
  }

  return {
    isValid: true,
    value: { assigned_to: userId },
  };
}

/**
 * Chuyển đổi bản ghi lệnh gia công thành DTO sạch để trả về cho client
 * @param {object} raw - Sequelize model instance hoặc plain object
 * @returns {object}
 */
function formatDimensions(length, width, height, fallbackText = '') {
  if (length != null || width != null || height != null) {
    return `${length ?? '—'} × ${width ?? '—'} × ${height ?? '—'} cm`;
  }
  if (fallbackText && typeof fallbackText === 'string') {
    const match = fallbackText.match(/(\d+(?:\.\d+)?)\s*(?:[xX*×]|x)\s*(\d+(?:\.\d+)?)\s*(?:[xX*×]|x)\s*(\d+(?:\.\d+)?)(?:\s*(cm|mm|m))?/i);
    if (match) {
      const unit = match[4] ? match[4].toLowerCase() : 'cm';
      return `${match[1]} × ${match[2]} × ${match[3]} ${unit}`;
    }
  }
  return null;
}

function toProductionOrderDTO(raw) {
  if (!raw) return null;

  const plain = raw.get ? raw.get({ plain: true }) : raw;

  // Lấy danh sách sản phẩm cần gia công (từ production_order_item hoặc từ customerOrder.items)
  let items = [];
  if (Array.isArray(plain.items) && plain.items.length > 0) {
    items = plain.items.map((it) => {
      const p = it.get ? it.get({ plain: true }) : it;
      const orderItem = p.orderItem ? (p.orderItem.get ? p.orderItem.get({ plain: true }) : p.orderItem) : null;
      const product = p.product ? (p.product.get ? p.product.get({ plain: true }) : p.product) : null;
      const itemProduct = orderItem?.product ? (orderItem.product.get ? orderItem.product.get({ plain: true }) : orderItem.product) : null;

      const len = orderItem?.length_cm ?? product?.length_cm ?? itemProduct?.length_cm ?? null;
      const wid = orderItem?.width_cm ?? product?.width_cm ?? itemProduct?.width_cm ?? null;
      const hei = orderItem?.height_cm ?? product?.height_cm ?? itemProduct?.height_cm ?? null;
      const desc = orderItem?.description || p.note || '';

      return {
        production_item_id: p.production_item_id,
        order_item_id: p.order_item_id,
        product_id: p.product_id || orderItem?.product_id || null,
        item_name: orderItem?.item_name || product?.product_name || itemProduct?.product_name || p.item_name || 'Sản phẩm gia công',
        product_code: product?.product_code || itemProduct?.product_code || null,
        description: orderItem?.description || null,
        dimensions: formatDimensions(len, wid, hei, desc),
        length_cm: len,
        width_cm: wid,
        height_cm: hei,
        quantity_planned: p.quantity_planned !== undefined ? p.quantity_planned : (orderItem?.quantity || 1),
        quantity_done: p.quantity_done || 0,
        note: p.note || null,
      };
    });
  } else if (Array.isArray(plain.customerOrder?.items) && plain.customerOrder.items.length > 0) {
    items = plain.customerOrder.items.map((it) => {
      const oi = it.get ? it.get({ plain: true }) : it;
      const prod = oi.product ? (oi.product.get ? oi.product.get({ plain: true }) : oi.product) : null;
      const len = oi.length_cm ?? prod?.length_cm ?? null;
      const wid = oi.width_cm ?? prod?.width_cm ?? null;
      const hei = oi.height_cm ?? prod?.height_cm ?? null;
      const desc = oi.description || '';

      return {
        order_item_id: oi.order_item_id,
        item_name: oi.item_name || prod?.product_name || 'Sản phẩm đặt làm',
        product_code: prod?.product_code || null,
        description: oi.description || null,
        dimensions: formatDimensions(len, wid, hei, desc),
        length_cm: len,
        width_cm: wid,
        height_cm: hei,
        quantity_planned: oi.quantity || 1,
        quantity_done: 0,
      };
    });
  }

  return {
    production_id: plain.production_id,
    production_code: plain.production_code,
    production_type: plain.production_type,
    order_id: plain.order_id,
    // Customer order info
    order_code: plain.customerOrder?.order_code || null,
    order_type: plain.customerOrder?.order_type || null,
    customer_name: plain.customerOrder?.contact_name || null,
    order_status: plain.customerOrder?.status || null,
    // Status & dates
    status: plain.status,
    planned_start: plain.planned_start,
    planned_end: plain.planned_end,
    completed_date: plain.completed_date || null,
    // Assigned leader
    assigned_to: plain.assigned_to,
    leader_name: plain.supervisor?.full_name || null,
    leader_email: plain.supervisor?.email || null,
    leader_phone: plain.supervisor?.phone_number || null,
    // Items
    items,
    // Audit
    note: plain.note || null,
    createby: plain.createby || null,
    modifieby: plain.modifieby || null,
    createdate: plain.createdate || null,
    modifiedate: plain.modifiedate || null,
  };
}

module.exports = {
  validateCreateProductionOrderInput,
  validateAssignLeaderInput,
  toProductionOrderDTO,
  formatDimensions,
};

