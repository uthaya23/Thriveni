require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./backend/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find();
  console.log(users.map(u => ({ username: u.username, role: u.role })));
  process.exit(0);
});
