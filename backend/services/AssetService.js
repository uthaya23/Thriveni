/**
 * AssetService
 * Manages the asset serial number registry.
 * Called automatically when jobs are created or completed.
 * Never requires manual intervention for basic lifecycle tracking.
 */

const Asset = require('../models/Asset');
const Job = require('../models/Job');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');

class AssetService {

  /**
   * Find or create an asset when a new job is created.
   * Called automatically by jobService.createJob()
   *
   * If asset exists → link new job, update lastReceivedDate
   * If asset does not exist → create it from job data
   */
  static async findOrCreateAsset(job, userId = null) {
    try {
      const serialNumber = job.serialNumber?.trim().toUpperCase();
      if (!serialNumber) return null;

      let asset = await Asset.findOne({ serialNumber });

      if (asset) {
        // Asset exists — this is a repeat rebuild
        // Link the new job if not already linked
        if (!asset.jobs.map(j => j.toString()).includes(job._id.toString())) {
          asset.jobs.push(job._id);
          asset.totalRebuildCount = asset.jobs.length;
          asset.lastReceivedDate = job.dateReceived || new Date();
          asset.currentStatus = 'In Workshop';

          // Update machine info if provided and not already set
          if (job.equipNo && !asset.equipNo) asset.equipNo = job.equipNo;
          if (job.receivedFrom && !asset.receivedFrom) asset.receivedFrom = job.receivedFrom;
          if (job.subAssemblyMake && !asset.make) asset.make = job.subAssemblyMake;
          if (userId) asset.updatedBy = userId;

          await asset.save();
          Logger.info('Asset updated with new rebuild job', {
            serialNumber,
            jobNo: job.jobNo,
            totalRebuildCount: asset.totalRebuildCount
          });
        }

        return asset;

      } else {
        // First time this asset has been seen — create it
        asset = await Asset.create({
          serialNumber,
          componentType: job.componentType || '',
          make: job.subAssemblyMake || '',
          partNumber: job.partNumber || '',
          equipmentModel: job.equipmentModel || '',
          equipNo: job.finalDriveNo || '',
          site: job.receivedFrom || '',
          receivedFrom: job.receivedFrom || '',
          jobs: [job._id],
          totalRebuildCount: 1,
          firstReceivedDate: job.dateReceived || new Date(),
          lastReceivedDate: job.dateReceived || new Date(),
          currentStatus: 'In Workshop',
          createdBy: userId
        });

        Logger.info('New asset created from job', {
          serialNumber,
          jobNo: job.jobNo,
          componentType: job.componentType
        });

        return asset;
      }

    } catch (err) {
      // Never block job creation if asset tracking fails
      Logger.error('AssetService.findOrCreateAsset failed', err, {
        serialNumber: job.serialNumber,
        jobNo: job.jobNo
      });
      return null;
    }
  }

  /**
   * Update asset status when job is dispatched
   * Called when job status changes to RFD or Completed
   */
  static async markDispatched(serialNumber, jobId, jobNo) {
    try {
      const asset = await Asset.findOne({
        serialNumber: serialNumber?.trim().toUpperCase()
      });

      if (!asset) return;

      asset.currentStatus = 'In Service';
      asset.updatedBy = null;
      await asset.save();

      Logger.info('Asset marked as dispatched', { serialNumber, jobNo });
    } catch (err) {
      Logger.error('AssetService.markDispatched failed', err, { serialNumber });
    }
  }

  /**
   * Get full rebuild history for an asset by serial number
   */
  static async getAssetHistory(serialNumber) {
    const asset = await Asset.findOne({
      serialNumber: serialNumber?.trim().toUpperCase()
    }).populate({
      path: 'jobs',
      select: 'jobNo description dateReceived status stage completedAt equipmentModel componentType scopeOfWork siteComplaints sendDate',
      options: { sort: { dateReceived: 1 } }
    });

    if (!asset) return ApiResponse.notFound('Asset not found');

    return ApiResponse.success('Asset history retrieved', asset);
  }

  /**
   * Get all assets with optional filters
   */
  static async getAssets(query = {}) {
    const filter = { isActive: true };

    if (query.componentType) filter.componentType = new RegExp(query.componentType, 'i');
    if (query.equipmentModel) filter.equipmentModel = query.equipmentModel;
    if (query.site) filter.site = new RegExp(query.site, 'i');
    if (query.status) filter.currentStatus = query.status;
    if (query.search) {
      filter.$or = [
        { serialNumber: new RegExp(query.search, 'i') },
        { equipNo: new RegExp(query.search, 'i') },
        { componentType: new RegExp(query.search, 'i') }
      ];
    }

    const assets = await Asset.find(filter)
      .sort({ lastReceivedDate: -1 })
      .populate('jobs', 'jobNo status dateReceived completedAt');

    return ApiResponse.success('Assets retrieved', assets);
  }

  /**
   * Update asset details manually
   */
  static async updateAsset(assetId, updateData, userId) {
    const asset = await Asset.findByIdAndUpdate(
      assetId,
      { ...updateData, updatedBy: userId },
      { new: true, runValidators: true }
    );

    if (!asset) return ApiResponse.notFound('Asset not found');

    return ApiResponse.success('Asset updated', asset);
  }

  /**
   * Check if serial number already has an active job in workshop
   * Used to warn when creating a new job for a motor already in workshop
   */
  static async checkDuplicateActiveJob(serialNumber) {
    const upperSerial = serialNumber?.trim().toUpperCase();

    const activeJob = await Job.findOne({
      serialNumber: { $regex: new RegExp(`^${upperSerial}$`, 'i') },
      status: { $nin: ['Completed', 'Cancelled'] },
      isDeleted: { $ne: true }
    }).select('jobNo status stage');

    return activeJob;
  }
}

module.exports = AssetService;
