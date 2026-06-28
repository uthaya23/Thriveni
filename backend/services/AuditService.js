/**
 * AuditService
 *
 * Central service for writing audit events.
 * Called by other services — never called directly from routes.
 *
 * Rules:
 * - Never throws errors that block the main operation
 * - Always fails silently to avoid disrupting business logic
 * - Write only — never updates or deletes audit events
 */

const AuditEvent = require('../models/AuditEvent');
const Logger = require('../utils/logger');

class AuditService {

  /**
   * Log any action on any entity
   *
   * @param {Object} params
   * @param {string} params.entityType    - 'Job', 'JobData', 'Report' etc
   * @param {ObjectId} params.entityId    - MongoDB _id of the entity
   * @param {string} params.entityRef     - Human readable ref (jobNo, reportNo)
   * @param {string} params.action        - Action that occurred
   * @param {number} params.stage         - Stage number (for stage_saved only)
   * @param {Array}  params.changes       - [{field, oldValue, newValue}]
   * @param {string} params.summary       - Plain English summary
   * @param {Object} params.performedBy   - User object {_id, name, role}
   * @param {Object} params.req           - Express request (for IP)
   */
  static async log({
    entityType,
    entityId,
    entityRef,
    action,
    stage,
    changes = [],
    summary,
    performedBy,
    req = null
  }) {
    try {
      const event = {
        entityType,
        entityId,
        entityRef: entityRef || '',
        action,
        changes: changes.filter(c => c.field),
        summary: summary || `${action} on ${entityType} ${entityRef || entityId}`,
        performedBy: performedBy?._id || performedBy,
        performedByName: performedBy?.name || performedBy?.username || 'System',
        performedByRole: performedBy?.role || 'unknown',
        ipAddress: req ? (
          req.headers?.['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.ip ||
          'unknown'
        ) : 'system',
        userAgent: req?.headers?.['user-agent'] || 'system'
      };

      if (stage) event.stage = stage;

      await AuditEvent.create(event);

    } catch (err) {
      // Never block the main operation
      Logger.error('AuditService.log failed', err, { entityType, entityId, action });
    }
  }

  /**
   * Compare two objects and return array of changed fields
   * Used to build the changes array automatically
   *
   * @param {Object} oldDoc - Previous state
   * @param {Object} newDoc - New state
   * @param {Array} fields  - Which fields to compare
   * @returns {Array} [{field, oldValue, newValue}]
   */
  static diffFields(oldDoc, newDoc, fields) {
    const changes = [];

    fields.forEach(field => {
      const oldVal = oldDoc?.[field];
      const newVal = newDoc?.[field];

      const oldStr = JSON.stringify(oldVal);
      const newStr = JSON.stringify(newVal);

      if (oldStr !== newStr) {
        changes.push({
          field,
          oldValue: oldVal,
          newValue: newVal
        });
      }
    });

    return changes;
  }

  /**
   * Get audit history for a specific entity
   */
  static async getEntityHistory(entityType, entityId) {
    const events = await AuditEvent.find({ entityType, entityId })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'name role');

    return events;
  }

  /**
   * Get audit history for a job by jobNo
   * Includes Job events AND all related JobData, Report events
   */
  static async getJobAuditHistory(jobId, jobNo) {
    const events = await AuditEvent.find({
      $or: [
        { entityType: 'Job', entityId: jobId },
        { entityType: 'JobData', entityRef: jobNo },
        { entityType: 'Report', entityRef: jobNo }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'name role username');

    return events;
  }

  /**
   * Get recent activity across all entities
   * Used for the admin audit dashboard
   */
  static async getRecentActivity({
    limit = 50,
    skip = 0,
    entityType,
    action,
    performedBy,
    dateFrom,
    dateTo
  } = {}) {
    const filter = {};

    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (performedBy) filter.performedBy = performedBy;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [events, total] = await Promise.all([
      AuditEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('performedBy', 'name role username'),
      AuditEvent.countDocuments(filter)
    ]);

    return { events, total };
  }
}

module.exports = AuditService;
