const express = require('express');
const router = express.Router();
const Inspection = require('../models/Inspection');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

router.use(protect);

// GET /api/inspection/:jobId
router.get('/:jobId', asyncHandler(async (req, res) => {
  const doc = await Inspection.findOne({ job: req.params.jobId })
    .populate('inspectedBy', 'name')
    .populate('photos');
  res.json(doc || {});
}));

// POST /api/inspection/:jobId  — create or update (upsert)
router.post('/:jobId', asyncHandler(async (req, res) => {
  const updateData = { ...req.body };

  // Remove internal Mongoose fields to prevent CastErrors/Immutable errors
  delete updateData._id;
  delete updateData.__v;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  if (updateData.photos && Array.isArray(updateData.photos)) {
    updateData.photos = updateData.photos.map(p => typeof p === 'object' && p !== null ? (p._id || p) : p);
  }
  if (updateData.inspectedBy && typeof updateData.inspectedBy === 'object' && updateData.inspectedBy !== null) {
    updateData.inspectedBy = updateData.inspectedBy._id || updateData.inspectedBy;
  }

  // Flatten photo arrays to single strings to match sub-schema definitions
  if (updateData.missingParts && Array.isArray(updateData.missingParts)) {
    updateData.missingParts = updateData.missingParts.map(part => {
      if (Array.isArray(part.photo)) part.photo = part.photo[0] || '';
      return part;
    });
  }
  if (updateData.initialIrTests && Array.isArray(updateData.initialIrTests)) {
    updateData.initialIrTests = updateData.initialIrTests.map(test => {
      if (Array.isArray(test.photo)) test.photo = test.photo[0] || '';
      return test;
    });
  }
  if (updateData.surgeTests && Array.isArray(updateData.surgeTests)) {
    updateData.surgeTests = updateData.surgeTests.map(test => {
      if (Array.isArray(test.photo)) test.photo = test.photo[0] || '';
      return test;
    });
  }

  const doc = await Inspection.findOneAndUpdate(
    { job: req.params.jobId },
    { ...updateData, job: req.params.jobId, inspectedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(doc);
}));

// PATCH /api/inspection/:jobId  — partial update
router.patch('/:jobId', asyncHandler(async (req, res) => {
  const updateData = { ...req.body };

  // Remove internal Mongoose fields to prevent CastErrors/Immutable errors
  delete updateData._id;
  delete updateData.__v;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  if (updateData.photos && Array.isArray(updateData.photos)) {
    updateData.photos = updateData.photos.map(p => typeof p === 'object' && p !== null ? (p._id || p) : p);
  }
  if (updateData.inspectedBy && typeof updateData.inspectedBy === 'object' && updateData.inspectedBy !== null) {
    updateData.inspectedBy = updateData.inspectedBy._id || updateData.inspectedBy;
  }

  // Flatten photo arrays to single strings to match sub-schema definitions
  if (updateData.missingParts && Array.isArray(updateData.missingParts)) {
    updateData.missingParts = updateData.missingParts.map(part => {
      if (Array.isArray(part.photo)) part.photo = part.photo[0] || '';
      return part;
    });
  }
  if (updateData.initialIrTests && Array.isArray(updateData.initialIrTests)) {
    updateData.initialIrTests = updateData.initialIrTests.map(test => {
      if (Array.isArray(test.photo)) test.photo = test.photo[0] || '';
      return test;
    });
  }
  if (updateData.surgeTests && Array.isArray(updateData.surgeTests)) {
    updateData.surgeTests = updateData.surgeTests.map(test => {
      if (Array.isArray(test.photo)) test.photo = test.photo[0] || '';
      return test;
    });
  }

  const doc = await Inspection.findOneAndUpdate(
    { job: req.params.jobId },
    { $set: updateData },
    { new: true, upsert: true }
  );
  res.json(doc);
}));

const aiSummaryService = require('../services/aiSummaryService');

// POST /api/inspection/:jobId/ai-analyze
router.post('/:jobId/ai-analyze', asyncHandler(async (req, res) => {
  const { photos, motorType, customDetails } = req.body;
  if (!photos || photos.length === 0) {
    return res.status(400).json({ message: 'No images provided for AI analysis' });
  }

  // Extract relative paths from URLs if necessary, or keep base64
  const imagePaths = photos.map(p => {
    if (p.startsWith('data:image')) return p; // Keep base64 as is
    if (p.startsWith('http')) {
      const url = new URL(p);
      return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    }
    return p.startsWith('/') ? p.substring(1) : p;
  });

  const analysis = await aiSummaryService.analyzeInspectionImages(imagePaths, motorType, customDetails);
  res.json(analysis);
}));

module.exports = router;
