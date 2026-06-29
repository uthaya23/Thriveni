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
  inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  issuedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryTransaction' },
}, { timestamps: true });

// Auto-calculate unitCost if only totalCost is provided, or vice versa
materialItemSchema.pre('save', function(next) {
  if (this.isModified('totalCost') || this.isModified('quantity')) {
    // If they provided totalCost from frontend, derive unitCost so it's consistent
    this.unitCost = this.quantity > 0 ? this.totalCost / this.quantity : 0;
  } else if (this.isModified('unitCost')) {
    // Fallback just in case something else only updates unitCost
    this.totalCost = this.quantity * this.unitCost;
  }
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
