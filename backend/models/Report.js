const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

  reportNo: { type: String, unique: true },

  // AI-generated sections
  visualInspectionSummary: String,
  electricalInspectionSummary: String,
  partsConditionAnalysis: String,
  workPerformed: String,
  assemblyDescription: String,
  testingSummary: String,
  finalConclusion: String,
  recommendations: String,
  failureAnalysis: mongoose.Schema.Types.Mixed,
  executiveSummary: String,

  // Raw HTML rendered report
  reportHtml: String,

  // PDF path (if generated)
  pdfPath: String,
  pdfUrl: String,

  // Prompt used
  promptUsed: String,

  // Categorized Photos for the report (allows UI reordering/deletion)
  categorizedPhotos: [{
    category: String, // e.g., 'receivedCondition', 'inspection', 'dismantling'
    url: String,      // Base64 or path
    caption: String,
    order: Number
  }],

  // Meta
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['Draft', 'Under Review', 'QA Verified', 'Final Approved', 'Exported'], 
    default: 'Draft' 
  },

  // Review workflow metadata
  isEngineerReviewed: { type: Boolean, default: false },
  isQaApproved: { type: Boolean, default: false },
  reviewNotes: { type: String },
  approvalNotes: { type: String },
  reviewHistory: [{
    action: { type: String, enum: ['DraftCreated', 'SubmittedForReview', 'EngineerReviewed', 'QAVerified', 'FinalApproved', 'Exported'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
    comment: { type: String },
    date: { type: Date, default: Date.now }
  }],

  version: { type: Number, default: 1 },

  // Soft Delete
  isDeleted:  { type: Boolean, default: false },
  deletedAt:  { type: Date, default: null },
  deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Performance Indexes
reportSchema.index({ job: 1 });
// reportSchema.index({ reportNo: 1 }); // Removed to fix duplicate index warning
reportSchema.index({ createdAt: -1 });
reportSchema.index({ isDeleted: 1 });

// Automatically exclude soft-deleted reports from ALL queries
reportSchema.pre(/^find/, function(next) {
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Auto-generate report number
reportSchema.pre('validate', async function(next) {
  if (!this.reportNo) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Report').countDocuments();
    this.reportNo = `TRC-RPT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);
