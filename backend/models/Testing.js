const mongoose = require('mongoose');

// IR Test sub-schema
const irTestSchema = new mongoose.Schema({
  terminal: String,
  irValue: String,
  unit: String,
  photo: [String], // Updated to array to support multi-photo uploads
  remarks: String
}, { _id: false });

// Functional Test sub-schema
const functionalTestSchema = new mongoose.Schema({
  parameter: String,
  result: String,
  remarks: String
}, { _id: false });

// Winding Resistance sub-schema
const resistanceTestSchema = new mongoose.Schema({
  terminals: String,
  value: String,
  unit: String,
  remarks: String
}, { _id: false });

// Surge Test sub-schema
const surgeTestSchema = new mongoose.Schema({
  testName: String,
  result: String,
  photo: [String], // Updated to array to support multi-photo uploads
  remarks: String
}, { _id: false });

const testingSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },

  // Stage 4: Testing
  finalIrTests: [irTestSchema],
  finalResistanceTests: [resistanceTestSchema],
  surgeTests: [surgeTestSchema],
  functionalTests: [functionalTestSchema],
  testReports: [String], // Array of report URLs/base64
  testingRemarks: String,

  result: { type: String, enum: ['Pass','Fail','Conditional Pass','Pending'], default: 'Pending' },
  
  testedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
}, { timestamps: true });

module.exports = mongoose.model('Testing', testingSchema);
