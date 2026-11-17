const express = require('express');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const {
  getMyOrders,
  getMyOrderById,
  getMyOrderRequestById,
} = require('../controllers/customerOrderController');

const router = express.Router();

router.use(authenticate, requireRole('CUSTOMER'));
router.get('/', getMyOrders);
router.get('/requests/:id', getMyOrderRequestById);
router.get('/:id', getMyOrderById);

module.exports = router;
