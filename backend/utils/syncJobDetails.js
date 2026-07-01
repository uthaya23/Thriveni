const Job = require('../models/Job');
const JobData = require('../models/JobData');
const Logger = require('./logger');

/**
 * Synchronizes key dates and metadata from JobData stages to the Job document.
 * Called after any stage is saved to keep Job summary fields current.
 * Single source of truth: JobData only. No legacy model dependencies.
 */
async function syncJobDetailsFromStages(jobId) {
  try {
    const job = await Job.findById(jobId);
    if (!job) return;

    const jobData = await JobData.findOne({ job: jobId });
    if (!jobData) return;

    let updated = false;

    // Stage 1 (Visual Inspection) -> Received date and Vendor Decision
    if (jobData.stage1) {
      const stage1Date = jobData.stage1.completionDate || jobData.stage1.startDate;
      if (stage1Date && job.dateReceived !== stage1Date) {
        job.dateReceived = stage1Date;
        updated = true;
      }
      
      // Auto-advance to Report Generation if sent to vendor to enforce UI skip rules on backend
      if (jobData.stage1.inspectionDecision === 'Send to Vendor') {
        const intermediateStages = [
          'Dismantling & Analysis',
          'Pre-Assembly & Assembly',
          'Testing',
          'Final Drive Installation',
          'Dispatch'
        ];
        if (intermediateStages.includes(job.stage)) {
          job.stage = 'Report Generation';
          job.status = 'On Hold';
          job.delayReason = 'Sent to Vendor';
          updated = true;
        }
      }
    }

    // Stage 2 (Dismantling) -> Disassembly date
    if (jobData.stage2) {
      const stage2Date = jobData.stage2.completionDate || jobData.stage2.startDate;
      if (stage2Date && job.disassyDate !== stage2Date) {
        job.disassyDate = stage2Date;
        updated = true;
      }
    }

    // Stage 3 (Assembly) -> Assembly date
    if (jobData.stage3) {
      const stage3Date = jobData.stage3.completionDate || jobData.stage3.startDate;
      if (stage3Date && job.assyDate !== stage3Date) {
        job.assyDate = stage3Date;
        updated = true;
      }
    }

    // Stage 4 (Testing) -> Testing completion date
    if (jobData.stage4) {
      const stage4Date = jobData.stage4.completionDate || jobData.stage4.startDate;
      if (stage4Date && job.testingDate !== stage4Date) {
        job.testingDate = stage4Date;
        updated = true;
      }

      // State Machine: If Stage 4 is completed, advance to Final Drive or Dispatch
      if (jobData.stage4.status === 'Completed' && job.stage === 'Testing') {
        const isWheelMotor = job.componentType?.toLowerCase().includes('wheel motor') || job.equipmentModel?.toLowerCase().includes('wm');
        
        if (isWheelMotor) {
           job.stage = 'Final Drive Installation';
        } else {
           job.stage = 'Dispatch';
        }
        updated = true;
      }
    }
    
    // Stage 5 (Final Drive Installation) - For Wheel Motors
    if (jobData.stage5 && jobData.stage5.status === 'Completed' && job.stage === 'Final Drive Installation') {
       job.stage = 'Dispatch';
       updated = true;
    }

    // Stage 6 (Dispatch) -> Send date and QA approval
    if (jobData.stage6) {
      const stage6Date = jobData.stage6.completionDate || jobData.stage6.startDate;
      if (stage6Date && job.sendDate !== stage6Date) {
        job.sendDate = stage6Date;
        updated = true;
      }

      // Sync dispatch checklist for send site if available
      const dispatchChecklist = jobData.stage6.dispatchChecklist || {};
      const sendSite = dispatchChecklist.sendSite || dispatchChecklist.site;
      if (sendSite && job.sendSite !== sendSite) {
        job.sendSite = sendSite;
        updated = true;
      }

      // State Machine: If Stage 6 is completed, auto-advance stage to 'Report Generation'
      if (jobData.stage6.status === 'Completed' && job.stage === 'Dispatch') {
        job.stage = 'Report Generation';
        job.status = 'RFD'; // Ready for dispatch / Report pending
        updated = true;
      }
    }

    // State Machine: If the job is marked 'Report Generation' and reports are generated/completed, or if we transition out entirely
    // Wait, the user said: "if the overall task transitions out, it should flag the parent Job.status directly to 'Done' or 'Completed'."
    // This usually means if all stages are 'Completed' and we have reached the end of the workflow.
    // If the stage is explicitly moved to 'Completed', ensure the status is 'Completed'.
    if (job.stage === 'Completed' && job.status !== 'Completed') {
      job.status = 'Completed';
      updated = true;
    }

    if (updated) {
      await job.save();
      Logger.info('Job stage state machine automatically synced', { jobNo: job.jobNo, newStage: job.stage, newStatus: job.status });
    }
  } catch (err) {
    Logger.error('Failed to sync stage details for job', err, { jobId });
  }
}

module.exports = syncJobDetailsFromStages;
