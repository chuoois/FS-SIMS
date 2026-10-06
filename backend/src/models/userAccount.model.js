// =========================================================
// UserAccount.js
// Quản lý tài khoản người dùng và thông tin profile
// Created By: ThinhBui
// =========================================================

const { DataTypes } = require("sequelize");
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
      allowNull: true,
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
    updatedAt: false,
  },
);

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

module.exports = {
  UserAccount,
  createUserAccount,
  findUserAccountByEmail,
  findUserAccountById,
  getAllUserAccounts,
  updateUserAccountStatus,
  updateUserProfile,
};