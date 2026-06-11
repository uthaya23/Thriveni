const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const WorkDetail = require('../models/WorkDetail');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const { jobNo } = req.query;
  const q = jobNo ? { jobNo } : {};
  res.json(await WorkDetail.find(q).sort({ createdAt: -1 }).populate('createdBy', 'name'));
}));

router.post('/', upload.array('images', 10), asyncHandler(async (req, res) => {
  const images = req.files ? req.files.map(f => f.filename) : [];
  const w = await WorkDetail.create({ ...req.body, images, createdBy: req.user._id });
  res.status(201).json(w);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  res.json(await WorkDetail.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await WorkDetail.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;
