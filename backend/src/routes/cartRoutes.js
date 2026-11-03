const express = require('express');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const { getCart, addItem, updateItem, deleteItem } = require('../controllers/cartController');
const { createCartOrderRequest } = require('../controllers/orderRequestController');

const router = express.Router();

router.use(authenticate, requireRole('CUSTOMER'));
router.get('/', getCart);
router.post('/items', addItem);
router.patch('/items/:productId', updateItem);
router.delete('/items/:productId', deleteItem);
router.post('/requests', createCartOrderRequest);

module.exports = router;
