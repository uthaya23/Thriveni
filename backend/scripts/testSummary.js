const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

async function testSummary() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const total = await Job.countDocuments();
    console.log('Total jobs:', total);
    
    const byStage = await Job.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }]);
    console.log('By Stage:', byStage);
    
    process.exit(0);
  } catch (err) {
    console.error('Summary test failed:', err);
    process.exit(1);
  }
}

testSummary();
