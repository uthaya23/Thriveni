const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

const stageMapping = {
  'Received': 'Visual Inspection & Incoming Assessment',
  'Overview': 'Visual Inspection & Incoming Assessment',
  'Visual Inspection': 'Visual Inspection & Incoming Assessment',
  'Dismantling': 'Dismantling & Analysis',
  'Inspection & Analysis': 'Dismantling & Analysis',
  'Repair / Reclamation': 'Pre-Assembly & Assembly',
  'Pre-Assembly': 'Pre-Assembly & Assembly',
  'Assembly': 'Pre-Assembly & Assembly',
  'Testing': 'Testing & Dispatch',
  'Dispatch': 'Testing & Dispatch',
  'Report': 'Report Generation',
  'Report Generation': 'Report Generation'
};

async function runMigration() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/thriveni';
    console.log('Connecting to MongoDB at:', mongoUri);
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected successfully!');

    const jobs = await Job.find({});
    console.log(`Found ${jobs.length} total jobs in database.`);

    let updatedCount = 0;
    for (const job of jobs) {
      const currentStage = job.stage;
      const targetStage = stageMapping[currentStage] || currentStage;

      if (currentStage !== targetStage) {
        await Job.updateOne({ _id: job._id }, { $set: { stage: targetStage } });
        console.log(`Updated job ${job.jobNo}: '${currentStage}' -> '${targetStage}'`);
        updatedCount++;
      }
    }

    console.log(`Migration completed! Modified ${updatedCount} jobs.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
