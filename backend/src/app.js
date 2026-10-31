const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

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


const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true, // Cần thiết để cookie được gửi/nhận cross-origin
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Route kiểm tra server sống
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend đang chạy' });
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


// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Đã có lỗi xảy ra', error: err.message });
});

module.exports = app;
