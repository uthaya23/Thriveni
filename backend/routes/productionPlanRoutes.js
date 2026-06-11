const express = require('express');
const router = express.Router();
const ProductionPlanController = require('../controllers/productionPlanController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

// Apply protection middleware
router.use(protect);

// Planning Target CRUD Operations
router.post('/', asyncHandler(ProductionPlanController.createPlanItem));
router.get('/', asyncHandler(ProductionPlanController.getPlansForMonth));
router.put('/:id', asyncHandler(ProductionPlanController.updatePlanItem));
router.delete('/:id', asyncHandler(ProductionPlanController.deletePlanItem));

// Production Planning KPI Dashboard & Charts
router.get('/dashboard', asyncHandler(ProductionPlanController.getDashboardStats));

module.exports = router;
