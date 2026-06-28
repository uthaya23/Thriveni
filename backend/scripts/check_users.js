require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUsers() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}, 'username role active');
  console.log('--- USERS IN DATABASE ---');
  users.forEach(u => {
    console.log(`ID: ${u._id} | Username: "${u.username}" | Role: ${u.role} | Active: ${u.active}`);
  });
  process.exit(0);
}
checkUsers().catch(console.error);
