const express = require('express');
const router = express.Router();
const ComponentTemplate = require('../models/ComponentTemplate');
const JobData = require('../models/JobData');
const ApiResponse = require('../utils/apiResponse');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Add authentication middleware for all routes except GET (read-only for tech apps if needed, but let's protect everything)
router.use(protect);

// GET all templates (for admin/listing)
router.get('/', async (req, res) => {
  try {
    const templates = await ComponentTemplate.find({ status: 'Active' })
      .select('componentKey displayName equipmentModels componentType make revision status department section');
    res.json(ApiResponse.success('Templates retrieved successfully', templates));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// GET single template by componentKey or by equipmentModel and componentType
router.get('/by-model/:model', async (req, res) => {
  try {
    const { componentType } = req.query;
    let query = {
      equipmentModels: req.params.model,
      status: 'Active'
    };
    if (componentType) {
      query.componentType = new RegExp(`^${componentType.trim()}$`, 'i');
    }
    let template = await ComponentTemplate.findOne(query);
    if (!template && componentType) {
      // Fallback: search by model only if specific component type template is not found
      template = await ComponentTemplate.findOne({
        equipmentModels: req.params.model,
        status: 'Active'
      });
    }
    if (!template) return res.status(404).json(ApiResponse.notFound('No template found for this model'));
    res.json(ApiResponse.success('Template retrieved successfully', template));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// GET template by key
router.get('/:key', async (req, res) => {
  try {
    const template = await ComponentTemplate.findOne({ componentKey: req.params.key, status: 'Active' });
    if (!template) return res.status(404).json(ApiResponse.notFound('Template not found'));
    res.json(ApiResponse.success('Template retrieved successfully', template));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// ── JobData Routes ─────────────────────────────────────────────────

// GET job data for a job
router.get('/jobdata/:jobId', async (req, res) => {
  try {
    let jobData = await JobData.findOne({ job: req.params.jobId });
    if (!jobData) {
      // Auto-create empty record on first access
      jobData = await JobData.create({ job: req.params.jobId });
    }
    res.json(ApiResponse.success('Job data retrieved successfully', jobData));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// PUT update a specific stage's data
router.put('/jobdata/:jobId/stage/:stageNum', async (req, res) => {
  try {
    const Job = require('../models/Job');
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json(ApiResponse.error('Job not found'));
    
    // R-PERM-006: Read-Only After Completion Lock
    if ((job.status === 'Completed' || job.stage === 'Completed') && req.user.role !== 'admin') {
      return res.status(403).json(ApiResponse.error('This job is completed and permanently locked.'));
    }

    const stageKey = `stage${req.params.stageNum}`;
    const update = { [stageKey]: req.body };

    let jobData = await JobData.findOneAndUpdate(
      { job: req.params.jobId },
      { $set: update },
      { new: true, upsert: true, runValidators: false }
    );

    // Synchronize dates and details to the Job document
    const syncJobDetailsFromStages = require('../utils/syncJobDetails');
    syncJobDetailsFromStages(req.params.jobId).catch(err => console.error(err));

    res.json(ApiResponse.success('Job stage data updated successfully', jobData));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// POST publish a new revision of a template
router.post('/:key/publish', adminOnly, async (req, res) => {
  try {
    const { key } = req.params;
    const updateData = req.body;
    
    // 1. Find the current active template
    const currentActive = await ComponentTemplate.findOne({ componentKey: key, status: 'Active' });
    
    let newRevision = 1;
    if (currentActive) {
      // 2. Mark current as Superseded
      currentActive.status = 'Superseded';
      await currentActive.save();
      newRevision = currentActive.revision + 1;
    }
    
    // 3. Create the new template revision
    const newTemplateData = {
      ...updateData,
      componentKey: key,
      revision: newRevision,
      status: 'Active',
      publishedAt: new Date()
      // Note: publishedBy and templateHash can be set here later
    };
    
    // Clean up _id if present in payload
    delete newTemplateData._id;
    delete newTemplateData.createdAt;
    delete newTemplateData.updatedAt;
    delete newTemplateData.__v;
    
    const newTemplate = await ComponentTemplate.create(newTemplateData);
    
    res.json(ApiResponse.success('New template revision published', newTemplate));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

module.exports = router;
