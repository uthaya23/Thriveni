const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');

/**
 * @route   POST /api/upload
 * @desc    Upload a file
 * @access  Private
 */
router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json(ApiResponse.badRequest('Please upload a file'));
  }

  res.status(200).json(ApiResponse.success('File uploaded successfully', {
    filename: req.file.originalname,
    url: `/uploads/${req.file.filename}`
  }));
});

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files
 * @access  Private
 */
router.post('/multiple', protect, upload.array('files', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(ApiResponse.badRequest('Please upload at least one file'));
  }

  const urls = req.files.map(file => `/uploads/${file.filename}`);

  res.status(200).json(ApiResponse.success('Files uploaded successfully', { urls }));
});

// /api/upload/photos — used by stage tabs
router.post('/photos', protect, (req, res) => {
  upload.array('photos', 20)(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).json(ApiResponse.badRequest(err.message || 'Upload failed'));
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(ApiResponse.badRequest('No files uploaded'));
    }
    const urls = req.files.map(file => `/uploads/${file.filename}`);
    Logger.debug('Photos uploaded', { count: urls.length });
    res.status(200).json(ApiResponse.success('Photos uploaded', { urls }));
  });
});

module.exports = router;
