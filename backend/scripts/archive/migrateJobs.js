const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Job = require('../models/Job');
const Inspection = require('../models/Inspection');

async function migrateJobs() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to DB');

    // 1. Update Job Stages
    const result1 = await Job.updateMany(
      { stage: 'Inspection' },
      { $set: { stage: 'Visual Inspection' } }
    );
    console.log(`Updated ${result1.modifiedCount} jobs from Inspection to Visual Inspection`);

    // 2. Clear out Inspection collections so the new template stages take effect
    // Since this is a dev/prototype, dropping the current inspections to get the fresh template is easiest.
    const result2 = await Inspection.deleteMany({});
    console.log(`Deleted ${result2.deletedCount} old inspections to allow fresh OEM framework load`);

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrateJobs();
