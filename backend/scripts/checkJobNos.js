const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

async function checkJobNos() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const countAll = await Job.countDocuments();
    const countWithJobNo = await Job.countDocuments({ jobNo: { $ne: null, $ne: '' } });
    console.log(`Total jobs: ${countAll}`);
    console.log(`Jobs with jobNo: ${countWithJobNo}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkJobNos();
