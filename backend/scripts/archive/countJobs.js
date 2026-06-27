const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

async function countJobs() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await Job.countDocuments();
    console.log(`Total jobs in database: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

countJobs();
