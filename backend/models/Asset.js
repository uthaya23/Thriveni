const mongoose = require('mongoose');

/**
 * Asset Model
 * Represents a physical component (Wheel Motor, Alternator, GBM, MBM etc)
 * that has its own serial number and returns for multiple rebuilds over its life.
 *
 * One Asset = one physical unit with one serial number
 * One Asset can have many Jobs (one per rebuild)
 *
 * This is the single source of truth for component lifecycle history.
 */
const assetSchema = new mongoose.Schema({

  // ── Identity ──────────────────────────────────────────────
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },

  componentType: {
    type: String,
    required: true   // e.g. Wheel Motor, Alternator, GBM, MBM
  },

  make: {
    type: String     // e.g. SIEMENS, ABB, GE
  },

  partNumber: {
    type: String     // OEM part number if available
  },

  // ── Machine It Belongs To ─────────────────────────────────
  equipmentModel: {
    type: String     // e.g. EH5000, 830E AC
  },

  equipNo: {
    type: String     // specific machine number e.g. EH5000-003
  },

  mountingPosition: {
    type: String     // e.g. Left Front, Right Rear, NDE, DE
  },

  site: {
    type: String     // mine site e.g. Tata Steel, Vedanta
  },

  receivedFrom: {
    type: String     // who sent it (mirrors Job.receivedFrom)
  },

  // ── Rebuild History ───────────────────────────────────────
  jobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],

  totalRebuildCount: {
    type: Number,
    default: 0
  },

  firstReceivedDate: {
    type: Date
  },

  lastReceivedDate: {
    type: Date
  },

  // ── Running Hours History ─────────────────────────────────
  runningHoursHistory: [{
    jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    jobNo:        String,
    hoursAtEntry: Number,   // hours when received for this rebuild
    hoursAtExit:  Number,   // hours when dispatched after rebuild
    recordedAt:   { type: Date, default: Date.now }
  }],

  // ── Current Status ────────────────────────────────────────
  currentStatus: {
    type: String,
    enum: [
      'In Service',      // installed in machine at mine site
      'In Workshop',     // currently being rebuilt
      'Ready for Dispatch', // rebuild complete, waiting for pickup
      'Scrapped',        // end of life, no longer usable
      'On Hold'          // waiting for parts or decision
    ],
    default: 'In Workshop'
  },

  // ── Notes ─────────────────────────────────────────────────
  notes: {
    type: String         // permanent engineering notes about this asset
  },

  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────
assetSchema.index({ componentType: 1 });          // filter by type
assetSchema.index({ equipmentModel: 1 });         // filter by OEM model
assetSchema.index({ equipNo: 1 });                // filter by machine number
assetSchema.index({ site: 1 });                   // filter by site
assetSchema.index({ currentStatus: 1 });          // filter by status
assetSchema.index({ lastReceivedDate: -1 });      // sort by most recent

module.exports = mongoose.model('Asset', assetSchema);
