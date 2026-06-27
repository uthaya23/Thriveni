const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const statuses = await Job.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('Status breakdown:');
    statuses.forEach(s => console.log(`- ${s._id}: ${s.count}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkStatus();
