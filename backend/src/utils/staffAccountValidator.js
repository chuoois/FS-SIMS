// =========================================================
// staffAccountValidator.js
// Các hàm validate & format dữ liệu thuần cho Quản lý tài khoản nhân viên
// Thuộc utils/ -> Dễ test độc lập, không phụ thuộc DB/network
// =========================================================

/**
 * Validate query params cho tìm kiếm, lọc và phân trang tài khoản nhân viên
 * @param {object} query - req.query
 * @returns {{ search: string, role: string, status: string, page: number, limit: number }}
 */
function validateStaffAccountQueryParams(query = {}) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  let role = 'ALL';
  if (query.role !== undefined && query.role !== null && query.role !== '') {
    const rawRole = String(query.role).trim();
    if (rawRole.toUpperCase() !== 'ALL') {
      role = rawRole;
    }
  }

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
    role,
    status,
    page,
    limit,
  };
}

module.exports = {
  validateStaffAccountQueryParams,
};
