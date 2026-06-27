require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  // Show sample of current date values
  const jobs = await Job.find({}, { jobNo: 1, dateReceived: 1, _id: 0 }).limit(10);
  console.log('Sample job dates:');
  console.log(JSON.stringify(jobs, null, 2));

  // Show all date-related fields from one job
  const oneJob = await Job.findOne({}).lean();
  const dateFields = Object.entries(oneJob)
    .filter(([key]) => key.toLowerCase().includes('date'))
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
  console.log('\nAll date fields found:');
  console.log(JSON.stringify(dateFields, null, 2));

  // Count string dates
  const stringCount = await Job.countDocuments({
    dateReceived: { $type: 'string' }
  });
  console.log(`\nJobs with string dateReceived: ${stringCount}`);

  // Count proper Date type
  const dateCount = await Job.countDocuments({
    dateReceived: { $type: 'date' }
  });
  console.log(`Jobs with Date type dateReceived: ${dateCount}`);

  await mongoose.disconnect();
}

check().catch(console.error);
