const express = require('express');
const router = express.Router();
const { MachineModel, ComponentType } = require('../models/AdminLookups');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const ApiResponse = require('../utils/apiResponse');

router.use(protect);

// ── MACHINE MODELS ────────────────────────────
router.get('/machine-models', asyncHandler(async (req, res) => {
  const models = await MachineModel.find().sort({ name: 1 });
  res.json(ApiResponse.success('Machine models retrieved successfully', models));
}));

router.post('/machine-models', adminOnly, asyncHandler(async (req, res) => {
  const model = await MachineModel.create(req.body);
  res.status(201).json(ApiResponse.created(model, 'Machine model created successfully'));
}));

router.put('/machine-models/:id', adminOnly, asyncHandler(async (req, res) => {
  const doc = await MachineModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json(ApiResponse.notFound('Machine model not found'));
  res.json(ApiResponse.success('Machine model updated successfully', doc));
}));

router.delete('/machine-models/:id', adminOnly, asyncHandler(async (req, res) => {
  await MachineModel.findByIdAndDelete(req.params.id);
  res.json(ApiResponse.success('Machine model deleted successfully', null));
}));

// ── COMPONENT TYPES ───────────────────────────
router.get('/component-types', asyncHandler(async (req, res) => {
  const types = await ComponentType.find().sort({ name: 1 });
  res.json(ApiResponse.success('Component types retrieved successfully', types));
}));

router.post('/component-types', adminOnly, asyncHandler(async (req, res) => {
  const type = await ComponentType.create(req.body);
  res.status(201).json(ApiResponse.created(type, 'Component type created successfully'));
}));

router.put('/component-types/:id', adminOnly, asyncHandler(async (req, res) => {
  const doc = await ComponentType.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json(ApiResponse.notFound('Component type not found'));
  res.json(ApiResponse.success('Component type updated successfully', doc));
}));

router.delete('/component-types/:id', adminOnly, asyncHandler(async (req, res) => {
  await ComponentType.findByIdAndDelete(req.params.id);
  res.json(ApiResponse.success('Component type deleted successfully', null));
}));

module.exports = router;
