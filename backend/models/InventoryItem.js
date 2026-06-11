const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, unique: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Consumable', 'Fuel/Oil'] 
  },
  unit: { 
    type: String, 
    required: true,
    enum: ['Litre', 'Kg', 'Nos', 'gm', 'Set', 'Bottle', 'Meter']
  },
  openingStock: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  minStockLevel: { type: Number, required: true },
  unitCost: { type: Number, default: 0 },
  storeLocation: { type: String },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
