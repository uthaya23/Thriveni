const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const WorkDetail = require('../models/WorkDetail');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const ApiResponse = require('../utils/apiResponse');
const { uploadToBlob } = require('../utils/vercelBlob');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const { jobNo } = req.query;
  const q = jobNo ? { jobNo } : {};
  const records = await WorkDetail.find(q).sort({ createdAt: -1 }).populate('createdBy', 'name');
  res.json(ApiResponse.success('Work details retrieved successfully', records));
}));

router.post('/', upload.array('images', 10), asyncHandler(async (req, res) => {
  const images = [];
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const blob = await uploadToBlob(f.buffer, f.originalname, 'work-details/');
      images.push(blob.url);
    }
  }
  const w = await WorkDetail.create({ ...req.body, images, createdBy: req.user._id });
  res.status(201).json(ApiResponse.created(w, 'Work detail created successfully'));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const updated = await WorkDetail.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(ApiResponse.success('Work detail updated successfully', updated));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await WorkDetail.findByIdAndDelete(req.params.id);
  res.json(ApiResponse.success('Work detail deleted successfully', null));
}));

module.exports = router;
