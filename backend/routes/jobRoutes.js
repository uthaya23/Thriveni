/**
 * Job Routes
 * Defines all job-related API endpoints
 */

const express = require('express');
const router = express.Router();
const JobController = require('../controllers/jobController');
const JobService = require('../services/jobService');
const { protect, notTechnician } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const { validateRequest } = require('../middleware/validationMiddleware');
const {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  jobIdSchema
} = require('../validations/jobValidation');

// Apply authentication middleware to all routes
router.use(protect);

// Job CRUD operations
router.post('/', asyncHandler(JobController.createJob));
router.get('/', validateRequest(jobQuerySchema, 'query'), asyncHandler(JobController.getJobs));
router.get('/all', validateRequest(jobQuerySchema, 'query'), asyncHandler(JobController.getJobs));
router.get('/:id', validateRequest(jobIdSchema, 'params'), asyncHandler(JobController.getJobById));
router.put('/:id', notTechnician, validateRequest(jobIdSchema, 'params'), validateRequest(updateJobSchema), asyncHandler(JobController.updateJob));
router.delete('/:id', notTechnician, validateRequest(jobIdSchema, 'params'), asyncHandler(JobController.deleteJob));

// Job statistics
router.get('/stats/summary', asyncHandler(JobController.getJobStats));

// Filtered job queries
router.get('/status/:status', validateRequest(jobQuerySchema, 'query'), asyncHandler(JobController.getJobsByStatus));
router.get('/priority/:priority', validateRequest(jobQuerySchema, 'query'), asyncHandler(JobController.getJobsByPriority));

// Search and special queries
router.get('/search/query', validateRequest(jobQuerySchema, 'query'), asyncHandler(JobController.searchJobs));
router.get('/overdue/list', validateRequest(jobQuerySchema, 'query'), asyncHandler(JobController.getOverdueJobs));
router.get('/due-today/list', validateRequest(jobQuerySchema, 'query'), asyncHandler(JobController.getJobsDueToday));
router.get('/due-week/list', validateRequest(jobQuerySchema, 'query'), asyncHandler(JobController.getJobsDueThisWeek));

// Bulk operations
router.put('/bulk/update', notTechnician, asyncHandler(JobController.bulkUpdateJobs));

// Admin only - view and restore deleted jobs
router.get('/deleted/list', asyncHandler(async (req, res) => {
  const result = await JobService.getDeletedJobs();
  res.status(result.statusCode).json(result);
}));

router.put('/deleted/:id/restore', asyncHandler(async (req, res) => {
  const result = await JobService.restoreJob(req.params.id, req.user?._id);
  res.status(result.statusCode).json(result);
}));

module.exports = router;
