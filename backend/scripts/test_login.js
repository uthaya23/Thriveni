require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

async function testLogin() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const usernameInput = "admin";
  const passwordInput = "thriveni@123"; // Assuming this is the admin password based on seed
  
  let username = usernameInput.trim();
  const user = await User.findOne({ 
    username: { $regex: new RegExp(`^${username}$`, 'i') }, 
    active: true 
  });
  
  if (!user) {
    console.log("User not found!");
  } else {
    const isMatch = await user.matchPassword(passwordInput);
    console.log(`User found: ${user.username}. Password match: ${isMatch}`);
  }
  process.exit(0);
}
testLogin().catch(console.error);
