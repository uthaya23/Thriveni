/**
 * Job Service Layer
 * Business logic for Job operations
 */

const Job = require('../models/Job');
const User = require('../models/User');
const ProductionPlan = require('../models/ProductionPlan');
const { MachineModel } = require('../models/AdminLookups');
const generateJobNo = require('../utils/generateJobNo');
const AssetService = require('./AssetService');
const Logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const Pagination = require('../utils/pagination');

/**
 * Fuzzy matches a job to a Monthly Production Plan item
 */
const linkJobToProductionPlan = async (job) => {
  try {
    if (!job.dateReceived) return;
    
    // Extract YYYY-MM from dateReceived (starts with e.g. '2026-05')
    const month = job.dateReceived.substring(0, 7);
    
    // Find all plans for that month
    const plans = await ProductionPlan.find({ month });
    if (plans.length === 0) return;
    
    // Search for a matching target
    const matchedPlan = plans.find(plan => {
      // 1. Make Match (Sub-assembly or equipment make, case insensitive)
      const makeMatch = (job.equipmentMake && job.equipmentMake.toLowerCase() === plan.make.toLowerCase()) ||
                        (job.subAssemblyMake && job.subAssemblyMake.toLowerCase() === plan.make.toLowerCase()) ||
                        (job.description && job.description.toLowerCase().includes(plan.make.toLowerCase()));
                        
      // 2. Model Match
      const modelMatch = job.equipmentModel && job.equipmentModel.toLowerCase() === plan.model.toLowerCase();
      
      // 3. Component Description Match
      const descMatch = (job.componentType && job.componentType.toLowerCase() === plan.description.toLowerCase()) ||
                        (job.description && job.description.toLowerCase().includes(plan.description.toLowerCase()));
                        
      // 4. Scope Match
      const scopeMatch = job.scopeOfWork && job.scopeOfWork.toLowerCase() === plan.scopeOfWork.toLowerCase();
      
      return makeMatch && modelMatch && descMatch && scopeMatch;
    });
    
    if (matchedPlan) {
      job.productionPlan = matchedPlan._id;
    }
  } catch (err) {
    console.error('Error auto-linking job to production plan:', err);
  }
};

class JobService {
  /**
   * Create a new job
   */
  static async createJob(jobData, userId = null) {
    try {
      Logger.info('Creating new job', { customerName: jobData.customerName, userId });

      // Generate job number if not provided
      if (!jobData.jobNo) {
        jobData.jobNo = await generateJobNo();
      }

      // Add audit fields
      if (userId) {
        jobData.createdBy = userId;
        jobData.updatedBy = userId;
      }

      // Validate equipmentModel against MachineModel registry
      if (jobData.equipmentModel) {
        const modelExists = await MachineModel.findOne({ 
          name: jobData.equipmentModel,
          active: true 
        });
        if (!modelExists) {
          return ApiResponse.badRequest(
            `Equipment model "${jobData.equipmentModel}" is not registered. Add it in Admin settings first.`
          );
        }
      }

      const job = new Job(jobData);
      await linkJobToProductionPlan(job);
      await job.save();

      // Auto-create or update asset registry
      await AssetService.findOrCreateAsset(job, userId);

      Logger.info('Job created successfully', { jobId: job._id, jobNo: job.jobNo });
      return ApiResponse.created(job, 'Job created successfully');
    } catch (error) {
      Logger.error('Error creating job', error);
      throw error;
    }
  }

  /**
   * Get all jobs with filtering and pagination
   */
  static async getJobs(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 200,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        status,
        priority,
        equipmentModel, // Changed from equipmentType to match model
        componentType,
        description,
        customerName,
        assignedTo,
        dateFrom,
        dateTo
      } = queryParams;

      let pageNum = parseInt(page, 10);
      let limitNum = parseInt(limit, 10);

      if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
      if (isNaN(limitNum) || limitNum < 1) limitNum = 200;

      // Build filter object
      const filter = {};

      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (equipmentModel) filter.equipmentModel = equipmentModel;
      if (componentType) filter.componentType = componentType;
      if (description) filter.description = description;
      if (customerName) filter.receivedFrom = new RegExp(customerName, 'i');
      if (assignedTo) filter.assignedTo = new RegExp(assignedTo, 'i'); // Keep if added elsewhere, or remove if unused

      // Date range filter
      if (dateFrom || dateTo) {
        filter.dateReceived = {};
        if (dateFrom) filter.dateReceived.$gte = new Date(dateFrom);
        if (dateTo) filter.dateReceived.$lte = new Date(dateTo);
      }

      // Search across multiple fields
      if (search) {
        filter.$or = [
          { jobNo: new RegExp(search, 'i') },
          { receivedFrom: new RegExp(search, 'i') },
          { equipmentModel: new RegExp(search, 'i') },
          { equipmentMake: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ];
      }

      // Pagination
      const pagination = new Pagination(pageNum, limitNum);
      const skip = pagination.getOffset();

      // Sort options
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const jobs = await Job.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean(); // Use lean for better performance and easier spreading

      // Return raw results for maximum compatibility with all frontend components
      const total = await Job.countDocuments(filter);
      
      const result = {
        jobs: jobs,
        pagination: new Pagination(pageNum, limitNum, total).getMeta()
      };

      return ApiResponse.success('Jobs retrieved successfully', result);
    } catch (error) {
      Logger.error('Error retrieving jobs', error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  static async getJobById(jobId) {
    try {
      const job = await Job.findById(jobId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      if (!job) {
        return ApiResponse.notFound('Job not found');
      }

      return ApiResponse.success('Job retrieved successfully', job);
    } catch (error) {
      Logger.error('Error retrieving job by ID', error, { jobId });
      throw error;
    }
  }

  /**
   * Update job by ID
   */
  static async updateJob(jobId, updateData, updatedBy = null) {
    try {
      Logger.info('Updating job', { jobId, updatedBy });

      // Handle completion timestamp
      if (updateData.stage === 'Completed') {
        updateData.completedAt = new Date();
      } else if (updateData.stage && updateData.stage !== 'Completed') {
        updateData.completedAt = null;
      }

      updateData.updatedBy = updatedBy;
      updateData.updatedAt = new Date();

      // Automatically re-evaluate production plan link if match fields are updated
      const tempJob = { ...updateData };
      if (tempJob.dateReceived || tempJob.equipmentMake || tempJob.equipmentModel || tempJob.componentType || tempJob.scopeOfWork) {
        const currentJob = await Job.findById(jobId);
        if (currentJob) {
          const mergedFields = {
            dateReceived: tempJob.dateReceived || currentJob.dateReceived,
            equipmentMake: tempJob.equipmentMake || currentJob.equipmentMake,
            subAssemblyMake: tempJob.subAssemblyMake || currentJob.subAssemblyMake,
            equipmentModel: tempJob.equipmentModel || currentJob.equipmentModel,
            componentType: tempJob.componentType || currentJob.componentType,
            description: tempJob.description || currentJob.description,
            scopeOfWork: tempJob.scopeOfWork || currentJob.scopeOfWork,
          };
          await linkJobToProductionPlan(mergedFields);
          updateData.productionPlan = mergedFields.productionPlan || null;
        }
      }

      const job = await Job.findByIdAndUpdate(
        jobId,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('updatedBy', 'name email');

      if (!job) {
        return ApiResponse.notFound('Job not found');
      }

      Logger.info('Job updated successfully', { jobId, jobNo: job.jobNo });
      return ApiResponse.success('Job updated successfully', job);
    } catch (error) {
      Logger.error('Error updating job', error, { jobId });
      throw error;
    }
  }

  /**
   * Delete job by ID
   */
  static async deleteJob(jobId, deletedBy = null) {
    try {
      Logger.info('Deleting job', { jobId });

      const job = await Job.findById(jobId);

      if (!job) {
        return ApiResponse.notFound('Job not found');
      }

      // Soft delete - never permanently destroy job data
      job.isDeleted = true;
      job.deletedAt = new Date();
      job.deletedBy = deletedBy;
      await job.save();

      Logger.info('Job soft deleted', { jobId, jobNo: job.jobNo, deletedBy });
      return ApiResponse.success('Job deleted successfully', { jobNo: job.jobNo });
    } catch (error) {
      Logger.error('Error deleting job', error, { jobId });
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  static async getJobStats() {
    try {
      const stats = await Job.aggregate([
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            byStatus: {
              $push: '$status'
            },
            byPriority: {
              $push: '$priority'
            },
            totalEstimatedCost: { $sum: { $ifNull: ['$estimatedCost', 0] } },
            totalActualCost: { $sum: { $ifNull: ['$actualCost', 0] } },
            totalEstimatedHours: { $sum: { $ifNull: ['$estimatedHours', 0] } },
            totalActualHours: { $sum: { $ifNull: ['$actualHours', 0] } }
          }
        },
        {
          $project: {
            _id: 0,
            totalJobs: 1,
            statusBreakdown: {
              $arrayToObject: {
                $map: {
                  input: { $setUnion: ['$byStatus'] },
                  as: 'status',
                  in: {
                    k: '$$status',
                    v: { $size: { $filter: { input: '$byStatus', cond: { $eq: ['$$this', '$$status'] } } } }
                  }
                }
              }
            },
            priorityBreakdown: {
              $arrayToObject: {
                $map: {
                  input: { $setUnion: ['$byPriority'] },
                  as: 'priority',
                  in: {
                    k: '$$priority',
                    v: { $size: { $filter: { input: '$byPriority', cond: { $eq: ['$$this', '$$priority'] } } } }
                  }
                }
              }
            },
            totalEstimatedCost: 1,
            totalActualCost: 1,
            totalEstimatedHours: 1,
            totalActualHours: 1
          }
        }
      ]);

      const result = stats[0] || {
        totalJobs: 0,
        statusBreakdown: {},
        priorityBreakdown: {},
        totalEstimatedCost: 0,
        totalActualCost: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0
      };

      return ApiResponse.success('Job statistics retrieved successfully', result);
    } catch (error) {
      Logger.error('Error retrieving job statistics', error);
      throw error;
    }
  }

  /**
   * Bulk update jobs
   */
  static async bulkUpdateJobs(jobIds, updateData, updatedBy = null) {
    try {
      Logger.info('Bulk updating jobs', { jobIds: jobIds.length, updatedBy });

      updateData.updatedBy = updatedBy;
      updateData.updatedAt = new Date();

      const result = await Job.updateMany(
        { _id: { $in: jobIds } },
        updateData,
        { runValidators: true }
      );

      Logger.info('Bulk update completed', { matched: result.matchedCount, modified: result.modifiedCount });
      return ApiResponse.success('Jobs updated successfully', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      Logger.error('Error in bulk update', error);
      throw error;
    }
  }
  /**
   * Get all soft deleted jobs - admin only
   */
  static async getDeletedJobs() {
    // Bypass the soft delete query filter by explicitly setting isDeleted: true
    const jobs = await Job.find({ isDeleted: true })
      .select('jobNo description serialNumber componentType deletedAt deletedBy')
      .populate('deletedBy', 'name email')
      .sort({ deletedAt: -1 });

    return ApiResponse.success('Deleted jobs retrieved', jobs);
  }

  /**
   * Restore a soft deleted job - admin only
   */
  static async restoreJob(jobId, restoredBy = null) {
    // Bypass soft delete filter to find deleted job
    const job = await Job.findOne({ _id: jobId, isDeleted: true });

    if (!job) {
      return ApiResponse.notFound('Deleted job not found');
    }

    job.isDeleted = false;
    job.deletedAt = null;
    job.deletedBy = null;
    await job.save();

    Logger.info('Job restored', { jobId, jobNo: job.jobNo, restoredBy });
    return ApiResponse.success('Job restored successfully', { jobNo: job.jobNo });
  }
}

module.exports = JobService;