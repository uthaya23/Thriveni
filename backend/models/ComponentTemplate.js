const mongoose = require('mongoose');

// ─── Stage 1: Visual Inspection & Incoming Assessment ───
const electricalTestDefSchema = new mongoose.Schema({
  name: String,
  terminals: [String],
  standardValue: String,
  minValue: Number,
  maxValue: Number,
  unit: { type: String, default: 'MΩ' },
  hasAppliedVoltage: { type: Boolean, default: false },
  isRange: { type: Boolean, default: false }
}, { _id: false });

const partSchema = new mongoose.Schema({
  partName: String,
  partNo: String,
  quantity: Number
}, { _id: false });

const measurementSchema = new mongoose.Schema({
  name: String,
  min: Number,
  max: Number,
  unit: { type: String, default: 'mm' }
}, { _id: false });

const torqueSchema = new mongoose.Schema({
  name: String,
  min: Number,
  max: Number,
  unit: { type: String, default: 'lb.ft' }
}, { _id: false });

const sensorTestSchema = new mongoose.Schema({
  name: String,
  hasResistanceValue: { type: Boolean, default: true }
}, { _id: false });

const stage1Schema = new mongoose.Schema({
  incomingChecklist: [String],
  electricalTests: [electricalTestDefSchema],
  partsChecklist: [partSchema],
  surgeTests: [String],
  sensorTests: [sensorTestSchema]
}, { _id: false });

const stage2Schema = new mongoose.Schema({
  dismantlingChecklist: [String],
  dimensionalMeasurements: [measurementSchema],
  componentConditionList: [String]
}, { _id: false });

const stage3Schema = new mongoose.Schema({
  preAssemblyChecklist: [String],
  assemblyChecklist: [String],
  torqueVerifications: [torqueSchema]
}, { _id: false });

const stage4Schema = new mongoose.Schema({
  electricalTests: [electricalTestDefSchema],
  functionalTests: [String],
  sensorTests: [sensorTestSchema],
  surgeTests: [String],
  dispatchChecklist: [String]
}, { _id: false });

const componentTemplateSchema = new mongoose.Schema({
  componentKey: { type: String, required: true, unique: true }, // e.g. 'EH5000_WHEEL_MOTOR'
  displayName: { type: String, required: true },                // e.g. 'EH5000 Wheel Motor'
  equipmentModels: [String],                                    // ['EH5000', 'EH4500']
  componentType: String,                                        // 'Wheel Motor'
  make: String,                                                 // 'HITACHI', 'KOMATSU'
  isActive: { type: Boolean, default: true },

  stage1: stage1Schema,
  stage2: stage2Schema,
  stage3: stage3Schema,
  stage4: stage4Schema
}, { timestamps: true });

module.exports = mongoose.model('ComponentTemplate', componentTemplateSchema);
