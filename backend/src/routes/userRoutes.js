const express = require('express');
const { getProfile, updateProfile, changePassword } = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticate, getProfile);

// PUT /api/users/profile
router.put('/profile', authenticate, upload.single('avatar'), updateProfile);

// PUT /api/users/change-password
router.put('/change-password', authenticate, changePassword);

module.exports = router;