require('dotenv').config();
const mongoose = require('mongoose');
const Asset = require('./models/Asset');
const Job = require('./models/Job');
const AssetService = require('./services/AssetService');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to DB');

  const allJobs = await Job.find();
  console.log(`Found ${allJobs.length} Jobs in DB.`);

  let createdCount = 0;
  let linkedCount = 0;

  for (const job of allJobs) {
    if (!job.serialNumber) continue;

    // Ensure the asset exists
    let asset = await Asset.findOne({ serialNumber: job.serialNumber.toUpperCase() });
    
    if (!asset) {
      asset = await Asset.create({
        serialNumber: job.serialNumber.toUpperCase(),
        componentType: job.componentType || 'Unknown',
        equipmentModel: job.equipmentModel || 'Unknown',
        make: job.make || 'Unknown',
        totalRebuildCount: 0,
        jobs: [],
        currentStatus: 'Ready for Dispatch' // Assume older jobs are done
      });
      createdCount++;
    }

    // Link the job if not already linked
    if (!asset.jobs.includes(job._id)) {
      asset.jobs.push(job._id);
      asset.totalRebuildCount = asset.jobs.length;
      
      // Update status if it's an active job
      if (job.stage !== 'Testing & Dispatch' && job.stage !== 'Completed') {
        asset.currentStatus = 'In Workshop';
      }
      
      await asset.save();
      linkedCount++;
    }
  }
  
  console.log(`✅ Backfill Complete: Created ${createdCount} new Assets and linked ${linkedCount} Jobs.`);
  mongoose.disconnect();
}
run();
