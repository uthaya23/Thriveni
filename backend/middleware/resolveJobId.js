const mongoose = require('mongoose');
const Job = require('../models/Job');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');

/**
 * Middleware to intercept route parameters that might be human-readable Job Number slugs (J-TRC-00021)
 * and resolve them to their actual MongoDB ObjectIds.
 * 
 * @param {string} paramName - The name of the route parameter to check (default: 'jobId')
 */
const resolveJobId = (paramName = 'jobId') => async (req, res, next) => {
  try {
    const rawId = req.params[paramName];
    if (!rawId) return next();

    // If it's already a valid ObjectId, do nothing
    if (mongoose.Types.ObjectId.isValid(rawId) && String(rawId).length === 24) {
      return next();
    }

    // Otherwise, assume it's a URL-friendly jobNo slug (e.g. J-TRC-00021)
    const jobNo = rawId.replace(/-/g, '/');
    const job = await Job.findOne({ jobNo });
    
    if (!job) {
      Logger.warn(`Job not found for slug: ${rawId} (parsed as ${jobNo})`);
      return res.status(404).json(ApiResponse.notFound('Job not found for the given Job Number'));
    }

    // Replace the param with the real ObjectId so downstream controllers work seamlessly
    req.params[paramName] = job._id.toString();
    
    next();
  } catch (error) {
    Logger.error(`Error resolving job ID slug for ${req.params[paramName]}`, error);
    next(error);
  }
};

module.exports = resolveJobId;
