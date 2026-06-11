const express = require('express');
const router = express.Router();
const Assembly = require('../models/Assembly');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

router.use(protect);

router.get('/:jobId', asyncHandler(async (req, res) => {
  const doc = await Assembly.findOne({ job: req.params.jobId })
    .populate('technicianAssigned', 'name')
    .populate('photos');
  res.json(doc || {});
}));

router.post('/:jobId', asyncHandler(async (req, res) => {
  const updateData = { ...req.body };

  // Remove internal Mongoose fields to prevent CastErrors/Immutable errors
  delete updateData._id;
  delete updateData.__v;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  // Handle populated fields that might be objects
  if (updateData.technicianAssigned && typeof updateData.technicianAssigned === 'object') {
    updateData.technicianAssigned = updateData.technicianAssigned._id;
  }
  if (updateData.photos && Array.isArray(updateData.photos)) {
    updateData.photos = updateData.photos.map(p => (p && typeof p === 'object') ? p._id : p);
  }

  try {
    const doc = await Assembly.findOneAndUpdate(
      { job: req.params.jobId },
      { ...updateData, job: req.params.jobId },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(doc);
  } catch (error) {
    console.error('Assembly Save Critical Error:', error);
    res.status(400).json({ message: error.message });
  }
}));

router.patch('/:jobId', asyncHandler(async (req, res) => {
  const doc = await Assembly.findOneAndUpdate(
    { job: req.params.jobId },
    { $set: req.body },
    { new: true, upsert: true }
  );
  res.json(doc);
}));

module.exports = router;
