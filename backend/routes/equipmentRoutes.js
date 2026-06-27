// equipmentRoutes.js
const express = require('express');
const router = express.Router();
const Equipment = require('../models/Equipment');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const ApiResponse = require('../utils/apiResponse');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const equipment = await Equipment.find().sort({ createdAt: -1 });
  res.json(ApiResponse.success('Equipment list retrieved successfully', equipment));
}));

router.post('/', asyncHandler(async (req, res) => {
  const equipment = await Equipment.create(req.body);
  res.status(201).json(ApiResponse.created(equipment, 'Equipment created successfully'));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(ApiResponse.success('Equipment updated successfully', equipment));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Equipment.findByIdAndDelete(req.params.id);
  res.json(ApiResponse.success('Equipment deleted successfully', null));
}));

module.exports = router;
