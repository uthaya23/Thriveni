const mongoose = require('mongoose');

const equipmentFamilySchema = new mongoose.Schema({
  familyName: { type: String, required: true, unique: true }, // e.g. "Mining Trucks"
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('EquipmentFamily', equipmentFamilySchema);
