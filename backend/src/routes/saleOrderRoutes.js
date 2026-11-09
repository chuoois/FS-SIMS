// =========================================================
// saleOrderRoutes.js
// Định tuyến API Riêng biệt cho Bán hàng & Tạo đơn hàng (Sale Role POS)
// Tách biệt hoàn toàn, không gộp vào các route có sẵn
// =========================================================

const express = require('express');
const {
  getWarehouseProducts,
  getProductDetail,
  getProductMetadata,
  createOfflineContract,
  signContract,
  getContracts,
  getContractById,
  createOrderFromContract,
  getOrders,
  getOrderById,
  getRequests,
  getRequestById,
  convertRequestToContract,
  updateDesignFile,
} = require('../controllers/saleOrderController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const uploadDesign = require('../middlewares/uploadDesignMiddleware');

const router = express.Router();

// Bắt buộc đăng nhập và chỉ cho phép role SALES hoặc OWNER
router.use(authenticate, requireRole('SALES', 'OWNER'));

// ── Kho sản phẩm dành cho POS ─────────────────────────────
router.get('/products', getWarehouseProducts);
router.get('/products/:id', getProductDetail);
router.get('/metadata', getProductMetadata);

// ── Luồng Hợp đồng (Contract) ──────────────────────────────
router.post('/contracts', createOfflineContract);
router.post('/contracts/:id/sign', signContract);
router.get('/contracts', getContracts);
router.get('/contracts/:id', getContractById);

// ── Luồng Đơn hàng (Order) ────────────────────────────────
router.post('/orders/from-contract/:contractId', createOrderFromContract);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);

// -- Luong Yeu cau cua khach hang (Customer Requests) ----
router.get('/requests', getRequests);
router.get('/requests/:id', getRequestById);
router.post('/requests/:id/convert-to-contract', convertRequestToContract);
router.patch('/requests/:id/design', requireRole('OWNER'), uploadDesign.single('design_file'), updateDesignFile);

module.exports = router;

