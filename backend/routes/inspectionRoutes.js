const express = require('express');
const router = express.Router();
const resolveJobId = require('../middleware/resolveJobId');
const { protect } = require('../middleware/authMiddleware');
const inspectionController = require('../controllers/inspectionController');
const asyncHandler = require('express-async-handler');
const aiSummaryService = require('../services/aiSummaryService');
const ApiResponse = require('../utils/apiResponse');

router.use(protect);

router.use('/:jobId', resolveJobId('jobId'));
router.route('/:jobId')
  .get(inspectionController.getInspection)
  .post(inspectionController.saveInspection)
  .patch(inspectionController.saveInspection); // Route to same save handler

// POST /api/inspection/:jobId/ai-analyze
router.post('/:jobId/ai-analyze', resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const { photos, motorType, customDetails } = req.body;
  if (!photos || photos.length === 0) {
    return res.status(400).json(ApiResponse.badRequest('No images provided for AI analysis'));
  }

  const imagePaths = photos.map(p => {
    if (p.startsWith('data:image')) return p;
    if (p.startsWith('http')) {
      const url = new URL(p);
      return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    }
    return p.startsWith('/') ? p.substring(1) : p;
  });

  const analysis = await aiSummaryService.analyzeInspectionImages(imagePaths, motorType, customDetails);
  res.json(ApiResponse.success('AI inspection analysis completed successfully', analysis));
}));

module.exports = router;
