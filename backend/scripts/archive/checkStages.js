const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

async function checkStages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const stages = await Job.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } }
    ]);
    console.log('Stage breakdown:');
    stages.forEach(s => console.log(`- ${s._id}: ${s.count}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkStages();
