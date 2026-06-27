const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const Photo = require('../models/Photo');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const ApiResponse = require('../utils/apiResponse');
const { uploadToBlob, deleteFromBlob } = require('../utils/vercelBlob');

router.use(protect);

// GET /api/photos/:jobId?stage=Received
router.get('/:jobId', asyncHandler(async (req, res) => {
  const query = { job: req.params.jobId };
  if (req.query.stage) query.stage = req.query.stage;
  const photos = await Photo.find(query).sort({ createdAt: -1 }).populate('uploadedBy', 'name');
  res.json(ApiResponse.success('Photos retrieved successfully', photos));
}));

// POST /api/photos/:jobId — upload multiple images
router.post('/:jobId', upload.array('photos', 20), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json(ApiResponse.badRequest('No files uploaded'));

  const { stage, caption } = req.body;
  const docsToInsert = [];

  for (const f of req.files) {
    const blob = await uploadToBlob(f.buffer, f.originalname, 'photos/');
    docsToInsert.push({
      job: req.params.jobId,
      stage: stage || 'Other',
      filename: blob.pathname,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      url: blob.url,
      caption: caption || '',
      uploadedBy: req.user._id,
    });
  }

  const docs = await Photo.insertMany(docsToInsert);
  res.status(201).json(ApiResponse.created(docs, 'Photos uploaded successfully'));
}));

// DELETE /api/photos/:photoId
router.delete('/:photoId', asyncHandler(async (req, res) => {
  const photo = await Photo.findById(req.params.photoId);
  if (!photo) return res.status(404).json(ApiResponse.notFound('Photo not found'));

  // Delete from Vercel Blob using its URL
  if (photo.url && photo.url.includes('vercel-storage.com')) {
    await deleteFromBlob(photo.url);
  }

  await photo.deleteOne();
  res.json(ApiResponse.success('Photo deleted successfully', null));
}));

module.exports = router;
