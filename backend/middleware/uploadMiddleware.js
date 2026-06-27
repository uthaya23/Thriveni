const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept all image types and document types
  const allowedMime = /^image\/|application\/pdf|application\/msword|application\/vnd\./;
  if (allowedMime.test(file.mimetype)) {
    return cb(null, true);
  }
  // Fallback: check extension
  const allowedExts = /\.(jpeg|jpg|png|gif|webp|heic|pdf|doc|docx|xls|xlsx)$/i;
  if (allowedExts.test(path.extname(file.originalname))) {
    return cb(null, true);
  }
  cb(new Error('File type not allowed'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit
  fileFilter: fileFilter
});

module.exports = upload;
