// UserAccount.js
// Quản lý tài khoản người dùng và thông tin profile
// Created By: ThinhBui
// =========================================================

const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../config/sequelize");

const UserAccount = sequelize.define(
  "UserAccount",
  {
    user_account_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'user_role', key: 'role_id' },
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ACTIVE",
    },

    full_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    gender: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },

    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    modifiedate: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    createby: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    modifieby: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "user_account",
    timestamps: true,
    createdAt: "createdate",
    updatedAt: 'modifiedate',
    indexes: [{ name: 'idx_user_account_role_id', fields: ['role_id'] }],
  },
);

const { UserRole } = require('./userRole.model');
if (!UserAccount.associations || !UserAccount.associations.role) {
  UserAccount.belongsTo(UserRole, { foreignKey: 'role_id', as: 'role' });
}

// =========================================================
// Create User Account
// =========================================================

async function createUserAccount({
  roleId,
  email,
  passwordHash,
  status = "ACTIVE",
  fullName,
  phoneNumber,
  dob,
  gender,
  address,
  note,
  createBy,
}) {
  const account = await UserAccount.create({
    role_id: roleId,

    email,
    password_hash: passwordHash,
    status,

    full_name: fullName,
    phone_number: phoneNumber,
    dob,
    gender,
    address,
    note,

    createby: createBy,
  });

  return {
    userAccountId: account.user_account_id,
    roleId: account.role_id,

    email: account.email,
    status: account.status,

    fullName: account.full_name,
    phoneNumber: account.phone_number,
    dob: account.dob,
    gender: account.gender,
    address: account.address,
    note: account.note,
  };
}

// =========================================================
// Find User By Email
// Dùng cho Login
// Có trả về password_hash
// =========================================================

async function findUserAccountByEmail(email) {
  return UserAccount.findOne({
    where: { email },
    raw: true,
  });
}

// =========================================================
// Find User By ID
// Không trả về password_hash
// =========================================================

async function findUserAccountById(userAccountId) {
  return UserAccount.findByPk(userAccountId, {
    attributes: {
      exclude: ["password_hash"],
    },
    raw: true,
  });
}

// =========================================================
// Get All User Accounts
// Không trả về password_hash
// =========================================================

async function getAllUserAccounts() {
  return UserAccount.findAll({
    attributes: [
      "user_account_id",
      "role_id",
      "email",
      "status",
      "full_name",
      "phone_number",
      "dob",
      "gender",
      "address",
      "note",
      "createdate",
      "modifiedate",
    ],

    order: [["user_account_id", "DESC"]],
    raw: true,
  });
}

// =========================================================
// Update User Account Status
// =========================================================

async function updateUserAccountStatus(userAccountId, status, modifiedBy) {
  const [affected] = await UserAccount.update(
    {
      status,
      modifieby: modifiedBy,
      modifiedate: new Date(),
    },
    {
      where: {
        user_account_id: userAccountId,
      },
    },
  );

  return affected > 0;
}

// =========================================================
// Update User Profile
// =========================================================

async function updateUserProfile(
  userAccountId,
  { fullName, phoneNumber, dob, gender, address, note, avatarUrl },
  modifiedBy,
) {
  const updateFields = {
    full_name: fullName,
    phone_number: phoneNumber,
    dob,
    gender,
    address,
    note,

    modifieby: modifiedBy,
    modifiedate: new Date(),
  };

  if (avatarUrl !== undefined) {
    updateFields.avatar_url = avatarUrl;
  }

  const [affected] = await UserAccount.update(
    updateFields,
    {
      where: {
        user_account_id: userAccountId,
      },
    },
  );

  return affected > 0;
}

async function updateUserPassword(userAccountId, passwordHash) {
  const [affected] = await UserAccount.update(
    { password_hash: passwordHash, modifiedate: new Date() },
    { where: { user_account_id: userAccountId } },
  );
  return affected > 0;
}

// =========================================================
// Staff Account Management Queries (dành cho Owner)
// =========================================================

async function getStaffAccounts(staffRoleIds, queryParams = {}) {
  const UserRoleModel = sequelize.models.UserRole || require('./userRole.model').UserRole;

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const offset = (page - 1) * limit;

  // Base whereClause: bắt buộc role_id thuộc nhóm nhân viên cấp dưới (SALES, LEADERSTAFF)
  const whereClause = {
    role_id: { [Op.in]: staffRoleIds },
  };

  // Lọc theo vai trò nếu có
  if (queryParams.role && queryParams.role !== 'ALL') {
    const roleVal = queryParams.role;
    if (!isNaN(Number(roleVal))) {
      const numRoleId = Number(roleVal);
      if (staffRoleIds.includes(numRoleId)) {
        whereClause.role_id = numRoleId;
      }
    } else {
      const foundRole = await UserRoleModel.findOne({
        where: { role_code: String(roleVal).trim().toUpperCase() },
        raw: true,
      });
      if (foundRole && staffRoleIds.includes(Number(foundRole.role_id))) {
        whereClause.role_id = Number(foundRole.role_id);
      }
    }
  }

  // Lọc theo trạng thái nếu có
  if (queryParams.status && queryParams.status !== 'ALL') {
    const normStatus = String(queryParams.status).trim().toUpperCase();
    if (normStatus === 'ACTIVE' || normStatus === 'INACTIVE') {
      whereClause.status = normStatus;
    }
  }

  // Tìm kiếm theo tên, email hoặc số điện thoại
  if (queryParams.search && String(queryParams.search).trim()) {
    const cleanSearch = String(queryParams.search).trim();
    whereClause[Op.or] = [
      { full_name: { [Op.like]: `%${cleanSearch}%` } },
      { email: { [Op.like]: `%${cleanSearch}%` } },
      { phone_number: { [Op.like]: `%${cleanSearch}%` } },
    ];
  }

  const { count, rows } = await UserAccount.findAndCountAll({
    where: whereClause,
    attributes: {
      exclude: ['password_hash'],
    },
    include: [
      {
        model: UserRoleModel,
        as: 'role',
        attributes: ['role_id', 'role_code', 'role_name', 'description'],
      },
    ],
    limit,
    offset,
    order: [['user_account_id', 'DESC']],
  });

  const totalPages = Math.ceil(count / limit) || 1;

  // Thống kê tổng thể toàn hệ thống cho đội ngũ nhân viên cấp dưới
  let stats = null;
  try {
    const allStaff = await UserAccount.findAll({
      where: { role_id: { [Op.in]: staffRoleIds } },
      attributes: ['user_account_id', 'role_id', 'status'],
      include: [
        {
          model: UserRoleModel,
          as: 'role',
          attributes: ['role_code'],
        },
      ],
    });

    const total = allStaff.length;
    const active = allStaff.filter((a) => a.status === 'ACTIVE').length;
    const inactive = total - active;
    const salesCount = allStaff.filter(
      (a) => a.role?.role_code === 'SALES' || Number(a.role_id) === 2
    ).length;
    const leaderCount = allStaff.filter(
      (a) => a.role?.role_code === 'LEADERSTAFF' || Number(a.role_id) === 3
    ).length;

    stats = { total, active, inactive, salesCount, leaderCount };
  } catch (err) {
    console.error('[getStaffAccounts.stats]', err);
  }

  return {
    accounts: rows,
    totalItems: count,
    totalPages,
    currentPage: page,
    itemsPerPage: limit,
    stats,
  };
}

async function getStaffAccountById(userAccountId, staffRoleIds) {
  const UserRoleModel = sequelize.models.UserRole || require('./userRole.model').UserRole;
  const where = { user_account_id: userAccountId };
  if (staffRoleIds && staffRoleIds.length > 0) {
    where.role_id = { [Op.in]: staffRoleIds };
  }
  return UserAccount.findOne({
    where,
    attributes: {
      exclude: ['password_hash'],
    },
    include: [
      {
        model: UserRoleModel,
        as: 'role',
        attributes: ['role_id', 'role_code', 'role_name', 'description'],
      },
    ],
  });
}

async function updateStaffAccount(
  userAccountId,
  { email, roleId, fullName, phoneNumber, dob, gender, address, note, passwordHash },
  modifiedBy,
) {
  const updateFields = {
    modifieby: modifiedBy,
    modifiedate: new Date(),
  };

  if (email !== undefined) updateFields.email = email;
  if (roleId !== undefined) updateFields.role_id = roleId;
  if (fullName !== undefined) updateFields.full_name = fullName;
  if (phoneNumber !== undefined) updateFields.phone_number = phoneNumber;
  if (dob !== undefined) updateFields.dob = dob || null;
  if (gender !== undefined) updateFields.gender = gender || null;
  if (address !== undefined) updateFields.address = address || null;
  if (note !== undefined) updateFields.note = note || null;
  if (passwordHash) updateFields.password_hash = passwordHash;

  const [affected] = await UserAccount.update(updateFields, {
    where: { user_account_id: userAccountId },
  });
  return affected > 0;
}

async function deleteStaffAccount(userAccountId) {
  const affected = await UserAccount.destroy({
    where: { user_account_id: userAccountId },
  });
  return affected > 0;
}

module.exports = {
  UserAccount,
  createUserAccount,
  findUserAccountByEmail,
  findUserAccountById,
  getAllUserAccounts,
  updateUserAccountStatus,
  updateUserProfile,
  updateUserPassword,
  getStaffAccounts,
  getStaffAccountById,
  updateStaffAccount,
  deleteStaffAccount,
};