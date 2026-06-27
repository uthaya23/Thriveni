const mongoose = require('mongoose');

const repairMethodSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. "RM001"
  title: { type: String, required: true }, // e.g. "Drying & Baking"
  category: { type: String, default: 'General' },
  description: String,
  estimatedHours: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('RepairMethod', repairMethodSchema);
