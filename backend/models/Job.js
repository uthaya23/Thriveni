const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Auto-generated Job ID
  jobNo:            { type: String, required: true, unique: true },

  // Master Info
  description:      { type: String, required: true },
  serialNumber:     { type: String, required: true },
  subAssemblyMake:  String,          // e.g. SIEMENS
  equipmentMake:    String,          // e.g. HITACHI
  partNumber:       String,
  referenceJobNo:   String,
  orderNumber:      String,
  receivedFrom:     { type: String, required: true },
  repeatDetails:    String,
  previousRunningHours: String,
  siteComplaints:   String,
  scopeOfWork:      String,
  dateReceived:     { type: String, required: true },

  // Component & Equipment type (links to admin collections)
  componentType:    String,          // e.g. Wheel Motor, Alternator, GBM, MBM
  equipmentModel:   { type: String, enum: ['EH5000','EH4500','830E AC','830E DC','BELAZ','OTHER'], default: 'OTHER' },

  // Lifecycle stage
  stage: {
    type: String,
    enum: ['Received','Inspection','Dismantling','Assembly','Testing','Dispatch','Completed'],
    default: 'Received'
  },
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Pending', 'In Progress', 'Done', 'RFD', 'On Hold', 'Completed', 'Cancelled'],
    default: 'Pending'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalRepairCost: { type: Number, default: 0 },
  windingResistanceRequired: { type: Boolean, default: false },
  delayReason: String,  // Document reasons for delays (e.g., "Waiting for bearing shaft", "Parts on backorder")
  completedAt: Date,
  failureReportUrl: String,
  failureReportName: String,
  inspectionAssignedTo: { type: String, required: true },
  productionPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionPlan' },
}, { timestamps: true });

// Performance Indexes
jobSchema.index({ stage: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });
// jobSchema.index({ jobNo: 1 }); // Removed to fix duplicate index warning

// Auto-generate jobNo if not provided (prefix J/TRC-)
jobSchema.pre('validate', async function(next) {
  if (!this.jobNo) {
    const count = await mongoose.model('Job').countDocuments();
    this.jobNo = `J/TRC/${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Job', jobSchema);
