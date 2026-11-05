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
  const { order_id, planned_start, planned_end, design_file_url } = data;

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
      design_file_url: (typeof design_file_url === 'string' && design_file_url.trim()) ? design_file_url.trim() : null,
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
function toProductionOrderDTO(raw) {
  if (!raw) return null;

  const plain = raw.get ? raw.get({ plain: true }) : raw;

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
    design_file_url: plain.design_file_url || null,
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
};

