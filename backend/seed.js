/**
 * Seed script — run once: node seed.js
 * Creates: default users, machine models, component types, sample jobs
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Job  = require('./models/Job');
const { MachineModel, ComponentType } = require('./models/AdminLookups');

const MONGO_URI = process.env.MONGO_URI;

const MACHINES = [
  { name: 'EH5000',   make: 'HITACHI',   category: 'Dumper',     description: 'Hitachi EH5000 AC Drive 300T Dumper' },
  { name: 'EH4500',   make: 'HITACHI',   category: 'Dumper',     description: 'Hitachi EH4500 AC Drive 220T Dumper' },
  { name: '830E AC',  make: 'KOMATSU',   category: 'Dumper',     description: 'Komatsu 830E AC Drive Dumper' },
  { name: '830E DC',  make: 'KOMATSU',   category: 'Dumper',     description: 'Komatsu 830E DC Drive Dumper' },
  { name: 'BELAZ',    make: 'BELAZ',     category: 'Dumper',     description: 'BELAZ 75131 220T Mining Dumper' },
  { name: 'PC5500',   make: 'KOMATSU',   category: 'Excavator',  description: 'Komatsu PC5500 Mining Excavator' },
];

const COMPONENTS = [
  { name: 'Wheel Motor',       category: 'Electrical',   description: 'AC/DC traction wheel motor' },
  { name: 'Alternator',        category: 'Electrical',   description: 'Main alternator / generator' },
  { name: 'GBM',               category: 'Electrical',   description: 'Grid Blower Motor' },
  { name: 'MBM',               category: 'Electrical',   description: 'Main Blower Motor' },
  { name: 'Hoist Motor',       category: 'Electrical',   description: 'Electric hoist motor' },
  { name: 'Steer Motor',       category: 'Electrical',   description: 'Electric steering motor' },
  { name: 'Auxiliary Motor',   category: 'Electrical',   description: 'Auxiliary drive motor' },
  { name: 'Transformer',       category: 'Electrical',   description: 'High-voltage transformer unit' },
  { name: 'Gear Box',          category: 'Mechanical',   description: 'Planetary gear box assembly' },
  { name: 'Brake Caliper',     category: 'Mechanical',   description: 'Disc brake caliper assembly' },
];

const SAMPLE_JOBS = [
  {
    jobNo: 'TRC-2026-0001',
    description: 'EH5000 Main Blower Motor',
    serialNumber: 'MBM-EH5-2024-001',
    subAssemblyMake: 'SIEMENS',
    equipmentMake: 'HITACHI',
    equipmentModel: 'EH5000',
    componentType: 'MBM',
    partNumber: '4426088',
    receivedFrom: 'Singrauli Site',
    orderNumber: 'PO-2026-1101',
    dateReceived: '2026-01-10',
    previousRunningHours: '4200',
    siteComplaints: 'Motor not starting, high vibration, burning smell reported',
    scopeOfWork: 'Full overhaul including winding replacement, bearing replacement and testing',
    stage: 'Assembly',
    status: 'In Progress',
    equipment: 'EH5000',
    recSite: 'Singrauli Site',
    recDate: '2026-01-10',
    lifeHrs: '4200',
    failureDesc: 'Motor not starting, high vibration, burning smell reported',
  },
  {
    jobNo: 'TRC-2026-0002',
    description: '830E AC Front Right Wheel Motor',
    serialNumber: 'WM-830AC-2024-007',
    subAssemblyMake: 'GE',
    equipmentMake: 'KOMATSU',
    equipmentModel: '830E AC',
    componentType: 'Wheel Motor',
    partNumber: '7834582',
    receivedFrom: 'Jharia Site',
    orderNumber: 'PO-2026-1102',
    dateReceived: '2026-01-22',
    previousRunningHours: '7800',
    siteComplaints: 'Wheel motor overheating, speed fluctuation at full load',
    scopeOfWork: 'Disassembly, inspection, stator rewinding, bearing replacement, final testing',
    stage: 'Testing',
    status: 'In Progress',
    equipment: '830E AC',
    recSite: 'Jharia Site',
    recDate: '2026-01-22',
    lifeHrs: '7800',
    failureDesc: 'Wheel motor overheating, speed fluctuation at full load',
  },
  {
    jobNo: 'TRC-2026-0003',
    description: 'BELAZ Alternator Unit',
    serialNumber: 'ALT-BELAZ-2023-003',
    subAssemblyMake: 'LEROY SOMER',
    equipmentMake: 'BELAZ',
    equipmentModel: 'BELAZ',
    componentType: 'Alternator',
    partNumber: '5589012',
    receivedFrom: 'Korba Site',
    orderNumber: 'PO-2026-1103',
    dateReceived: '2026-02-05',
    previousRunningHours: '12500',
    siteComplaints: 'No output voltage, field winding open circuit',
    scopeOfWork: 'Field and stator winding check, rewinding if required, testing and certification',
    stage: 'Completed',
    status: 'Done',
    equipment: 'BELAZ',
    recSite: 'Korba Site',
    recDate: '2026-02-05',
    lifeHrs: '12500',
    failureDesc: 'No output voltage, field winding open circuit',
    rfdDate: '2026-03-01',
  },
  {
    jobNo: 'TRC-2026-0004',
    description: 'EH4500 Grid Blower Motor',
    serialNumber: 'GBM-EH45-2025-002',
    subAssemblyMake: 'ABB',
    equipmentMake: 'HITACHI',
    equipmentModel: 'EH4500',
    componentType: 'GBM',
    partNumber: '3312045',
    receivedFrom: 'Talcher Site',
    dateReceived: '2026-03-12',
    previousRunningHours: '3100',
    siteComplaints: 'Blower motor seized, bearing failure',
    scopeOfWork: 'Bearing replacement, insulation check, mechanical overhaul',
    stage: 'Received',
    status: 'Pending',
    equipment: 'EH4500',
    recSite: 'Talcher Site',
    recDate: '2026-03-12',
    lifeHrs: '3100',
    failureDesc: 'Blower motor seized, bearing failure',
  },
  {
    jobNo: 'TRC-2026-0005',
    description: '830E DC Rear Left Wheel Motor',
    serialNumber: 'WM-830DC-2025-011',
    subAssemblyMake: 'GE',
    equipmentMake: 'KOMATSU',
    equipmentModel: '830E DC',
    componentType: 'Wheel Motor',
    partNumber: '7190823',
    receivedFrom: 'Gevra Site',
    dateReceived: '2026-04-01',
    previousRunningHours: '9200',
    siteComplaints: 'Commutator sparking, brush wear, reduced tractive effort',
    scopeOfWork: 'Commutator skim, brush replacement, armature check, test run',
    stage: 'Inspection',
    status: 'In Progress',
    equipment: '830E DC',
    recSite: 'Gevra Site',
    recDate: '2026-04-01',
    lifeHrs: '9200',
    failureDesc: 'Commutator sparking, brush wear, reduced tractive effort',
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    // Users
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      await User.create([
        { name: 'Administrator',      username: 'admin',     password: 'thriveni@123', role: 'admin' },
        { name: 'Workshop Manager',   username: 'manager',   password: 'rebuilt@2026', role: 'manager' },
        { name: 'Sr. Technician',     username: 'tech1',     password: 'tech@2026',    role: 'technician' },
        { name: 'Jr. Technician',     username: 'tech2',     password: 'tech@2026',    role: 'technician' },
      ]);
      console.log('✅ Default users created');
    } else {
      console.log('ℹ️  Users already exist');
    }

    // Machine models
    for (const m of MACHINES) {
      await MachineModel.findOneAndUpdate({ name: m.name }, m, { upsert: true });
    }
    console.log('✅ Machine models seeded');

    // Component types
    for (const c of COMPONENTS) {
      await ComponentType.findOneAndUpdate({ name: c.name }, c, { upsert: true });
    }
    console.log('✅ Component types seeded');

    // Sample jobs
    const admin = await User.findOne({ username: 'admin' });
    for (const j of SAMPLE_JOBS) {
      const exists = await Job.findOne({ jobNo: j.jobNo });
      if (!exists) await Job.create({ ...j, createdBy: admin._id, updatedBy: admin._id });
    }
    console.log('✅ Sample jobs seeded');

    console.log('\n✨ Seed complete! Login credentials:');
    console.log('   admin / thriveni@123');
    console.log('   manager / rebuilt@2026');
    console.log('   tech1 / tech@2026\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
