const mongoose = require('mongoose');

// Missing parts sub-schema
const missingPartSchema = new mongoose.Schema({
  partName: String,
  quantity: Number,
  photo: String,
  status: String,
  remarks: String,
  aiSummary: String
}, { _id: false });

// IR Test sub-schema
const irTestSchema = new mongoose.Schema({
  terminal: String,
  voltage: Number,
  irValue: String,
  unit: String,
  photo: String,
  remarks: String
}, { _id: false });

const surgeTestSchema = new mongoose.Schema({
  terminal: String,
  voltage: Number,
  result: String,
  photo: String,
  remarks: String
}, { _id: false });

// Winding Resistance sub-schema
const resistanceTestSchema = new mongoose.Schema({
  terminals: String, // e.g. U-V, V-W, W-U
  value: String,
  unit: String, // mΩ or Ω
  remarks: String
}, { _id: false });

const inspectionSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },

  // Stage 1: Received / Initial Inspection
  receivedPhotos: [String],
  initialFindings: String,
  externalCondition: String,
  damageNotes: String,
  missingParts: [missingPartSchema],
  initialIrTests: [irTestSchema],
  surgeTests: [surgeTestSchema],
  initialResistanceTests: [resistanceTestSchema],

  // Photos stored separately (Photo model), but references here
  photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],

  inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inspectionDate: String,
}, { timestamps: true });

module.exports = mongoose.model('Inspection', inspectionSchema);
