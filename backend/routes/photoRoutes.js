const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Photo = require('../models/Photo');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const ApiResponse = require('../utils/apiResponse');

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, '../uploads/photos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 15 * 1024 * 1024 } });

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
  const docs = await Photo.insertMany(req.files.map(f => ({
    job: req.params.jobId,
    stage: stage || 'Other',
    filename: f.filename,
    originalName: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    url: `/uploads/photos/${f.filename}`,
    caption: caption || '',
    uploadedBy: req.user._id,
  })));

  res.status(201).json(ApiResponse.created(docs, 'Photos uploaded successfully'));
}));

// DELETE /api/photos/:photoId
router.delete('/:photoId', asyncHandler(async (req, res) => {
  const photo = await Photo.findById(req.params.photoId);
  if (!photo) return res.status(404).json(ApiResponse.notFound('Photo not found'));

  // Delete file from disk
  const filePath = path.join(__dirname, '../uploads/photos', photo.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await photo.deleteOne();
  res.json(ApiResponse.success('Photo deleted successfully', null));
}));

module.exports = router;
