// Khai báo quan hệ giữa các model (đặt riêng để tránh require vòng)
const { UserRole } = require('./userRole.model');
const { UserAccount } = require('./userAccount.model');
const { RefreshToken } = require('./refreshToken.model');

UserRole.hasMany(UserAccount, { foreignKey: 'role_id', as: 'accounts' });
UserAccount.belongsTo(UserRole, { foreignKey: 'role_id', as: 'role' });

UserAccount.hasMany(RefreshToken, { foreignKey: 'user_account_id', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(UserAccount, { foreignKey: 'user_account_id', as: 'account' });

module.exports = {};