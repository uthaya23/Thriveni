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

    // Stage 1 (Visual Inspection) -> Received date
    if (jobData.stage1) {
      const stage1Date = jobData.stage1.completionDate || jobData.stage1.startDate;
      if (stage1Date && job.dateReceived !== stage1Date) {
        job.dateReceived = stage1Date;
        updated = true;
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

    // Stage 4 (Testing & Dispatch) -> Send date and QA approval
    if (jobData.stage4) {
      const stage4Date = jobData.stage4.completionDate || jobData.stage4.startDate;
      if (stage4Date && job.sendDate !== stage4Date) {
        job.sendDate = stage4Date;
        updated = true;
      }

      // Sync dispatch checklist for send site if available
      const dispatchChecklist = jobData.stage4.dispatchChecklist || {};
      const sendSite = dispatchChecklist.sendSite || dispatchChecklist.site;
      if (sendSite && job.sendSite !== sendSite) {
        job.sendSite = sendSite;
        updated = true;
      }
    }

    if (updated) {
      await job.save();
      Logger.info('Job stage dates synced', { jobNo: job.jobNo });
    }
  } catch (err) {
    Logger.error('Failed to sync stage details for job', err, { jobId });
  }
}

module.exports = syncJobDetailsFromStages;
