require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const AssetService = require('../services/AssetService');
const Job = require('../models/Job');
const Asset = require('../models/Asset');
const User = require('../models/User');

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Clean up previous test
  await Asset.deleteOne({ serialNumber: 'WM-TEST-001' });
  await Job.deleteMany({ serialNumber: 'WM-TEST-001' });
  
  const admin = await User.findOne({ username: 'admin' });
  
  console.log('--- TEST 1: Create first job ---');
  const job1 = new Job({
    jobNo: 'TEST001',
    description: 'WHEEL MOTOR',
    equipmentModel: 'EH5000',
    serialNumber: 'WM-TEST-001',
    componentType: 'WHEEL MOTOR',
    receivedFrom: 'Tata Steel',
    status: 'Active'
  });
  await job1.save();
  await AssetService.findOrCreateAsset(job1, admin._id);
  
  let asset = await Asset.findOne({ serialNumber: 'WM-TEST-001' }).populate('jobs');
  console.log('Asset created:', !!asset);
  console.log('Total Rebuild Count:', asset?.totalRebuildCount);
  
  console.log('\n--- TEST 2: Duplicate active job check ---');
  const check = await AssetService.checkDuplicateActiveJob('WM-TEST-001');
  console.log('Duplicate check found job:', !!check);
  
  console.log('\n--- TEST 3: Create second job ---');
  const job2 = new Job({
    jobNo: 'TEST002',
    description: 'WHEEL MOTOR',
    equipmentModel: 'EH5000',
    serialNumber: 'WM-TEST-001',
    componentType: 'WHEEL MOTOR',
    receivedFrom: 'Tata Steel',
    status: 'Active'
  });
  await job2.save();
  await AssetService.findOrCreateAsset(job2, admin._id);
  
  asset = await Asset.findOne({ serialNumber: 'WM-TEST-001' }).populate('jobs');
  console.log('Total Rebuild Count:', asset?.totalRebuildCount);
  console.log('Jobs linked:', asset?.jobs.length);
  
  console.log('\n--- TEST 4: Get asset history API simulation ---');
  const history = await AssetService.getAssetHistory('WM-TEST-001');
  console.log('History status:', history.statusCode);
  console.log('History jobs array length:', history.data.jobs.length);
  
  await mongoose.disconnect();
}

runTests().catch(console.error);
