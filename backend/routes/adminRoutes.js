const express = require('express');
const router = express.Router();
const { MachineModel, ComponentType } = require('../models/AdminLookups');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

router.use(protect);

// ── MACHINE MODELS ────────────────────────────
router.get('/machine-models', asyncHandler(async (req, res) => {
  res.json(await MachineModel.find().sort({ name: 1 }));
}));

router.post('/machine-models', adminOnly, asyncHandler(async (req, res) => {
  res.status(201).json(await MachineModel.create(req.body));
}));

router.put('/machine-models/:id', adminOnly, asyncHandler(async (req, res) => {
  const doc = await MachineModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
}));

router.delete('/machine-models/:id', adminOnly, asyncHandler(async (req, res) => {
  await MachineModel.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

// ── COMPONENT TYPES ───────────────────────────
router.get('/component-types', asyncHandler(async (req, res) => {
  res.json(await ComponentType.find().sort({ name: 1 }));
}));

router.post('/component-types', adminOnly, asyncHandler(async (req, res) => {
  res.status(201).json(await ComponentType.create(req.body));
}));

router.put('/component-types/:id', adminOnly, asyncHandler(async (req, res) => {
  const doc = await ComponentType.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
}));

router.delete('/component-types/:id', adminOnly, asyncHandler(async (req, res) => {
  await ComponentType.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;
