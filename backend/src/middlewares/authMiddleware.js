// =========================================================
// authMiddleware.js
// Xác thực JWT từ Authorization header
// =========================================================

const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Yêu cầu xác thực. Vui lòng đăng nhập.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { sub, email, role, iat, exp }
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
    }
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

const { findUserRoleByCode } = require('../models/userRole.model');

async function requireOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Yêu cầu xác thực. Vui lòng đăng nhập.' });
  }

  try {
    const ownerRole = await findUserRoleByCode('OWNER');
    if (!ownerRole || Number(req.user.role) !== Number(ownerRole.role_id)) {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập chức năng này. Chỉ dành riêng cho Chủ xưởng (Owner).',
      });
    }
    return next();
  } catch (error) {
    console.error('[authMiddleware.requireOwner]', error);
    return res.status(500).json({ message: 'Lỗi xác thực quyền hạn' });
  }
}

module.exports = { authenticate, requireOwner };
