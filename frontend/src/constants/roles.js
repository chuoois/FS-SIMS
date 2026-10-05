// =========================================================
// roles.js
// Mapping role_id → tên vai trò (theo bảng user_role trong init.sql)
// Dùng ở ProtectedRoute để khai báo roles={[ROLES.OWNER, ROLES.SALES]}
// =========================================================

export const ROLES = {
  OWNER: 1,
  SALES: 2,
  ACCOUNTANT: 3,
  LEADERSTAFF: 4,
  CUSTOMER: 5,
};

/** Tập hợp tất cả nhân viên nội bộ (không phải khách hàng) */
export const STAFF_ROLES = [
  ROLES.OWNER,
  ROLES.SALES,
  ROLES.ACCOUNTANT,
  ROLES.LEADERSTAFF,
];
