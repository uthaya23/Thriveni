const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  type:        { type: String, enum: ['830E DC', '830E AC', 'EH5000', 'EH4500', 'BELAZ'], required: true },
  equipNo:     { type: String, required: true },
  name:        String,
  serialNo:    String,
  site:        String,
  status:      { type: String, enum: ['Active', 'Under Maintenance', 'Decommissioned'], default: 'Active' },
  totalLifeHrs: String,
  lastService:  String,
  notes:        String,
}, { timestamps: true });

module.exports = mongoose.model('Equipment', equipmentSchema);
