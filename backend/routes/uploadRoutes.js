const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/upload
 * @desc    Upload a file
 * @access  Private
 */
router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }

  res.status(200).json({
    message: 'File uploaded successfully',
    filename: req.file.originalname,
    url: `/uploads/${req.file.filename}`
  });
});

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files
 * @access  Private
 */
router.post('/multiple', protect, upload.array('files', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Please upload at least one file' });
  }

  const urls = req.files.map(file => `/uploads/${file.filename}`);

  res.status(200).json({
    message: 'Files uploaded successfully',
    urls: urls
  });
});

module.exports = router;
