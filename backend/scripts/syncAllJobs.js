const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');
const syncJobDetailsFromStages = require('../utils/syncJobDetails');

async function syncAllJobs() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    const jobs = await Job.find({});
    console.log(`Found ${jobs.length} jobs to process.`);

    for (const job of jobs) {
      await syncJobDetailsFromStages(job._id);
    }

    console.log('All jobs processed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration / Sync failed:', err);
    process.exit(1);
  }
}

syncAllJobs();
