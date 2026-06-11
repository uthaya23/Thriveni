/**
 * Job Number Generation Utility
 * Generates unique job numbers following the TRC-YYYY-XXXX format
 */

const Job = require('../models/Job');

const generateJobNo = async () => {
  try {
    const year = new Date().getFullYear();
    const prefix = `TRC-${year}-`;

    // Find the highest job number for this year
    const lastJob = await Job.findOne({
      jobNo: { $regex: `^${prefix}` }
    }).sort({ jobNo: -1 });

    let nextNumber = 1;
    if (lastJob && lastJob.jobNo) {
      const lastNumber = parseInt(lastJob.jobNo.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    // Fallback to timestamp-based generation if database query fails
    const timestamp = Date.now();
    return `TRC-${new Date().getFullYear()}-${String(timestamp).slice(-4)}`;
  }
};

module.exports = generateJobNo;