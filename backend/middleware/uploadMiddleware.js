const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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
