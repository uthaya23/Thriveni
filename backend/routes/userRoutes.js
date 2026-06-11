const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

router.use(protect, adminOnly);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await User.find().select('-password').sort({ createdAt: -1 }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const u = await User.create(req.body);
  res.status(201).json({ _id: u._id, name: u.name, username: u.username, role: u.role });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
  res.json(u);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
}));

module.exports = router;
