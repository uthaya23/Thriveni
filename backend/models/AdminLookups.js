const mongoose = require('mongoose');

// Admin-managed machine model list
const machineModelSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },  // e.g. EH5000
  make:        String,   // e.g. HITACHI
  category:    String,   // e.g. Dumper, Excavator
  description: String,
  active:      { type: Boolean, default: true },
}, { timestamps: true });

// Admin-managed component type list
const componentTypeSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },  // e.g. Wheel Motor
  category:    String,   // e.g. Electrical, Mechanical
  description: String,
  active:      { type: Boolean, default: true },
}, { timestamps: true });

const MachineModel   = mongoose.model('MachineModel', machineModelSchema);
const ComponentType  = mongoose.model('ComponentType', componentTypeSchema);

module.exports = { MachineModel, ComponentType };
