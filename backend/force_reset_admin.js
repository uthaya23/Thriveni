require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

async function resetAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    const admin = await User.findOne({ username: 'admin' });
    if (admin) {
      admin.password = 'thriveni@123';
      admin.needsPasswordChange = false;
      await admin.save();
      console.log('Admin password successfully reset to thriveni@123');
    } else {
      console.log('Admin user not found in the database!');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password:', err);
    process.exit(1);
  }
}

resetAdmin();
