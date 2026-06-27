/**
 * Migration: Copy old Dismantling/Assembly/Testing records → JobData
 * Run once: node scripts/migrateOldDataToJobData.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Load Job first so other models can reference it
require('../models/Job');
require('../models/User');
const JobData     = require('../models/JobData');
const Dismantling = require('../models/Dismantling');
const Assembly    = require('../models/Assembly');
const Testing     = require('../models/Testing');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB. Starting migration...\n');
  let migrated = 0;

  // ── Dismantling → JobData.stage2 ─────────────────────────────────
  const dismantlings = await Dismantling.find({}).populate('job', 'jobNo');
  for (const d of dismantlings) {
    if (!d.job?._id) { console.log('  ⚠️  Skipping orphan Dismantling record'); continue; }

    const stage2 = {
      technician:              d.technician || '',
      startDate:               d.startDate  ? new Date(d.startDate).toISOString().split('T')[0] : '',
      completionDate:          d.completionDate ? new Date(d.completionDate).toISOString().split('T')[0] : '',
      photos:                  d.overallPhotos || [],
      dismantlingChecklist:    typeof d.checklist === 'object' ? d.checklist : {},
      dimensionalMeasurements: {},
      componentConditionAssessment: {},
      overallRemarks:          '',
      status:                  'Completed'
    };

    await JobData.findOneAndUpdate(
      { job: d.job._id },
      { $set: { stage2 } },
      { upsert: true, new: true, runValidators: false }
    );
    console.log(`  ✅ Dismantling → stage2 for ${d.job.jobNo}`);
    migrated++;
  }

  // ── Assembly → JobData.stage3 ──────────────────────────────────────
  const assemblies = await Assembly.find({}).populate('job', 'jobNo');
  for (const a of assemblies) {
    if (!a.job?._id) { console.log('  ⚠️  Skipping orphan Assembly record'); continue; }

    // Build assemblyChecklist from workLogs
    const assemblyChecklist = {};
    (a.workLogs || []).forEach((log, i) => {
      const key = log.workDone || `Work Log ${i + 1}`;
      assemblyChecklist[key] = { checked: true, date: log.date ? new Date(log.date).toISOString().split('T')[0] : '' };
    });

    // Build torqueVerifications from torqueRecords
    const torqueVerifications = {};
    (a.torqueRecords || []).forEach(tr => {
      if (tr.fastenerLocation) {
        torqueVerifications[tr.fastenerLocation] = {
          actual: tr.appliedTorque,
          status: tr.appliedTorque ? 'Pass' : 'Pending'
        };
      }
    });

    // Materials used
    const materialsUsed = (a.materialsUsed || []).map(m => ({
      name:     m.itemName || '',
      quantity: String(m.quantity || ''),
      unit:     '',
      partNo:   ''
    }));

    const stage3 = {
      technician:          a.technicianName || '',
      startDate:           a.startDate || '',
      completionDate:      a.completionDate || '',
      photos:              a.progressPhotos || [],
      preAssemblyChecklist: {},
      assemblyChecklist,
      torqueVerifications,
      materialsUsed,
      consumablesUsed: [],
      overallRemarks:  '',
      status:          a.status === 'Completed' ? 'Completed' : 'In Progress'
    };

    await JobData.findOneAndUpdate(
      { job: a.job._id },
      { $set: { stage3 } },
      { upsert: true, new: true, runValidators: false }
    );
    console.log(`  ✅ Assembly → stage3 for ${a.job.jobNo}`);
    migrated++;
  }

  // ── Testing → JobData.stage4 ───────────────────────────────────────
  const testings = await Testing.find({}).populate('job', 'jobNo');
  for (const t of testings) {
    if (!t.job?._id) { console.log('  ⚠️  Skipping orphan Testing record'); continue; }

    // Map whatever fields exist
    const stage4 = {
      technician:      t.technician || t.technicianName || '',
      startDate:       t.startDate || '',
      completionDate:  t.completionDate || '',
      photos:          t.photos || t.overallPhotos || [],
      electricalTests: t.electricalTests || t.irTests || {},
      functionalTests: t.functionalTests || {},
      sensorTests:     t.sensorTests || {},
      surgeTests:      t.surgeTests || {},
      dispatchChecklist: t.dispatchChecklist || {},
      qaApprovedBy:    t.qaApprovedBy || '',
      qaApprovedDate:  t.qaApprovedDate || '',
      overallRemarks:  t.remarks || t.overallRemarks || '',
      status:          t.status || 'Completed'
    };

    await JobData.findOneAndUpdate(
      { job: t.job._id },
      { $set: { stage4 } },
      { upsert: true, new: true, runValidators: false }
    );
    console.log(`  ✅ Testing → stage4 for ${t.job.jobNo}`);
    migrated++;
  }

  console.log(`\n✅ Migration complete. ${migrated} total records migrated.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
