const express = require('express');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const { getMyOrders, getMyOrderById } = require('../controllers/customerOrderController');

const router = express.Router();

router.use(authenticate, requireRole('CUSTOMER'));
router.get('/', getMyOrders);
router.get('/:id', getMyOrderById);

module.exports = router;
