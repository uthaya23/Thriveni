const express = require('express');
const router = express.Router();
const Technician = require('../models/Technician');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Get all technicians
router.get('/all', async (req, res) => {
  try {
    const technicians = await Technician.find({ active: true }).sort('name');
    res.json({ success: true, technicians });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single technician
router.get('/:id', async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id);
    if (!technician) return res.status(404).json({ success: false, message: 'Technician not found' });
    res.json({ success: true, technician });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create technician (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, department, status, currentTask } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Technician name is required' });
    }
    
    const technician = new Technician({
      name: name.trim(),
      department: department || 'General',
      status: status || 'Idle',
      currentTask: currentTask || 'Ready for assignment'
    });
    
    await technician.save();
    res.status(201).json({ success: true, technician, message: 'Technician added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update technician (Admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, department, status, currentTask, active } = req.body;
    
    const technician = await Technician.findById(req.params.id);
    if (!technician) return res.status(404).json({ success: false, message: 'Technician not found' });
    
    if (name !== undefined) technician.name = name.trim();
    if (department !== undefined) technician.department = department;
    if (status !== undefined) technician.status = status;
    if (currentTask !== undefined) technician.currentTask = currentTask;
    if (active !== undefined) technician.active = active;
    
    await technician.save();
    res.json({ success: true, technician, message: 'Technician updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete technician (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id);
    if (!technician) return res.status(404).json({ success: false, message: 'Technician not found' });
    
    // Soft delete - mark as inactive
    technician.active = false;
    await technician.save();
    
    res.json({ success: true, message: 'Technician deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
