const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/sequelize");

const UserRole = sequelize.define(
  "UserRole",
  {
    role_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    role_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    role_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
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
    tableName: "user_role",
    timestamps: true,
    createdAt: "createdate",
    updatedAt: 'modifiedate', 
  },
);

async function findUserRoleByCode(roleCode) {
  return UserRole.findOne({
    where: { role_code: roleCode },
    raw: true,
  });
}

async function findUserRoleById(roleId) {
  return UserRole.findByPk(roleId, { raw: true });
}

async function getStaffRoles() {
  return UserRole.findAll({
    where: {
      role_code: ['SALES', 'LEADERSTAFF'],
    },
    order: [['role_id', 'ASC']],
    raw: true,
  });
}

module.exports = { UserRole, findUserRoleByCode, findUserRoleById, getStaffRoles };