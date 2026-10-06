const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

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
app.use('/api/users', userRoutes);

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Đã có lỗi xảy ra', error: err.message });
});

module.exports = app;
