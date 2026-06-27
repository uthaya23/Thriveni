const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const ApiResponse = require('../utils/apiResponse');

const { rateLimit } = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 login requests per window
  message: { success: false, message: 'Too many login attempts, please try again after 5 minutes' }
});

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/login
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  let { username, password } = req.body;
  if (username) username = username.trim().toLowerCase();
  
  const user = await User.findOne({ username, active: true });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json(ApiResponse.unauthorized('Invalid username or password'));
  }

  const authUser = {
    _id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    needsPasswordChange: user.needsPasswordChange === false ? false : true,
    token: generateToken(user._id)
  };

  res.json(ApiResponse.success('Login successful', authUser));
}));

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json(ApiResponse.success('Authenticated user retrieved', req.user));
});

// POST /api/auth/change-password
router.post('/change-password', protect, asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json(ApiResponse.error('Password must be at least 6 characters'));
  }
  
  const user = await User.findById(req.user._id);
  user.password = newPassword;
  user.needsPasswordChange = false;
  await user.save();
  
  res.json(ApiResponse.success('Password updated successfully', null));
}));

// POST /api/auth/seed — creates default admin (run once)
router.post('/seed', asyncHandler(async (req, res) => {
  const exists = await User.findOne({ username: 'admin' });
  if (exists) return res.json(ApiResponse.success('Admin already exists', null));
  await User.create({ name: 'Administrator', username: 'admin', password: 'thriveni@123', role: 'admin' });
  await User.create({ name: 'Manager', username: 'manager', password: 'rebuilt@2026', role: 'manager' });
  await User.create({ name: 'Rajeev', username: 'rajeev', password: 'rajeev@123', role: 'technician' });

  res.json(ApiResponse.success('Default users created', null));
}));

module.exports = router;
