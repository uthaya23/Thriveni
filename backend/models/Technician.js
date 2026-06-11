const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    enum: ['Inspection Bay', 'Dismantling Bay', 'Assembly Bay', 'Testing Station', 'Dispatch Area', 'General', 'Auto Electric'],
    default: 'Auto Electric'
  },
  status: {
    type: String,
    enum: ['Active', 'On Break', 'Idle', 'Unavailable'],
    default: 'Idle'
  },
  currentTask: {
    type: String,
    default: 'Ready for assignment'
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Technician', technicianSchema);
