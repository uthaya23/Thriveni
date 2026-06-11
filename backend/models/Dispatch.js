const mongoose = require('mongoose');

// Checklist sub-schema
const checklistSchema = new mongoose.Schema({
  item: String,
  checked: { type: String, enum: ['Yes', 'No', 'N/A'], default: 'No' }
}, { _id: false });

const dispatchSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },

  dispatchDate: String,
  transportDetails: String,
  checklist: [checklistSchema],
  dispatchPhotos: [String], // Array of photo URLs or base64

  status: { type: String, enum: ['Pending','Dispatched','Delivered'], default: 'Pending' },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Dispatch', dispatchSchema);
