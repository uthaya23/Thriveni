const mongoose = require('mongoose');

const instrumentSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Megger MIT525"
  type: { type: String, required: true }, // e.g. "Insulation Tester"
  calibrationDueDate: Date,
  status: { type: String, default: 'Active' } // Active, In Calibration, Retired
}, { timestamps: true });

module.exports = mongoose.model('Instrument', instrumentSchema);
