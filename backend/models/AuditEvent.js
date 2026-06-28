const mongoose = require('mongoose');

/**
 * AuditEvent Model
 *
 * Permanent, append-only record of all important changes.
 * Never updated. Never deleted. Write once, read many.
 *
 * Covers: Job, JobData, Report, InventoryItem, InventoryTransaction,
 *         ProductionPlan, Asset, User
 */
const auditEventSchema = new mongoose.Schema({

  // ── What changed ─────────────────────────────────────────
  entityType: {
    type: String,
    required: true,
    enum: [
      'Job',
      'JobData',
      'Report',
      'InventoryItem',
      'InventoryTransaction',
      'ProductionPlan',
      'Asset',
      'User',
      'ComponentTemplate'
    ]
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // Human readable reference — jobNo, reportNo, itemName etc
  entityRef: {
    type: String
  },

  // ── What happened ─────────────────────────────────────────
  action: {
    type: String,
    required: true,
    enum: [
      'created',
      'updated',
      'deleted',
      'restored',
      'stage_saved',
      'report_generated',
      'report_submitted',
      'report_qa_verified',
      'report_final_approved',
      'report_exported',
      'status_changed',
      'login',
      'logout'
    ]
  },

  // Stage number if action is stage_saved (1, 2, 3, 4)
  stage: {
    type: Number
  },

  // ── What specifically changed ─────────────────────────────
  changes: [{
    field:    { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed }
  }],

  // Summary of the change in plain English
  summary: {
    type: String
  },

  // ── Who did it ────────────────────────────────────────────
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  performedByName: {
    type: String    // denormalised — stored at time of event
  },

  performedByRole: {
    type: String    // denormalised — stored at time of event
  },

  // ── Where from ────────────────────────────────────────────
  ipAddress: {
    type: String
  },

  userAgent: {
    type: String
  }

}, {
  timestamps: true,
  // Never allow updates to audit events
  // This is enforced at the service layer
});

// ── Indexes ───────────────────────────────────────────────────
auditEventSchema.index({ entityType: 1, entityId: 1 });
auditEventSchema.index({ entityType: 1, entityRef: 1 });
auditEventSchema.index({ performedBy: 1 });
auditEventSchema.index({ action: 1 });
auditEventSchema.index({ createdAt: -1 });
auditEventSchema.index({ entityType: 1, createdAt: -1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
