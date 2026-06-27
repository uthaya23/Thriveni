const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const ApiResponse = require('../utils/apiResponse');

router.use(protect, adminOnly);

router.get('/', asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(ApiResponse.success('Users retrieved successfully', users));
}));

router.post('/', asyncHandler(async (req, res) => {
  const u = await User.create(req.body);
  res.status(201).json(ApiResponse.created({ _id: u._id, name: u.name, username: u.username, role: u.role }, 'User created successfully'));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json(ApiResponse.notFound('User not found'));

  user.name = req.body.name || user.name;
  user.username = req.body.username || user.username;
  user.role = req.body.role || user.role;
  if (req.body.active !== undefined) user.active = req.body.active;
  
  if (req.body.password && req.body.password.trim() !== '') {
    user.password = req.body.password;
  }

  await user.save();
  
  const u = await User.findById(user._id).select('-password');
  res.json(ApiResponse.success('User updated successfully', u));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json(ApiResponse.success('User deleted successfully', null));
}));

module.exports = router;
