const express = require('express');
const router = express.Router();
const Technician = require('../models/Technician');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const ApiResponse = require('../utils/apiResponse');

// Get all technicians (now fetches from User model)
router.get('/all', async (req, res) => {
  try {
    const users = await User.find({ active: true, role: { $in: ['technician', 'manager', 'admin'] } }).sort('name');
    const technicians = users.map(u => ({
      _id: u._id,
      name: u.name,
      department: u.role === 'technician' ? 'Workshop' : 'Management'
    }));
    res.json(ApiResponse.success('Technicians retrieved successfully', { technicians }));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// Get single technician
router.get('/:id', async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id);
    if (!technician) return res.status(404).json(ApiResponse.notFound('Technician not found'));
    res.json(ApiResponse.success('Technician retrieved successfully', { technician }));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// Create technician (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, department, status, currentTask } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json(ApiResponse.badRequest('Technician name is required'));
    }
    
    const technician = new Technician({
      name: name.trim(),
      department: department || 'General',
      status: status || 'Idle',
      currentTask: currentTask || 'Ready for assignment'
    });
    
    await technician.save();
    res.status(201).json(ApiResponse.created({ technician }, 'Technician added successfully'));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// Update technician (Admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, department, status, currentTask, active } = req.body;
    
    const technician = await Technician.findById(req.params.id);
    if (!technician) return res.status(404).json(ApiResponse.notFound('Technician not found'));
    
    if (name !== undefined) technician.name = name.trim();
    if (department !== undefined) technician.department = department;
    if (status !== undefined) technician.status = status;
    if (currentTask !== undefined) technician.currentTask = currentTask;
    if (active !== undefined) technician.active = active;
    
    await technician.save();
    res.json(ApiResponse.success('Technician updated successfully', { technician }));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

// Delete technician (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id);
    if (!technician) return res.status(404).json(ApiResponse.notFound('Technician not found'));
    
    // Soft delete - mark as inactive
    technician.active = false;
    await technician.save();
    
    res.json(ApiResponse.success('Technician deleted successfully', null));
  } catch (err) {
    res.status(500).json(ApiResponse.error(err.message));
  }
});

module.exports = router;
