const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

  // Which lifecycle stage this photo belongs to
  stage: {
    type: String,
    enum: ['Received','Inspection','Dismantling','Assembly','Testing','Final','Other'],
    default: 'Other'
  },

  filename: { type: String, required: true },
  originalName: String,
  mimetype: String,
  size: Number,                      // bytes

  // URL path served by express static
  url: { type: String, required: true },

  caption: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Performance Indexes
photoSchema.index({ job: 1 });
photoSchema.index({ stage: 1 });
photoSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Photo', photoSchema);
