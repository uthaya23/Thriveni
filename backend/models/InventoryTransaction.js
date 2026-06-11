const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ['Received', 'Issued'] 
  },
  item: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'InventoryItem', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  job: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job' 
  },
  issuedTo: { 
    type: String 
  },
  purpose: { 
    type: String 
  },
  supplier: {
    type: String // for 'Received' transactions
  },
  invoiceNumber: {
    type: String // for 'Received' transactions
  },
  unitCost: { 
    type: Number, 
    required: true 
  },
  totalCost: { 
    type: Number, 
    required: true 
  },
  recordedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  remarks: { 
    type: String 
  }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
