const mongoose = require('mongoose');

const materialItemSchema = new mongoose.Schema({
  materialCode: String,
  description:  { type: String, required: true },
  quantity:     { type: Number, default: 1 },
  unit:         { type: String, default: 'Nos' },
  unitCost:     { type: Number, default: 0 },
  totalCost:    { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Requested','Approved','Ordered','Received','Not Required'],
    default: 'Requested'
  },
  remarks: String,
  suppliedBy: String,
  receivedDate: String,
}, { timestamps: true });

// Auto-calculate totalCost
materialItemSchema.pre('save', function(next) {
  this.totalCost = this.quantity * this.unitCost;
  next();
});

const materialsSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },
  items: [materialItemSchema],
  totalEstimatedCost: { type: Number, default: 0 },
  notes: String,
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Materials', materialsSchema);
