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
  getCustomers,
  createSalesRequest,
  updateSalesRequest,
  deliverOrder,
  completeOrder,
} = require('../controllers/saleOrderController');
const { createProductMaterial, createProductColor } = require('../controllers/productManagerController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Bắt buộc đăng nhập và chỉ cho phép role SALES hoặc OWNER
router.use(authenticate, requireRole('SALES', 'OWNER'));

// ── Upload hình ảnh thiết kế / may đo (Cloudinary) ────────
router.post('/upload-images', (req, res) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      console.error('[saleOrderRoutes.upload-images]', err);
      return res.status(400).json({ message: err.message || 'Lỗi khi tải ảnh lên máy chủ' });
    }
    const urls = (req.files || []).map((f) => f.path || f.url || f.secure_url).filter(Boolean);
    return res.status(200).json({
      message: 'Tải lên hình ảnh thiết kế thành công',
      urls,
      images: urls,
    });
  });
});

// ── Kho sản phẩm dành cho POS ─────────────────────────────
router.get('/products', getWarehouseProducts);
router.get('/products/:id', getProductDetail);
router.get('/metadata', getProductMetadata);
router.post('/materials', createProductMaterial);
router.post('/colors', createProductColor);

// ── Danh sách khách hàng cho Sales ────────────────────────
router.get('/customers', getCustomers);

// ── Luồng Hợp đồng (Contract) ──────────────────────────────
router.post('/contracts', createOfflineContract);
router.post('/contracts/:id/sign', signContract);
router.get('/contracts', getContracts);
router.get('/contracts/:id', getContractById);

// ── Luồng Đơn hàng (Order) ────────────────────────────────
router.post('/orders/from-contract/:contractId', createOrderFromContract);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders/:id/deliver', deliverOrder);
router.post('/orders/:id/complete', completeOrder);

// ── Luồng Yêu cầu của khách hàng (Customer Requests) ──────
router.get('/requests', getRequests);
router.get('/requests/:id', getRequestById);
router.post('/requests', createSalesRequest);
router.put('/requests/:id', updateSalesRequest);
router.post('/requests/:id/convert-to-contract', convertRequestToContract);

module.exports = router;
