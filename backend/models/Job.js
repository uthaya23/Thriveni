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
  receivedFrom:     String,
  repeatDetails:    String,
  previousRunningHours: String,
  siteComplaints:   String,
  scopeOfWork:      String,
  dateReceived:     Date,

  // Stage details synced from other collections
  disassyDate:      Date,
  assyDate:         Date,
  sendDate:         Date,
  sendSite:         String,

  // Wheel Motor Specific Fields
  finalDriveNo:     String,
  finalDriveModel:  String,
  installedHour:    String,
  installedDate:    Date,
  removalHour:      String,
  removalDate:      Date,
  lifeHour:         String,

  // Component & Equipment type (links to admin collections)
  componentType:    String,          // e.g. Wheel Motor, Alternator, GBM, MBM
  equipmentModel:   { type: String, default: '' },

  // Lifecycle stage — 5 fixed stages
  // 'Visual Inspection & Incoming Assessment'
  // 'Dismantling & Analysis'
  // 'Pre-Assembly & Assembly'
  // 'Testing & Dispatch'
  // 'Report Generation'
  // 'Completed'
  stage: {
    type: String,
    default: 'Visual Inspection & Incoming Assessment'
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
  assignedTo: String, // Comma separated list of assigned technicians
  inspectionAssignedTo: String,
  productionPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionPlan' },
  
  // Soft Delete fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Performance Indexes
jobSchema.index({ stage: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ serialNumber: 1 });
jobSchema.index({ receivedFrom: 1 });
jobSchema.index({ componentType: 1 });
jobSchema.index({ equipmentModel: 1 });
jobSchema.index({ dateReceived: -1 });
jobSchema.index({ dateReceived: -1, status: 1 });

// Auto-generate jobNo if not provided (prefix J/TRC-)
jobSchema.pre('validate', async function(next) {
  // Auto-generate jobNo only if not provided
  if (!this.jobNo) {
    const count = await mongoose.model('Job').countDocuments();
    this.jobNo = `J/TRC/${String(count + 1).padStart(5, '0')}`;
  }

  // Convert empty strings to null for all Date fields
  // Prevents "" being stored instead of null when frontend sends empty date
  const dateFields = [
    'dateReceived',
    'disassyDate',
    'assyDate',
    'sendDate',
    'installedDate',
    'removalDate',
    'completedAt'
  ];

  dateFields.forEach(field => {
    if (this[field] === '' || this[field] === 'Invalid Date') {
      this[field] = null;
    }
  });

  next();
});

module.exports = mongoose.model('Job', jobSchema);
