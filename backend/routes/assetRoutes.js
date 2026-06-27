const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/authMiddleware');
const AssetService = require('../services/AssetService');
const ApiResponse = require('../utils/apiResponse');

router.use(protect);

// GET /api/assets
// List all assets with optional filters
router.get('/', asyncHandler(async (req, res) => {
  const result = await AssetService.getAssets(req.query);
  res.status(result.statusCode).json(result);
}));

// GET /api/assets/history/:serialNumber
// Get full rebuild history for a specific asset
router.get('/history/:serialNumber', asyncHandler(async (req, res) => {
  const result = await AssetService.getAssetHistory(req.params.serialNumber);
  res.status(result.statusCode).json(result);
}));

// GET /api/assets/check/:serialNumber
// Check if serial number already has an active job
router.get('/check/:serialNumber', asyncHandler(async (req, res) => {
  const activeJob = await AssetService.checkDuplicateActiveJob(req.params.serialNumber);

  if (activeJob) {
    return res.json(ApiResponse.success('Duplicate active job found', {
      hasDuplicate: true,
      existingJob: activeJob
    }));
  }

  res.json(ApiResponse.success('No active job found', {
    hasDuplicate: false
  }));
}));

// PUT /api/assets/:id
// Update asset details
router.put('/:id', asyncHandler(async (req, res) => {
  const result = await AssetService.updateAsset(
    req.params.id,
    req.body,
    req.user._id
  );
  res.status(result.statusCode).json(result);
}));

module.exports = router;
