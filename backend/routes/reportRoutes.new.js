/**
 * Report Routes
 * Thin router — all business logic lives in ReportService
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Handlebars = require('handlebars');
const handlebars = require('handlebars');

const { protect, notTechnician } = require('../middleware/authMiddleware');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');
const Job = require('../models/Job');
const Report = require('../models/Report');
const reportController = require('../controllers/reportController');

const {
  ReportService,
  getImageDimensions,
  getFailureAnalysisFallback,
  extractJsonFromAi,
  ensureStringFields,
  normalizeFailureAnalysis,
  generateFallbackDraft
} = require('../services/ReportService');

router.use(protect);
router.use(notTechnician);

// ─────────────────────────────────────────────
// GET /api/reports/summary
// ─────────────────────────────────────────────
router.get('/summary', asyncHandler(async (req, res) => {
  const result = await ReportService.getSummary();
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// GET /api/reports/job/:jobId
// ─────────────────────────────────────────────
router.get('/job/:jobId', asyncHandler(async (req, res) => {
  const result = await ReportService.getReportsByJob(req.params.jobId);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/initiate-workflow
// POST /api/reports/generate-ai
// ─────────────────────────────────────────────
const initiateWorkflow = asyncHandler(async (req, res) => {
  const { jobId, additionalInstructions } = req.body;
  if (!jobId) return res.status(400).json(ApiResponse.badRequest('jobId is required'));

  const result = await ReportService.initiateWorkflow(jobId, additionalInstructions, req.user._id);
  res.status(result.statusCode).json(result);
});

router.post('/initiate-workflow', initiateWorkflow);
router.post('/generate-ai', initiateWorkflow);

// ─────────────────────────────────────────────
// PATCH /api/reports/:reportId
// ─────────────────────────────────────────────
router.patch('/:reportId', asyncHandler(async (req, res) => {
  const result = await ReportService.updateReport(
    req.params.reportId,
    req.body,
    null,
    req
  );
  // Invalidate cache after update
  if (result.data?.reportNo) {
    invalidateCachedPdf(result.data.reportNo, req);
  }
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/:reportId/submit-review
// ─────────────────────────────────────────────
router.post('/:reportId/submit-review', asyncHandler(async (req, res) => {
  const result = await ReportService.submitForReview(
    req.params.reportId,
    req.user._id,
    req.user.role,
    req.body.comment
  );
  if (result.data?.reportNo) invalidateCachedPdf(result.data.reportNo);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/:reportId/qa-verify
// ─────────────────────────────────────────────
router.post('/:reportId/qa-verify', asyncHandler(async (req, res) => {
  const result = await ReportService.qaVerify(
    req.params.reportId,
    req.user._id,
    req.user.role,
    req.body.comment
  );
  if (result.data?.reportNo) invalidateCachedPdf(result.data.reportNo);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/:reportId/final-approve
// ─────────────────────────────────────────────
router.post('/:reportId/final-approve', asyncHandler(async (req, res) => {
  const result = await ReportService.finalApprove(
    req.params.reportId,
    req.user._id,
    req.user.role,
    req.body.comment
  );
  if (result.data?.reportNo) invalidateCachedPdf(result.data.reportNo);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// GET /api/reports/:reportId/review-history
// ─────────────────────────────────────────────
router.get('/:reportId/review-history', asyncHandler(async (req, res) => {
  const result = await ReportService.getReviewHistory(req.params.reportId);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// DELETE /api/reports/:reportId
// ─────────────────────────────────────────────
router.delete('/:reportId', asyncHandler(async (req, res) => {
  const result = await ReportService.deleteReport(req.params.reportId);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/sync-photos/:reportId
// ─────────────────────────────────────────────
router.post('/sync-photos/:reportId', asyncHandler(async (req, res) => {
  const result = await ReportService.syncPhotos(req.params.reportId);
  res.status(result.statusCode).json(result);
}));
