// Middleware upload file thiết kế (ảnh hoặc PDF) lên Cloudinary
// Dành cho Owner gửi bản thiết kế sang cho Sale
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: 'design_files',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    // PDF không cần transformation
    ...(file.mimetype !== 'application/pdf' && {
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    }),
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
  }),
});

const uploadDesign = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB cho PDF thiết kế
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WebP) hoặc PDF.'));
    }
  },
});

module.exports = uploadDesign;

