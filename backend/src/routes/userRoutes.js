const express = require('express');
const { getProfile, updateProfile, changePassword } = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const avatarUpload = require('../middlewares/avatarUploadMiddleware');

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticate, getProfile);

// PUT /api/users/profile
router.put('/profile', authenticate, avatarUpload, updateProfile);

// PUT /api/users/change-password
router.put('/change-password', authenticate, changePassword);

module.exports = router;