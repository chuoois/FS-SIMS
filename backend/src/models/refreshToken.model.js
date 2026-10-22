const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    refresh_token_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user_account_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING(512),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: 'refresh_token',
    timestamps: true,
    createdAt: 'createdate',
    updatedAt: 'modifiedate',
  }
);

async function createRefreshToken({ userAccountId, token, expiresAt, createBy }) {
  const rt = await RefreshToken.create({
    user_account_id: userAccountId,
    token,
    expires_at: expiresAt,
    createby: createBy,
  });
  return {
    refreshTokenId: rt.refresh_token_id,
    userAccountId: rt.user_account_id,
    token: rt.token,
    expiresAt: rt.expires_at,
  };
}

// Chỉ trả về token còn hạn
async function findValidRefreshToken(token) {
  return RefreshToken.findOne({
    where: { token, expires_at: { [Op.gt]: new Date() } },
    raw: true,
  });
}

async function deleteRefreshToken(token) {
  return RefreshToken.destroy({ where: { token } });
}

async function deleteTokensByAccountId(userAccountId) {
  return RefreshToken.destroy({ where: { user_account_id: userAccountId } });
}

async function deleteExpiredTokens() {
  return RefreshToken.destroy({ where: { expires_at: { [Op.lt]: new Date() } } });
}

module.exports = {
  RefreshToken,
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
  deleteTokensByAccountId,
  deleteExpiredTokens,
};