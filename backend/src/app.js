const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const traceIdMiddleware = require('./middlewares/traceId');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const staffAuthRoutes = require('./routes/staffAuthRoutes');
const staffAccountRoutes = require('./routes/staffAccountRoutes');
const userRoutes = require('./routes/userRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productManagerRoutes = require('./routes/productManagerRoutes');
const productRoutes = require('./routes/productRoutes');
const rawMaterialRoutes = require('./routes/rawMaterialRoutes');
const purchaseReceiptRoutes = require('./routes/purchaseReceiptRoutes');
const materialExportRoutes = require('./routes/materialExportRoutes');
const saleOrderRoutes = require('./routes/saleOrderRoutes');
const productionOrderRoutes = require('./routes/productionOrderRoutes');
const orderManagementRoutes = require('./routes/orderManagementRoutes');
const leaderStaffRoutes = require('./routes/leaderStaffRoutes');
const cartRoutes = require('./routes/cartRoutes');
const customerOrderRoutes = require('./routes/customerOrderRoutes');
const financialReportRoutes = require('./routes/financialReportRoutes');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(traceIdMiddleware);

app.get('/api/health', (req, res) => {
  res.success({
    status: 200,
    message: 'Backend đang chạy',
    data: { status: 'ok' },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/staff-auth', staffAuthRoutes);
app.use('/api/staff-accounts', staffAccountRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/product-manager', productManagerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/purchase-receipts', purchaseReceiptRoutes);
app.use('/api/material-exports', materialExportRoutes);
app.use('/api/sale-orders', saleOrderRoutes);
app.use('/api/production-orders', productionOrderRoutes);
app.use('/api/order-management', orderManagementRoutes);
app.use('/api/leader-staff', leaderStaffRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/customer-orders', customerOrderRoutes);
app.use('/api/financial-reports', financialReportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
