const mongoose = require('mongoose');

// Unified data store for all stage data for a single job.
// Replaces: Inspection, Dismantling, Assembly, Testing, Dispatch models.

const jobDataSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },
  componentTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'ComponentTemplate' },

  // ── Stage 1: Visual Inspection & Incoming Assessment ──
  stage1: {
    technician: String,
    startDate: String,
    completionDate: String,
    photos: [String],
    // { 'Drive Ring Present': { checked: true, date: '2024-01-01' } }
    incomingChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'IR S-G': { value: 5.2, appliedVoltage: 1000, status: 'Pass' } }
    electricalTests: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'Magnetic Pickup': { status: 'Available', remark: '' } }
    partsChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },
    surgeTests: { type: mongoose.Schema.Types.Mixed, default: {} },
    sensorTests: { type: mongoose.Schema.Types.Mixed, default: {} },
    overallRemarks: String,
    // 'Proceed to Overhaul' | 'Send to Vendor' | 'On Hold'
    inspectionDecision: String,
    inspectionDecisionReason: String,
    aiSummary: String,
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
  },

  // ── Stage 2: Dismantling & Analysis ──
  stage2: {
    technician: String,
    startDate: String,
    completionDate: String,
    photos: [String],
    // { 'Drive Ring Removed': { checked: true, date: '2024-01-02' } }
    dismantlingChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'NDE Bearing Seat': { actual: 129.98, status: 'Pass' } }
    dimensionalMeasurements: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'Armature': { decision: 'Reuse', remark: '' } }
    componentConditionAssessment: { type: mongoose.Schema.Types.Mixed, default: {} },
    overallRemarks: String,
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
  },

  // ── Stage 3: Pre-Assembly & Assembly ──
  stage3: {
    technician: String,
    startDate: String,
    completionDate: String,
    preAssemblyStartDate: String,
    preAssemblyCompletionDate: String,
    assemblyStartDate: String,
    assemblyCompletionDate: String,
    photos: [String],
    // { 'Parts Cleaned': { checked: true, date: '2024-01-05' } }
    preAssemblyChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'Armature Installed': { checked: true, date: '2024-01-06' } }
    assemblyChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'Exciter Pole': { actual: 310, status: 'Pass' } }
    torqueVerifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    materialsUsed: [{
      name: String,
      quantity: String,
      unit: String,
      partNo: String
    }],
    consumablesUsed: [{
      name: String,
      quantity: String,
      unit: String
    }],
    overallRemarks: String,
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
  },

  // ── Stage 4: Testing & Dispatch ──
  stage4: {
    technician: String,
    startDate: String,
    completionDate: String,
    photos: [String],
    // { 'IR Armature': { value: 5.5, status: 'Pass' } }
    electricalTests: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'No Load Run Test': { status: 'Pass' } }
    functionalTests: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'RTD': { resistanceValue: 108, status: 'Pass' } }
    sensorTests: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'Armature Coil': { waveform: 'Balanced', appliedVoltage: 500, status: 'Pass' } }
    surgeTests: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { 'QA Approved': { checked: true, date: '2024-01-10' } }
    dispatchChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },
    qaApprovedBy: String,
    qaApprovedDate: String,
    overallRemarks: String,
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
  }
}, { timestamps: true });

const AuditService = require('../services/AuditService');

// Post-save hook — log every stage save
jobDataSchema.post('save', async function(doc) {
  try {
    // Determine which stage was most recently updated
    const stages = ['stage1', 'stage2', 'stage3', 'stage4'];
    const stageNumbers = { stage1: 1, stage2: 2, stage3: 3, stage4: 4 };

    for (const stageName of stages) {
      if (doc[stageName]?.status === 'Completed' || doc[stageName]?.technician) {
        await AuditService.log({
          entityType: 'JobData',
          entityId: doc._id,
          entityRef: doc._jobNo || String(doc.job),
          action: 'stage_saved',
          stage: stageNumbers[stageName],
          summary: `Stage ${stageNumbers[stageName]} data saved`,
          performedBy: doc._savedBy || doc.job,
          req: null
        });
        break; // break loop to avoid logging multiple stages for a single save
      }
    }
  } catch (err) {
    // Never block saves
  }
});

module.exports = mongoose.model('JobData', jobDataSchema);
