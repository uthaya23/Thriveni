const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

router.use(protect);

router.get('/:jobId', asyncHandler(async (req, res) => {
  const doc = await Dispatch.findOne({ job: req.params.jobId })
    .populate('dispatchedBy', 'name');
  res.json(doc || {});
}));

router.post('/:jobId', asyncHandler(async (req, res) => {
  const updateData = { ...req.body };

  // Remove internal Mongoose fields to prevent CastErrors/Immutable errors
  delete updateData._id;
  delete updateData.__v;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  if (updateData.dispatchedBy && typeof updateData.dispatchedBy === 'object' && updateData.dispatchedBy !== null) {
    updateData.dispatchedBy = updateData.dispatchedBy._id || updateData.dispatchedBy;
  }

  const doc = await Dispatch.findOneAndUpdate(
    { job: req.params.jobId },
    { ...updateData, job: req.params.jobId, dispatchedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(doc);
}));

router.patch('/:jobId', asyncHandler(async (req, res) => {
  const updateData = { ...req.body };

  // Remove internal Mongoose fields to prevent CastErrors/Immutable errors
  delete updateData._id;
  delete updateData.__v;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  if (updateData.dispatchedBy && typeof updateData.dispatchedBy === 'object' && updateData.dispatchedBy !== null) {
    updateData.dispatchedBy = updateData.dispatchedBy._id || updateData.dispatchedBy;
  }

  const doc = await Dispatch.findOneAndUpdate(
    { job: req.params.jobId },
    { $set: updateData },
    { new: true, upsert: true }
  );
  res.json(doc);
}));

module.exports = router;
