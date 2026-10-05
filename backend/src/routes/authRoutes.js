const express = require('express');
const { login, refreshToken, logout } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/logout
router.post('/logout', logout);

module.exports = router;
