// equipmentRoutes.js
const express = require('express');
const router = express.Router();
const Equipment = require('../models/Equipment');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await Equipment.find().sort({ createdAt: -1 }));
}));

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(await Equipment.create(req.body));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  res.json(await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Equipment.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;
