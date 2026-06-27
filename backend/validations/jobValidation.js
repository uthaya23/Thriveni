const Joi = require('joi');

// Base job schema — Aligned with industrial Job.js Mongoose model
const jobBaseSchema = {
  jobNo: Joi.string().trim().allow('', null),
  description: Joi.string().trim().required(),
  serialNumber: Joi.string().trim().allow('', null),
  subAssemblyMake: Joi.string().trim().allow('', null),
  equipmentMake: Joi.string().trim().allow('', null),
  partNumber: Joi.string().trim().allow('', null),
  referenceJobNo: Joi.string().trim().allow('', null),
  orderNumber: Joi.string().trim().allow('', null),
  receivedFrom: Joi.string().trim().allow('', null),
  repeatDetails: Joi.string().trim().allow('', null),
  previousRunningHours: Joi.string().trim().allow('', null),
  siteComplaints: Joi.string().trim().allow('', null),
  scopeOfWork: Joi.string().trim().allow('', null),
  dateReceived: Joi.string().trim().allow('', null),
  
  // Stage dates & site info
  disassyDate: Joi.string().trim().allow('', null),
  assyDate: Joi.string().trim().allow('', null),
  sendDate: Joi.string().trim().allow('', null),
  sendSite: Joi.string().trim().allow('', null),

  // Wheel Motor Specific Fields
  finalDriveNo: Joi.string().trim().allow('', null),
  finalDriveModel: Joi.string().trim().allow('', null),
  installedHour: Joi.string().trim().allow('', null),
  installedDate: Joi.string().trim().allow('', null),
  removalHour: Joi.string().trim().allow('', null),
  removalDate: Joi.string().trim().allow('', null),
  lifeHour: Joi.string().trim().allow('', null),

  // Component & Equipment model
  componentType: Joi.string().trim().allow('', null),
  equipmentModel: Joi.string().valid('EH5000', 'EH4500', '830E AC', '830E DC', 'BELAZ', 'OTHER').default('OTHER'),

  // Lifecycle
  stage: Joi.string().allow('', null),
  status: Joi.string().valid('Active', 'Draft', 'Completed', 'Cancelled', 'Pending', 'In Progress', 'Done', 'RFD', 'On Hold').default('Pending'),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').default('Medium'),

  // Audit
  createdBy: Joi.string().hex().length(24).allow(null),
  updatedBy: Joi.string().hex().length(24).allow(null)
};

const createJobSchema = Joi.object(jobBaseSchema);

const updateJobSchema = Joi.object(jobBaseSchema).min(1);

const jobQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(200),
  sortBy: Joi.string().default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().trim().allow('', null),
  status: Joi.string(),
  priority: Joi.string(),
  equipmentModel: Joi.string(),
  componentType: Joi.string(),
  description: Joi.string()
});

const jobIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  jobIdSchema
};