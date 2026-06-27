const express = require('express');
const router = express.Router();
const ComponentTemplate = require('../models/ComponentTemplate');
const JobData = require('../models/JobData');
const ApiResponse = require('../utils/apiResponse');

// GET all templates (for admin/listing)
router.get('/', async (req, res) => {
  try {
    const templates = await ComponentTemplate.find({ isActive: true })
      .select('componentKey displayName equipmentModels componentType make');
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
      isActive: true
    };
    if (componentType) {
      query.componentType = new RegExp(`^${componentType.trim()}$`, 'i');
    }
    let template = await ComponentTemplate.findOne(query);
    if (!template && componentType) {
      // Fallback: search by model only if specific component type template is not found
      template = await ComponentTemplate.findOne({
        equipmentModels: req.params.model,
        isActive: true
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
    const template = await ComponentTemplate.findOne({ componentKey: req.params.key, isActive: true });
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

module.exports = router;
