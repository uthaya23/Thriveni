const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');
const JobService = require('../services/jobService');

async function testGetJobs() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await JobService.getJobs({ limit: 1000 });
    const jobs = result.data.jobs;
    console.log(`JobService returned ${jobs.length} jobs.`);
    console.log(`Total count in result: ${result.data.pagination.total}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testGetJobs();
