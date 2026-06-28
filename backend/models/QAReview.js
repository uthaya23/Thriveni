const mongoose = require('mongoose');

/**
 * QAReview Model
 *
 * Records the QA approval or rejection for Stage 3 (Assembly).
 * A job cannot advance to Stage 4 without an approved QAReview.
 * One QAReview per job — updated in place if resubmitted.
 */
const qaReviewSchema = new mongoose.Schema({

  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    unique: true    // one QA review per job
  },

  jobNo: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },

  // Who submitted for QA review
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  submittedAt: {
    type: Date
  },

  // Who reviewed (manager or admin)
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  reviewedAt: {
    type: Date
  },

  // Manager findings and decision
  findings: {
    type: String
  },

  rejectionReason: {
    type: String
  },

  approvalNotes: {
    type: String
  },

  // History of all submissions and reviews
  // Supports multiple rejection-resubmission cycles
  history: [{
    action: {
      type: String,
      enum: ['submitted', 'approved', 'rejected', 'resubmitted']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedByName: String,
    comment: String,
    date: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

qaReviewSchema.index({ job: 1 });
qaReviewSchema.index({ status: 1 });
qaReviewSchema.index({ jobNo: 1 });

module.exports = mongoose.model('QAReview', qaReviewSchema);
