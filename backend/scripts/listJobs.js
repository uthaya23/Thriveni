const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

async function listJobs() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const jobs = await Job.find().limit(50).select('jobNo equipmentModel description createdAt');
    console.log(`Found ${jobs.length} jobs (showing first 50):`);
    jobs.forEach(j => console.log(`- ${j.jobNo}: ${j.description} (${j.equipmentModel})`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listJobs();
