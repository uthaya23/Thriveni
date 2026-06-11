const mongoose = require('mongoose');

// Work Log sub-schema
const workLogSchema = new mongoose.Schema({
  date: Date,
  workDone: String,
  photo: [String] // Updated to array to support multi-photo uploads
}, { _id: false });

// Material Used sub-schema
const materialSchema = new mongoose.Schema({
  itemName: String,
  quantity: Number,
  remarks: String
}, { _id: false });

// Torque Record sub-schema
const torqueRecordSchema = new mongoose.Schema({
  fastenerLocation: String,
  fastenerSize: String,
  specifiedTorque: String,
  appliedTorque: String,
  remarks: String
}, { _id: false });

const assemblySchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },

  team: [String],
  workLogs: [workLogSchema],
  materialsUsed: [materialSchema],
  torqueRecords: [torqueRecordSchema],
  progressPhotos: [String],

  // Technician info
  technicianAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  technicianName: String,     // free text fallback

  // Dates
  startDate: String,
  completionDate: String,
  targetDate: String,

  // Photos
  photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],

  status: { type: String, enum: ['Not Started','In Progress','Completed'], default: 'Not Started' },
}, { timestamps: true });

module.exports = mongoose.model('Assembly', assemblySchema);
