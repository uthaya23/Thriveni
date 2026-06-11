const mongoose = require('mongoose');

// Work Log sub-schema
const workLogSchema = new mongoose.Schema({
  date: Date,
  workDone: String,
  technician: String,
  photo: [String] // Supports multi-photo array from frontend
}, { _id: false });

// Part Condition sub-schema
const partConditionSchema = new mongoose.Schema({
  partName: String,
  condition: String,
  repairable: String, // 'Yes' / 'No' to match frontend select
  photos: [String],
  remarks: String,
  aiSummary: String
}, { _id: false });

const dismantlingSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  jobNo:         { type: String, required: true },

  startDate:     Date,
  team:          [String],
  workLogs:      [workLogSchema],
  partConditions:[partConditionSchema],
  findings:      [String],

  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Dismantling', dismantlingSchema);
