const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, active: true });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }
  res.json({ _id: user._id, name: user.name, username: user.username, role: user.role, token: generateToken(user._id) });
}));

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json(req.user));

// POST /api/auth/seed — creates default admin (run once)
router.post('/seed', asyncHandler(async (req, res) => {
  const exists = await User.findOne({ username: 'admin' });
  if (exists) return res.json({ message: 'Admin already exists' });
  await User.create({ name: 'Administrator', username: 'admin', password: 'thriveni@123', role: 'admin' });
  await User.create({ name: 'Manager', username: 'manager', password: 'rebuilt@2026', role: 'manager' });
  res.json({ message: 'Default users created' });
}));

module.exports = router;
