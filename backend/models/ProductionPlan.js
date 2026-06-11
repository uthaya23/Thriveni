const mongoose = require('mongoose');

const productionPlanSchema = new mongoose.Schema({
  month: { 
    type: String, 
    required: true, 
    index: true 
  }, // Format: 'YYYY-MM' (e.g. '2026-05')
  
  make: { 
    type: String, 
    required: true 
  }, // e.g. Komatsu, Hitachi, Caterpillar
  
  model: { 
    type: String, 
    required: true 
  }, // e.g. 830E DC, 830E AC, EH5000
  
  description: { 
    type: String, 
    required: true 
  }, // e.g. Wheel Motor, Main Alternator
  
  scopeOfWork: { 
    type: String, 
    required: true 
  }, // e.g. Servicing, Overhauling
  
  financialYear: {
    type: String, // e.g., '2026-2027'
    required: true,
    default: '2026-2027'
  },
  
  quarter: {
    type: String, // e.g., 'Q1', 'Q2', 'Q3', 'Q4'
    required: true,
    enum: ['Q1', 'Q2', 'Q3', 'Q4'],
    default: 'Q1'
  },

  plannedQty: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  
  prPoStatus: { 
    type: String, 
    enum: ['Pending', 'PR Raised', 'PO Approved', 'Not Required'], 
    default: 'Pending' 
  },
  
  remarksHistory: [{
    remark: String,
    date: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Legacy remarks field, keeping temporarily for backwards compatibility if needed
  remarks: { 
    type: String, 
    default: '' 
  },
  
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

// Ensure compound index for fast fuzzy plan matching
productionPlanSchema.index({ month: 1, make: 1, model: 1 });

module.exports = mongoose.model('ProductionPlan', productionPlanSchema);
