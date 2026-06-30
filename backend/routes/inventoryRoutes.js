const express = require('express');
const router = express.Router();
const resolveJobId = require('../middleware/resolveJobId');
const inventoryController = require('../controllers/inventoryController');
const { protect, notTechnician } = require('../middleware/authMiddleware');

// All inventory routes require authentication
router.use(protect);
router.use(notTechnician);

// Items
router.route('/')
  .get(inventoryController.getItems)
  .post(inventoryController.createItem);

// Transactions
router.route('/transactions')
  .get(inventoryController.getTransactions);

router.route('/transaction')
  .post(inventoryController.recordTransaction);

// Reports
router.get('/report/monthly', inventoryController.getMonthlyConsumption);
router.get('/report/job/:jobId', resolveJobId('jobId'), inventoryController.getJobConsumption);

module.exports = router;
