const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');
const User = require('../models/User');
const JobService = require('../services/jobService');

async function testDefaultLimit() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await JobService.getJobs({}); // No params, use defaults
    const jobs = result.data.jobs;
    console.log(`JobService default returned ${jobs.length} jobs.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testDefaultLimit();
