const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { ApiError } = require('../utils/ApiError');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'app_uploads',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new ApiError(400, 'Chỉ hỗ trợ định dạng JPG hoặc PNG.'));
  },
});

const avatarUpload = (req, res, next) => {
  uploadAvatar.single('avatar')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof ApiError) return next(error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, 'Ảnh tối đa 2MB.'));
    }
    return next(new ApiError(400, 'Dữ liệu ảnh không hợp lệ.'));
  });
};

module.exports = avatarUpload;
