const express = require('express');
const router = express.Router();
const Testing = require('../models/Testing');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

router.use(protect);

router.get('/:jobId', asyncHandler(async (req, res) => {
  const doc = await Testing.findOne({ job: req.params.jobId })
    .populate('testedBy', 'name')
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
  if (updateData.testedBy && typeof updateData.testedBy === 'object') {
    updateData.testedBy = updateData.testedBy._id;
  }
  if (updateData.photos && Array.isArray(updateData.photos)) {
    updateData.photos = updateData.photos.map(p => (p && typeof p === 'object') ? p._id : p);
  }

  const doc = await Testing.findOneAndUpdate(
    { job: req.params.jobId },
    { ...updateData, job: req.params.jobId, testedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(doc);
}));

router.patch('/:jobId', asyncHandler(async (req, res) => {
  const doc = await Testing.findOneAndUpdate(
    { job: req.params.jobId },
    { $set: req.body },
    { new: true, upsert: true }
  );
  res.json(doc);
}));

module.exports = router;
