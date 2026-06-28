require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const jobService = require('../services/jobService');
const AuditService = require('../services/AuditService');
const User = require('../models/User');

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  const admin = await User.findOne({ username: 'admin' });
  
  console.log('--- TEST 1: Create a job ---');
  const jobRes = await jobService.createJob({
    jobNo: 'AUDIT002',
    description: 'TEST AUDIT',
    equipmentModel: 'EH5000',
    serialNumber: 'SN-AUDIT-002',
    componentType: 'WHEEL MOTOR',
    receivedFrom: 'Tata',
    status: 'Active'
  }, admin._id);
  
  const jobId = jobRes.data._id;
  const jobNo = jobRes.data.jobNo;
  console.log('Job created:', jobNo);
  
  console.log('\n--- TEST 2: Update job status ---');
  await jobService.updateJob(jobId, { status: 'Completed' }, admin._id);
  console.log('Job status updated to Completed');
  
  console.log('\n--- TEST 3: Check Audit Events (Recent) ---');
  const recent = await AuditService.getRecentActivity({ limit: 5 });
  console.log('Total events:', recent.total);
  const createEvent = recent.events.find(e => e.action === 'created' && e.entityRef === 'AUDIT002');
  const updateEvent = recent.events.find(e => e.action === 'status_changed' && e.entityRef === 'AUDIT002');
  
  console.log('Create event found:', !!createEvent);
  console.log('Update event found:', !!updateEvent);
  if (updateEvent) {
    console.log('Update event changes:', JSON.stringify(updateEvent.changes));
  }
  
  console.log('\n--- TEST 4: Get full job audit history ---');
  const history = await AuditService.getJobAuditHistory(jobId, jobNo);
  console.log('History events count:', history.length);
  
  await mongoose.disconnect();
}

runTests().catch(console.error);
