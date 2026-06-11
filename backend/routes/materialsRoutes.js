const express = require('express');
const router = express.Router();
const Materials = require('../models/Materials');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

router.use(protect);

// GET /api/materials/:jobId
router.get('/:jobId', asyncHandler(async (req, res) => {
  const doc = await Materials.findOne({ job: req.params.jobId })
    .populate('requestedBy', 'name')
    .populate('approvedBy', 'name');
  res.json(doc || { items: [] });
}));

// POST /api/materials/:jobId — create or replace
router.post('/:jobId', asyncHandler(async (req, res) => {
  // Recalculate totalEstimatedCost
  const items = (req.body.items || []).map(item => ({
    ...item,
    totalCost: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0),
  }));
  const totalEstimatedCost = items.reduce((sum, i) => sum + (i.totalCost || 0), 0);

  const doc = await Materials.findOneAndUpdate(
    { job: req.params.jobId },
    { ...req.body, items, totalEstimatedCost, job: req.params.jobId, requestedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(doc);
}));

// PATCH /api/materials/:jobId/item/:itemId — update single item status
router.patch('/:jobId/item/:itemId', asyncHandler(async (req, res) => {
  const doc = await Materials.findOne({ job: req.params.jobId });
  if (!doc) return res.status(404).json({ message: 'Materials not found' });
  const item = doc.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  Object.assign(item, req.body);
  doc.totalEstimatedCost = doc.items.reduce((s, i) => s + (i.totalCost || 0), 0);
  await doc.save();
  res.json(doc);
}));

module.exports = router;
