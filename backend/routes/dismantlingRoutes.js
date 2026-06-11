const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Dismantling = require('../models/Dismantling');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.use(protect);

// AI Component Analysis
const aiSummaryService = require('../services/aiSummaryService');
router.post('/analyze-component', asyncHandler(async (req, res) => {
  const { componentName, photos, remarks } = req.body;
  const analysis = await aiSummaryService.analyzeComponentCondition(componentName, photos, remarks);
  res.json({ analysis });
}));

// GET /api/dismantling/:jobId
router.get('/:jobId', asyncHandler(async (req, res) => {
  const d = await Dismantling.findOne({ job: req.params.jobId }).populate('createdBy', 'name');
  res.json(d || {});
}));

// POST /api/dismantling/:jobId
router.post('/:jobId', upload.array('images', 10), asyncHandler(async (req, res) => {
  const images = req.files ? req.files.map(f => f.filename) : [];
  
  // Need jobNo from the Job model since it's required in Dismantling schema
  const Job = require('../models/Job');
  const jobDoc = await Job.findById(req.params.jobId);
  if (!jobDoc) return res.status(404).json({ message: 'Job not found' });

  const updateData = { ...req.body };

  // Remove internal Mongoose fields to prevent CastErrors/Immutable errors
  delete updateData._id;
  delete updateData.__v;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  if (updateData.createdBy && typeof updateData.createdBy === 'object' && updateData.createdBy !== null) {
    updateData.createdBy = updateData.createdBy._id || updateData.createdBy;
  }

  const d = await Dismantling.findOneAndUpdate(
    { job: req.params.jobId },
    { 
      ...updateData, 
      job: req.params.jobId, 
      jobNo: jobDoc.jobNo,
      createdBy: req.user._id 
    },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(d);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Dismantling.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;
