// =========================================================
// roles.js
// Mapping role_id → tên vai trò (theo bảng user_role trong init.sql)
// Dùng ở ProtectedRoute để khai báo roles={[ROLES.OWNER, ROLES.SALES]}
// =========================================================

export const ROLES = {
  OWNER: 1,
  SALES: 2,
  LEADERSTAFF: 3,
  CUSTOMER: 4,
};

/** Tập hợp tất cả nhân viên nội bộ (không phải khách hàng) */
export const STAFF_ROLES = [
  ROLES.OWNER,
  ROLES.SALES,
  ROLES.LEADERSTAFF,
];

/** Tên hiển thị tiếng Việt của các vai trò */
export const ROLE_NAMES = {
  [ROLES.OWNER]: 'Chủ xưởng (Owner)',
  [ROLES.SALES]: 'Kinh doanh (Sales)',
  [ROLES.LEADERSTAFF]: 'Tổ trưởng xưởng (Leader Staff)',
  [ROLES.CUSTOMER]: 'Khách hàng (Customer)',
};

/** Đường dẫn mặc định sau khi nhân viên đăng nhập */
export const STAFF_DEFAULT_REDIRECTS = {
  [ROLES.OWNER]: '/owner',
  [ROLES.SALES]: '/sale',
  [ROLES.LEADERSTAFF]: '/staff-leader',
};

/** Kiểm tra roleId có thuộc nhóm nhân viên không */
export function isStaffRole(roleId) {
  return STAFF_ROLES.includes(Number(roleId));
}

/** Lấy đường dẫn chuyển hướng cho nhân viên theo role */
export function getStaffRedirectPath(roleId) {
  return STAFF_DEFAULT_REDIRECTS[Number(roleId)] || '/owner';
}

/** Lấy tên hiển thị vai trò */
export function getRoleName(roleId) {
  return ROLE_NAMES[Number(roleId)] || 'Nhân viên';
}
