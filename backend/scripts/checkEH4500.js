const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

async function checkEH4500() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const jobs = await Job.find({ equipmentModel: 'EH4500' });
    console.log(`EH4500 jobs: ${jobs.length}`);
    const stages = {};
    jobs.forEach(j => { stages[j.stage] = (stages[j.stage] || 0) + 1; });
    console.log('Stages for EH4500:', stages);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEH4500();
