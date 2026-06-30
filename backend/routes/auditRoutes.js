const express = require('express');
const router = express.Router();
const resolveJobId = require('../middleware/resolveJobId');
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/authMiddleware');
const AuditService = require('../services/AuditService');
const ApiResponse = require('../utils/apiResponse');

// All audit routes require authentication
router.use(protect);

// All audit routes require admin or manager role
// We use a custom middleware here since adminOnly only allows admin
const adminOrManager = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    return next();
  }
  return res.status(403).json(
    ApiResponse.error('Access denied. Admin or Manager role required.', 403)
  );
};

router.use(adminOrManager);

// ─────────────────────────────────────────────
// GET /api/audit/recent
// Recent activity feed — admin dashboard
// ─────────────────────────────────────────────
router.get('/recent', asyncHandler(async (req, res) => {
  const {
    limit = 50,
    skip = 0,
    entityType,
    action,
    performedBy,
    dateFrom,
    dateTo
  } = req.query;

  const result = await AuditService.getRecentActivity({
    limit: parseInt(limit),
    skip: parseInt(skip),
    entityType,
    action,
    performedBy,
    dateFrom,
    dateTo
  });

  res.json(ApiResponse.success('Recent activity retrieved', result));
}));

// ─────────────────────────────────────────────
// GET /api/audit/job/:jobId
// Full audit history for a specific job
// ─────────────────────────────────────────────
router.get('/job/:jobId', resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { jobNo } = req.query;

  const events = await AuditService.getJobAuditHistory(jobId, jobNo);
  res.json(ApiResponse.success('Job audit history retrieved', events));
}));

// ─────────────────────────────────────────────
// GET /api/audit/entity/:entityType/:entityId
// Audit history for any specific entity
// ─────────────────────────────────────────────
router.get('/entity/:entityType/:entityId', asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;

  const events = await AuditService.getEntityHistory(entityType, entityId);
  res.json(ApiResponse.success('Entity audit history retrieved', events));
}));

module.exports = router;
