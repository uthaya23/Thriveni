const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect, notTechnician } = require('../middleware/authMiddleware');
const resolveJobId = require('../middleware/resolveJobId');
const QAReview = require('../models/QAReview');
const Job = require('../models/Job');
const JobData = require('../models/JobData');
const AuditService = require('../services/AuditService');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');

router.use(protect);

// ─────────────────────────────────────────────
// GET /api/qa/pending/list
// Manager dashboard — all jobs pending QA review
// NOTE: This must be before /:jobId to avoid route conflict
// ─────────────────────────────────────────────
router.get('/pending/list', notTechnician, asyncHandler(async (req, res) => {
  const pendingReviews = await QAReview.find({ status: 'Pending' })
    .populate('job', 'jobNo equipmentModel componentType serialNumber receivedFrom')
    .populate('submittedBy', 'name')
    .sort({ submittedAt: 1 }); // oldest first

  res.json(ApiResponse.success('Pending QA reviews retrieved', pendingReviews));
}));

// ─────────────────────────────────────────────
// GET /api/qa/:jobId
// Get QA review status for a job
// ─────────────────────────────────────────────
router.get('/:jobId', resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const review = await QAReview.findOne({ job: req.params.jobId })
    .populate('submittedBy', 'name role')
    .populate('reviewedBy', 'name role')
    .populate('history.performedBy', 'name role');

  if (!review) {
    return res.json(ApiResponse.success('No QA review yet', {
      status: 'Not Submitted',
      review: null
    }));
  }

  res.json(ApiResponse.success('QA review retrieved', review));
}));

// ─────────────────────────────────────────────
// POST /api/qa/:jobId/submit
// Technician or manager submits Stage 3 for QA review
// ─────────────────────────────────────────────
router.post('/:jobId/submit', resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const jobId = req.params.jobId;

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json(ApiResponse.notFound('Job not found'));

  // Create or update QA review
  let review = await QAReview.findOne({ job: jobId });

  if (review && review.status === 'Approved') {
    return res.status(400).json(
      ApiResponse.badRequest('This job has already been QA approved')
    );
  }

  const historyEntry = {
    action: review ? 'resubmitted' : 'submitted',
    performedBy: req.user._id,
    performedByName: req.user.name,
    comment: comment || 'Submitted for QA review',
    date: new Date()
  };

  if (review) {
    // Resubmission after rejection
    review.status = 'Pending';
    review.submittedBy = req.user._id;
    review.submittedAt = new Date();
    review.rejectionReason = null;
    review.history.push(historyEntry);
    await review.save();
  } else {
    // First submission
    review = await QAReview.create({
      job: jobId,
      jobNo: job.jobNo,
      status: 'Pending',
      submittedBy: req.user._id,
      submittedAt: new Date(),
      history: [historyEntry]
    });
  }

  await AuditService.log({
    entityType: 'Job',
    entityId: jobId,
    entityRef: job.jobNo,
    action: 'status_changed',
    summary: `Job ${job.jobNo} submitted for QA review`,
    performedBy: req.user,
    req
  });

  Logger.info('Job submitted for QA review', {
    jobNo: job.jobNo,
    submittedBy: req.user.name
  });

  res.json(ApiResponse.success('Job submitted for QA review', review));
}));

// ─────────────────────────────────────────────
// POST /api/qa/:jobId/approve
// Manager approves QA — unlocks Stage 4
// ─────────────────────────────────────────────
router.post('/:jobId/approve', notTechnician, resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const jobId = req.params.jobId;

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json(ApiResponse.notFound('Job not found'));

  const review = await QAReview.findOne({ job: jobId });
  if (!review) {
    console.error('Approve failed: No QA review found', jobId);
    return res.status(400).json(
      ApiResponse.badRequest('No QA review found for this job')
    );
  }

  if (review.status === 'Approved') {
    console.error('Approve failed: Already approved', jobId);
    return res.status(400).json(
      ApiResponse.badRequest('Job is already QA approved')
    );
  }

  console.log('Approve success! Saving to DB...', jobId);

  // Approve
  review.status = 'Approved';
  review.reviewedBy = req.user._id;
  review.reviewedAt = new Date();
  review.approvalNotes = comment || '';
  review.history.push({
    action: 'approved',
    performedBy: req.user._id,
    performedByName: req.user.name,
    comment: comment || 'QA approved',
    date: new Date()
  });
  await review.save();

  // Update JobData stage4 qaApprovedBy fields
  const jobDataUpdate = await JobData.findOneAndUpdate(
    { job: jobId },
    {
      'stage4.qaApprovedBy': req.user.name,
      'stage4.qaApprovedDate': new Date().toISOString().split('T')[0]
    },
    { new: true }
  );

  // Advance job to Stage 4 — use findByIdAndUpdate directly for reliability
  const updatedJob = await Job.findByIdAndUpdate(
    jobId,
    { $set: { stage: 'Testing & Dispatch' } },
    { new: true }
  );

  if (!updatedJob) {
    Logger.error('Failed to update job stage after QA approval', null, { jobId });
  }

  Logger.info('Job advanced to Stage 4 after QA approval', {
    jobNo: job.jobNo,
    newStage: updatedJob?.stage
  });

  await AuditService.log({
    entityType: 'Job',
    entityId: jobId,
    entityRef: job.jobNo,
    action: 'status_changed',
    summary: `Job ${job.jobNo} QA approved by ${req.user.name} — Stage 4 unlocked`,
    performedBy: req.user,
    req
  });

  Logger.info('Job QA approved', {
    jobNo: job.jobNo,
    approvedBy: req.user.name
  });

  res.json(ApiResponse.success('Job QA approved — Stage 4 unlocked', review));
}));

// ─────────────────────────────────────────────
// POST /api/qa/:jobId/reject
// Manager rejects QA — job returns to Stage 3
// ─────────────────────────────────────────────
router.post('/:jobId/reject', notTechnician, resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const jobId = req.params.jobId;

  if (!reason || !reason.trim()) {
    return res.status(400).json(
      ApiResponse.badRequest('Rejection reason is required')
    );
  }

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json(ApiResponse.notFound('Job not found'));

  const review = await QAReview.findOne({ job: jobId });
  if (!review) {
    return res.status(400).json(
      ApiResponse.badRequest('No QA review found for this job')
    );
  }

  // Reject
  review.status = 'Rejected';
  review.reviewedBy = req.user._id;
  review.reviewedAt = new Date();
  review.rejectionReason = reason;
  review.history.push({
    action: 'rejected',
    performedBy: req.user._id,
    performedByName: req.user.name,
    comment: reason,
    date: new Date()
  });
  await review.save();

  // Return job to Stage 3
  await Job.findByIdAndUpdate(jobId, {
    stage: 'Pre-Assembly & Assembly'
  });

  await AuditService.log({
    entityType: 'Job',
    entityId: jobId,
    entityRef: job.jobNo,
    action: 'status_changed',
    summary: `Job ${job.jobNo} QA rejected by ${req.user.name}. Reason: ${reason}`,
    performedBy: req.user,
    req
  });

  Logger.info('Job QA rejected', {
    jobNo: job.jobNo,
    rejectedBy: req.user.name,
    reason
  });

  res.json(ApiResponse.success('Job returned to Stage 3 for rework', review));
}));

module.exports = router;
