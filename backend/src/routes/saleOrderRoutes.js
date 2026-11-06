// =========================================================
// saleOrderRoutes.js
// Định tuyến API Riêng biệt cho Bán hàng & Tạo đơn hàng (Sale Role)
// Tách biệt hoàn toàn, không gộp vào các route có sẵn
// =========================================================

const express = require('express');
const {
  getWarehouseProducts,
  getProductDetail,
  getProductMetadata,
  getCustomers,
  createOfflineContract,
  signContract,
  getContracts,
  getContractById,
  createOrderFromContract,
  getOrders,
  getOrderById,
<<<<<<< Updated upstream
=======
  getRequests,
  getRequestById,
  createSalesRequest,
  updateSalesRequest,
  convertRequestToContract,
  confirmDeliveryController,
  completeDeliveryController,
>>>>>>> Stashed changes
} = require('../controllers/saleOrderController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Bắt buộc đăng nhập và chỉ cho phép role SALES hoặc OWNER
router.use(authenticate, requireRole('SALES', 'OWNER'));

// ── Khách hàng dành cho form đơn hàng của Sales ───────────
router.get('/customers', getCustomers);

// ── Kho sản phẩm dành cho Sales ───────────────────────────
router.get('/products', getWarehouseProducts);
router.get('/products/:id', getProductDetail);
router.get('/metadata', getProductMetadata);

// ── Luồng Yêu cầu đơn hàng (Order Requests) ───────────────
router.post('/requests', createSalesRequest);
router.put('/requests/:id', updateSalesRequest);
router.get('/requests', getRequests);
router.get('/requests/:id', getRequestById);
router.post('/requests/:id/convert-to-contract', convertRequestToContract);

// ── Luồng Hợp đồng (Contract) ──────────────────────────────
router.post('/contracts', createOfflineContract);
router.post('/contracts/:id/sign', signContract);
router.get('/contracts', getContracts);
router.get('/contracts/:id', getContractById);

// ── Luồng Đơn hàng (Order) & Giao hàng ────────────────────
router.post('/orders/from-contract/:contractId', createOrderFromContract);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
<<<<<<< Updated upstream
=======
router.post('/orders/:id/deliver', confirmDeliveryController);
router.post('/orders/:id/complete', completeDeliveryController);
>>>>>>> Stashed changes

module.exports = router;
