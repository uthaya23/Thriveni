/**
 * Job Controller Layer
 * Handles HTTP requests and responses for Job operations
 */

const JobService = require('../services/jobService');
const Logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');

class JobController {
  /**
   * Create a new job
   */
  static async createJob(req, res, next) {
    try {
      console.log('--- CREATE JOB REQUEST PAYLOAD ---');
      console.log(JSON.stringify(req.body, null, 2));
      const result = await JobService.createJob(req.body, req.user?._id);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all jobs with filtering and pagination
   */
  static async getJobs(req, res, next) {
    try {
      const result = await JobService.getJobs(req.query);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get job by ID
   */
  static async getJobById(req, res, next) {
    try {
      const result = await JobService.getJobById(req.params.id);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update job by ID
   */
  static async updateJob(req, res, next) {
    try {
      const result = await JobService.updateJob(req.params.id, req.body, req.user?.id);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete job by ID
   */
  static async deleteJob(req, res, next) {
    try {
      const result = await JobService.deleteJob(req.params.id);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get job statistics
   */
  static async getJobStats(req, res, next) {
    try {
      const result = await JobService.getJobStats();
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update jobs
   */
  static async bulkUpdateJobs(req, res, next) {
    try {
      const { jobIds, updates } = req.body;

      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json(ApiResponse.badRequest('jobIds array is required and cannot be empty'));
      }

      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json(ApiResponse.badRequest('updates object is required and cannot be empty'));
      }

      const result = await JobService.bulkUpdateJobs(jobIds, updates, req.user?.id);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get jobs by status
   */
  static async getJobsByStatus(req, res, next) {
    try {
      const { status } = req.params;
      const query = { ...req.query, status };
      const result = await JobService.getJobs(query);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get jobs by priority
   */
  static async getJobsByPriority(req, res, next) {
    try {
      const { priority } = req.params;
      const query = { ...req.query, priority };
      const result = await JobService.getJobs(query);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search jobs
   */
  static async searchJobs(req, res, next) {
    try {
      const { q: search } = req.query;
      if (!search) {
        return res.status(400).json(ApiResponse.badRequest('Search query parameter "q" is required'));
      }

      const query = { ...req.query, search };
      const result = await JobService.getJobs(query);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overdue jobs
   */
  static async getOverdueJobs(req, res, next) {
    try {
      const today = new Date();
      const query = {
        ...req.query,
        dateTo: today.toISOString().split('T')[0], // Today
        status: { $nin: ['Completed', 'Cancelled'] } // Not completed or cancelled
      };

      const result = await JobService.getJobs(query);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get jobs due today
   */
  static async getJobsDueToday(req, res, next) {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const query = {
        ...req.query,
        dateFrom: today.toISOString().split('T')[0],
        dateTo: tomorrow.toISOString().split('T')[0],
        status: { $nin: ['Completed', 'Cancelled'] }
      };

      const result = await JobService.getJobs(query);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get jobs due this week
   */
  static async getJobsDueThisWeek(req, res, next) {
    try {
      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(today.getDate() + 7);

      const query = {
        ...req.query,
        dateFrom: today.toISOString().split('T')[0],
        dateTo: weekFromNow.toISOString().split('T')[0],
        status: { $nin: ['Completed', 'Cancelled'] }
      };

      const result = await JobService.getJobs(query);
      res.status(result.statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = JobController;