const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');
const { uploadToBlob } = require('../utils/vercelBlob');
const asyncHandler = require('express-async-handler');

/**
 * @route   POST /api/upload
 * @desc    Upload a single file
 * @access  Private
 */
router.post('/', protect, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(ApiResponse.badRequest('Please upload a file'));
  }

  const blob = await uploadToBlob(req.file.buffer, req.file.originalname, 'uploads/');

  res.status(200).json(ApiResponse.success('File uploaded successfully', {
    filename: blob.pathname,
    url: blob.url
  }));
}));

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files
 * @access  Private
 */
router.post('/multiple', protect, upload.array('files', 20), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(ApiResponse.badRequest('Please upload at least one file'));
  }

  const urls = [];
  for (const f of req.files) {
    const blob = await uploadToBlob(f.buffer, f.originalname, 'uploads/');
    urls.push(blob.url);
  }

  res.status(200).json(ApiResponse.success('Files uploaded successfully', { urls }));
}));

// /api/upload/photos — used by stage tabs
router.post('/photos', protect, upload.array('photos', 20), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(ApiResponse.badRequest('No files uploaded'));
  }
  
  const urls = [];
  for (const f of req.files) {
    const blob = await uploadToBlob(f.buffer, f.originalname, 'photos/');
    urls.push(blob.url);
  }
  
  Logger.debug('Photos uploaded to Vercel Blob', { count: urls.length });
  res.status(200).json(ApiResponse.success('Photos uploaded', { urls }));
}));

/**
 * @route   GET /api/upload/proxy
 * @desc    Proxy to securely fetch private blob images
 * @access  Private
 */
router.get('/proxy', protect, asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url || !url.includes('blob.vercel-storage.com')) {
    return res.status(400).send('Invalid or missing URL');
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const { Readable } = require('stream');
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    Logger.error('Media proxy error', error);
    res.status(500).send('Proxy error');
  }
}));

module.exports = router;
