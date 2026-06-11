const mongoose = require('mongoose');

const workDetailSchema = new mongoose.Schema({
  jobNo:        { type: String, required: true },
  equipment:    String,
  eqNo:         String,
  date:         String,
  workType:     { type: String, enum: ['Disassembly', 'Inspection', 'Repair', 'Assembly', 'Testing', 'Other'] },
  description:  String,
  technicianName: String,
  hoursSpent:   String,
  partsUsed:    String,
  images:       [String],
  status:       { type: String, enum: ['In Progress', 'Completed'], default: 'In Progress' },
  notes:        String,
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Performance Indexes
workDetailSchema.index({ jobNo: 1 });
workDetailSchema.index({ workType: 1 });
workDetailSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WorkDetail', workDetailSchema);
