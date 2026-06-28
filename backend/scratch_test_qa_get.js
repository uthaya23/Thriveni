require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const admin = await User.findOne({ role: 'admin' });
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  try {
    const res = await fetch('http://localhost:5005/api/qa/6a4000b5b3f0979e8c8c8ceb', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
  process.exit(0);
});
