require('dotenv').config();
const mongoose = require('mongoose');
const Asset = require('./models/Asset');
const Job = require('./models/Job');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to DB');

  const totalJobs = await Job.countDocuments();
  console.log('Total Jobs in System:', totalJobs);

  const assets = await Asset.find();
  console.log('Total Assets:', assets.length);

  for (const asset of assets) {
    const jobsWithSerial = await Job.find({ serialNumber: asset.serialNumber });
    console.log(`Asset ${asset.serialNumber}: has ${asset.jobs.length} in array, ${asset.totalRebuildCount} in count field, but ${jobsWithSerial.length} jobs in Job collection`);
    
    // Auto-fix
    if (jobsWithSerial.length > 0) {
       asset.jobs = jobsWithSerial.map(j => j._id);
       asset.totalRebuildCount = jobsWithSerial.length;
       await asset.save();
    }
  }
  
  console.log('✅ Auto-fixed asset job links');
  mongoose.disconnect();
}
run();
