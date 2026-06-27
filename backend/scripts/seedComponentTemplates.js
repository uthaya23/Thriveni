const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const ComponentTemplate = require('../models/ComponentTemplate');

async function seedTemplates() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected');

  await ComponentTemplate.deleteMany({});
  console.log('🗑️ Cleared existing templates');

  // ── EH5000 Wheel Motor ──────────────────────────────────────────
  await ComponentTemplate.create({
    componentKey: 'EH5000_WHEEL_MOTOR',
    displayName: 'EH5000 Wheel Motor',
    equipmentModels: ['EH5000', 'EH4500'],
    componentType: 'Wheel Motor',
    make: 'HITACHI',
    stage1: {
      incomingChecklist: [
        'Hub Present', 'Coupling Present', 'Brake Disc Present',
        'Speed Sensor Present', 'RTD Sensors Present', 'Bus Bar Present', 'Parking Brake Present'
      ],
      electricalTests: [
        { name: 'IR R-G', terminals: ['R to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Y-G', terminals: ['Y to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR B-G', terminals: ['B to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'Winding Resistance R-Y', terminals: ['R to Y'], standardValue: '0.6 mΩ', unit: 'mΩ', isRange: false },
        { name: 'Winding Resistance Y-B', terminals: ['Y to B'], standardValue: '0.6 mΩ', unit: 'mΩ', isRange: false },
        { name: 'Winding Resistance B-R', terminals: ['B to R'], standardValue: '0.6 mΩ', unit: 'mΩ', isRange: false },
        { name: 'Speed Sensor Resistance', terminals: [], standardValue: '', unit: 'Ω', isRange: false },
        { name: 'RTD Resistance', terminals: [], standardValue: '100 Ω @ 25°C', unit: 'Ω', isRange: false }
      ],
      partsChecklist: [
        { partName: 'Hub', partNo: '', quantity: 1 },
        { partName: 'Coupling', partNo: '', quantity: 1 },
        { partName: 'Brake Disc', partNo: '', quantity: 1 },
        { partName: 'Speed Sensor', partNo: '', quantity: 1 },
        { partName: 'RTD Sensor (Motor Bearing Temp)', partNo: '', quantity: 2 },
        { partName: 'Bus Bar', partNo: '', quantity: 2 },
        { partName: 'Parking Brake', partNo: '', quantity: 2 },
        { partName: 'Brake Disc Bolt', partNo: '', quantity: 1 }
      ]
    },
    stage2: {
      dismantlingChecklist: [
        'Drive Ring Removed', 'Drive Ring Cover Removed',
        'Brake Caliper Removed', 'Brake Disc Removed',
        'Encoder Assembly Removed', 'RTD Connections Removed',
        'DE Outer Seal Removed', 'DE Inner Seal Removed',
        'NDE Outer Seal Removed', 'NDE Inner Seal Removed',
        'Rotor Removed', 'Stator Removed',
        'DE Bearing Removed', 'NDE Bearing Removed',
        'DE Housing Removed', 'NDE Housing Removed'
      ],
      dimensionalMeasurements: [
        { name: 'NDE Bearing Seat Dia', min: 129.970, max: 130.043, unit: 'mm' },
        { name: 'NDE Housing Bore', min: 230.000, max: 230.035, unit: 'mm' },
        { name: 'DE Bearing Seat Dia', min: 149.970, max: 150.043, unit: 'mm' },
        { name: 'DE Housing Bore', min: 225.000, max: 225.035, unit: 'mm' },
        { name: 'Rotor Air Gap (DE)', min: 2.0, max: 4.0, unit: 'mm' },
        { name: 'Rotor Air Gap (NDE)', min: 2.0, max: 4.0, unit: 'mm' },
        { name: 'Brake Disc Thickness', min: 15.0, max: 20.0, unit: 'mm' }
      ],
      componentConditionList: [
        'Rotor', 'Stator', 'DE Bearing', 'NDE Bearing', 'Shaft',
        'Housing (DE)', 'Housing (NDE)', 'Drive Ring', 'Brake Disc',
        'Brake Caliper', 'Encoder', 'RTD Sensors', 'Speed Sensor', 'Bus Bar'
      ]
    },
    stage3: {
      preAssemblyChecklist: [
        'Work Area Cleaned & Ready', 'All Parts Cleaned & Dried',
        'All Components Inspected', 'Windings Reinsulated / Varnish Applied',
        'Varnish Cured', 'Bearings Ready', 'Seals Ready',
        'Required Tools & Torque Wrenches Calibrated'
      ],
      assemblyChecklist: [
        'Drive Ring Installed', 'Drive Ring Cover Installed',
        'Brake Caliper Installed', 'Brake Disc Installed',
        'Encoder Assembly Installed', 'RTD Connections Installed',
        'DE Outer Seal Installed', 'DE Inner Seal Installed',
        'NDE Outer Seal Installed', 'NDE Inner Seal Installed',
        'Rotor Installed', 'Stator Installed',
        'DE Bearing Installed', 'NDE Bearing Installed',
        'DE Housing Installed', 'NDE Housing Installed'
      ],
      torqueVerifications: [
        { name: 'Stator Frame Bolts', min: 160, max: 180, unit: 'lb.ft' },
        { name: 'Brake Disc Bolts', min: 55, max: 60, unit: 'lb.ft' },
        { name: 'DE Bearing Housing', min: 55, max: 60, unit: 'lb.ft' },
        { name: 'NDE Bearing Housing', min: 55, max: 60, unit: 'lb.ft' }
      ]
    },
    stage4: {
      electricalTests: [
        { name: 'IR R-G (Post Repair)', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Y-G (Post Repair)', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR B-G (Post Repair)', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'Winding Resistance R-Y', standardValue: '0.6 mΩ', unit: 'mΩ' },
        { name: 'Winding Resistance Y-B', standardValue: '0.6 mΩ', unit: 'mΩ' },
        { name: 'Winding Resistance B-R', standardValue: '0.6 mΩ', unit: 'mΩ' }
      ],
      functionalTests: ['No Load Run Test', 'Noise Check', 'Vibration Check', 'Bearing Temperature Check'],
      sensorTests: [
        { name: 'Speed Sensor', hasResistanceValue: true },
        { name: 'RTD Sensor 1', hasResistanceValue: true },
        { name: 'RTD Sensor 2', hasResistanceValue: true }
      ],
      surgeTests: ['R Phase Coil', 'Y Phase Coil', 'B Phase Coil'],
      dispatchChecklist: [
        'Final Inspection Completed', 'QA Approved',
        'Test Report Attached', 'Customer Report Attached',
        'Component Cleaned & Painted', 'Dispatch Cleared'
      ]
    }
  });
  console.log('✅ EH5000 Wheel Motor template seeded');

  // ── 830E DC Wheel Motor ─────────────────────────────────────────
  await ComponentTemplate.create({
    componentKey: '830E_DC_WHEEL_MOTOR',
    displayName: '830E DC Wheel Motor',
    equipmentModels: ['830E DC'],
    componentType: 'Wheel Motor',
    make: 'KOMATSU',
    stage1: {
      incomingChecklist: [
        'Brush Holder Present', 'Brushes Present', 'Armature Present',
        'Field Coil (Magnetic Poles) Present', 'Air Baffle Present',
        'Drive Ring Present', 'Magnetic Pickup Present', 'Armature Cables Present'
      ],
      electricalTests: [
        { name: 'Field Resistance S-SS', terminals: ['S to SS'], standardValue: '0.072–0.0776 Ω', minValue: 0.072, maxValue: 0.0776, unit: 'Ω', isRange: true },
        { name: 'Field Resistance SX-SSX', terminals: ['SX to SSX'], standardValue: '0.072–0.0776 Ω', minValue: 0.072, maxValue: 0.0776, unit: 'Ω', isRange: true },
        { name: 'Field Resistance S-SSX', terminals: ['S to SSX'], standardValue: '0.072–0.0776 Ω', minValue: 0.072, maxValue: 0.0776, unit: 'Ω', isRange: true },
        { name: 'Armature Resistance A-AA', terminals: ['A to AA'], standardValue: '0.0051–0.0053 Ω', minValue: 0.0051, maxValue: 0.0053, unit: 'Ω', isRange: true },
        { name: 'IR S-G', terminals: ['S to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR SS-G', terminals: ['SS to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR SX-G', terminals: ['SX to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR SSX-G', terminals: ['SSX to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR A-G', terminals: ['A to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR AA-G', terminals: ['AA to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true }
      ],
      partsChecklist: [
        { partName: 'Magnetic pickup', partNo: 'VJ0972', quantity: 1 },
        { partName: 'Brush holder', partNo: 'VE8429', quantity: 4 },
        { partName: 'Brush', partNo: 'VE7609', quantity: 12 },
        { partName: 'Armature cable A, AA', partNo: 'VE2836/BF2610', quantity: 2 },
        { partName: 'Magnetic pole cable S/SS/SX/SSX', partNo: 'VE4491/VE4487', quantity: 4 },
        { partName: 'Magnetic pickup cable', partNo: 'VE3957', quantity: 1 },
        { partName: 'Drive Ring', partNo: 'VE4548', quantity: 1 },
        { partName: 'Air Baffle', partNo: 'VE0758', quantity: 2 },
        { partName: 'Mounting Bolt', partNo: 'VE4776', quantity: 10 },
        { partName: 'Support, Brush Holder', partNo: 'VJ0928', quantity: 4 },
        { partName: 'Support Bolt', partNo: 'VF7377', quantity: 4 },
        { partName: 'Clamp', partNo: 'VJ1204', quantity: 1 },
        { partName: 'Clamp', partNo: 'VE4483', quantity: 1 },
        { partName: 'Sensor Terminal Block', partNo: 'VE1272', quantity: 2 },
        { partName: 'Connection Strip', partNo: 'VJ0969', quantity: 6 },
        { partName: 'Jumper (link Strip)', partNo: 'VE4524', quantity: 1 }
      ]
    },
    stage2: {
      dismantlingChecklist: [
        'Drive Ring Removed', 'Drive Ring Cover Removed',
        'Brake Caliper Removed', 'Brake Disc Removed',
        'Encoder Removed', 'RTD Connections Removed',
        'DE Outer Seal Removed', 'DE Inner Seal Removed',
        'NDE Seal Removed', 'Rotor (Armature) Removed',
        'Stator (Field Coils) Removed', 'Brush Holders Removed',
        'Air Baffles Removed', 'DE Bearing Removed', 'NDE Bearing Removed'
      ],
      dimensionalMeasurements: [
        { name: 'NDE Shaft Journal', min: 129.970, max: 130.043, unit: 'mm' },
        { name: 'NDE Housing Bore', min: 230.000, max: 230.035, unit: 'mm' },
        { name: 'DE Shaft Journal', min: 149.970, max: 150.043, unit: 'mm' },
        { name: 'DE Housing Bore', min: 225.000, max: 225.035, unit: 'mm' },
        { name: 'Commutator Diameter', min: 15.675, max: 16.675, unit: 'in' },
        { name: 'Spiral Groove Depth', min: 0.010, max: 0.046, unit: 'in' },
        { name: 'Spiral Groove Width', min: 0.092, max: 0.096, unit: 'in' },
        { name: 'Dust Groove Width', min: 0.420, max: 0.450, unit: 'in' },
        { name: 'Undercut Depth', min: 0.8, max: 1.2, unit: 'mm' },
        { name: 'Brush Length (Min)', min: 1.0, max: 3.0, unit: 'in' },
        { name: 'Brush Spring Pressure', min: 160, max: 192, unit: 'oz' }
      ],
      componentConditionList: [
        'Armature', 'Shaft', 'DE Bearing', 'NDE Bearing',
        'Housing', 'Brush Holder', 'Field Coils',
        'Drive Ring', 'Brake Hub', 'Air Baffles',
        'RTD', 'RPM Sensor', 'Commutator'
      ]
    },
    stage3: {
      preAssemblyChecklist: [
        'Work Area Cleaned & Ready', 'All Parts Cleaned & Dried',
        'All Components Inspected', 'Windings Reinsulated / Varnish Applied',
        'Varnish Cured', 'Bearings Ready', 'Seals Ready',
        'Required Tools & Torque Wrenches Calibrated',
        'IR Check Before Assembly ≥ 5 MΩ', 'Cleanliness Level Dust/Oil Free'
      ],
      assemblyChecklist: [
        'Drive Ring Installed', 'Drive Ring Cover Installed',
        'Brake Caliper Installed', 'Brake Disc Installed',
        'Encoder Installed', 'RTD Connections Installed',
        'DE Outer Seal Installed', 'DE Inner Seal Installed',
        'NDE Seal Installed', 'Rotor (Armature) Installed',
        'Stator (Field Coils) Installed', 'Brush Holders Installed',
        'Air Baffles Installed', 'DE Bearing Installed', 'NDE Bearing Installed'
      ],
      torqueVerifications: [
        { name: 'Exciter Pole Torque', min: 293, max: 326, unit: 'lb.ft' },
        { name: 'Commutator Pole Torque', min: 215, max: 240, unit: 'lb.ft' },
        { name: 'Armature Frame Head', min: 160, max: 180, unit: 'lb.ft' },
        { name: 'Air Baffle', min: 55, max: 60, unit: 'lb.ft' },
        { name: 'DE Bearing Housing', min: 55, max: 60, unit: 'lb.ft' },
        { name: 'NDE Bearing Housing', min: 55, max: 60, unit: 'lb.ft' },
        { name: 'Brush Holder Tightening', min: 293, max: 326, unit: 'lb.ft' },
        { name: 'Mounting Insulator Bolts', min: 43, max: 45, unit: 'lb.ft' }
      ]
    },
    stage4: {
      electricalTests: [
        { name: 'IR Armature (A-G)', standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Field (S-G)', standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'Field Resistance S-SS', standardValue: '0.072–0.0776 Ω', minValue: 0.072, maxValue: 0.0776, unit: 'Ω', isRange: true },
        { name: 'Armature Resistance A-AA', standardValue: '0.0051–0.0053 Ω', minValue: 0.0051, maxValue: 0.0053, unit: 'Ω', isRange: true }
      ],
      functionalTests: ['No Load Run Test', 'Brush Sparking Check (Nil/Light)', 'Noise Check', 'Bearing Temperature Check'],
      sensorTests: [
        { name: 'Winding Temperature Sensor (RTD)', hasResistanceValue: true },
        { name: 'RPM Sensor (Magnetic Pickup)', hasResistanceValue: true }
      ],
      surgeTests: ['Armature Coil', 'Field Coil'],
      dispatchChecklist: [
        'Final Inspection Completed', 'QA Approved',
        'Test Report Attached', 'Customer Report Attached',
        'Component Cleaned & Painted', 'Dispatch Cleared'
      ]
    }
  });
  console.log('✅ 830E DC Wheel Motor template seeded');

  // ── 830E AC Wheel Motor ─────────────────────────────────────────
  await ComponentTemplate.create({
    componentKey: '830E_AC_WHEEL_MOTOR',
    displayName: '830E AC Wheel Motor',
    equipmentModels: ['830E AC'],
    componentType: 'Wheel Motor',
    make: 'KOMATSU',
    stage1: {
      incomingChecklist: [
        'Speed Sensor Present', 'Insulator with Stud Present', 'Speed Sensor Cable Present',
        'Drive Ring Present', 'Clamp Present', 'Connection Strip Present', 'Main Cable Present'
      ],
      electricalTests: [
        { name: 'IR R-G', terminals: ['R to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Y-G', terminals: ['Y to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR B-G', terminals: ['B to G'], standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'Winding Resistance R-Y', terminals: ['R to Y'], standardValue: '', unit: 'mΩ', isRange: false },
        { name: 'Winding Resistance Y-B', terminals: ['Y to B'], standardValue: '', unit: 'mΩ', isRange: false },
        { name: 'Winding Resistance B-R', terminals: ['B to R'], standardValue: '', unit: 'mΩ', isRange: false }
      ],
      partsChecklist: [
        { partName: 'Sensor, Speed', partNo: 'XA4288', quantity: 1 },
        { partName: 'Insulator w/ Stud', partNo: 'VE4750', quantity: 6 },
        { partName: 'Cable, Speed Sensor', partNo: 'XA4289', quantity: 1 },
        { partName: 'Drive Ring', partNo: 'VE4548', quantity: 1 },
        { partName: 'Clamp', partNo: 'VE4483', quantity: 1 },
        { partName: 'Connection Strip', partNo: 'VJ0969', quantity: 3 },
        { partName: 'Main Cable', partNo: '', quantity: 3 }
      ]
    },
    stage2: {
      dismantlingChecklist: [
        'Drive Ring Removed', 'Speed Sensor Removed',
        'Brake Adapter Removed', 'Bearing Cap Removed',
        'Collar Removed', 'Framehead Removed',
        'Stator Removed', 'Rotor Removed',
        'DE Bearing Removed', 'NDE Bearing Removed'
      ],
      dimensionalMeasurements: [
        { name: 'NDE Shaft Journal', min: 129.970, max: 130.043, unit: 'mm' },
        { name: 'DE Shaft Journal', min: 149.970, max: 150.043, unit: 'mm' }
      ],
      componentConditionList: [
        'Stator Core', 'Stator Winding', 'Rotor', 'Framehead',
        'Bearings', 'Bearing Cap', 'Drive Ring', 'Brake Adapter',
        'Speed Sensor'
      ]
    },
    stage3: {
      preAssemblyChecklist: [
        'Work Area Cleaned & Ready', 'All Parts Cleaned & Dried',
        'All Components Inspected', 'Windings Reinsulated / Varnish Applied',
        'Required Tools & Torque Wrenches Calibrated', 'Cleanliness Level Dust/Oil Free'
      ],
      assemblyChecklist: [
        'Drive Ring Installed', 'Speed Sensor Installed',
        'Brake Adapter Installed', 'Bearing Cap Installed',
        'Collar Installed', 'Framehead Installed',
        'Stator Installed', 'Rotor Installed',
        'DE Bearing Installed', 'NDE Bearing Installed'
      ],
      torqueVerifications: [
        { name: 'Frame Head Mounting Bolt', min: 166, max: 186, unit: 'ft-lbs' },
        { name: 'Bearing Cap Bolt Tightening', min: 56, max: 60, unit: 'ft-lbs' },
        { name: 'Brake Adapter Bolt', min: 531, max: 575, unit: 'ft-lbs' }
      ]
    },
    stage4: {
      electricalTests: [
        { name: 'IR R-G', standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Y-G', standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR B-G', standardValue: '≥ 5 MΩ', minValue: 5, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'Winding Resistance R-Y', standardValue: '', unit: 'mΩ' },
        { name: 'Winding Resistance Y-B', standardValue: '', unit: 'mΩ' },
        { name: 'Winding Resistance B-R', standardValue: '', unit: 'mΩ' }
      ],
      functionalTests: ['No Load Run Test', 'Rotor Free Rotation', 'Final Visual Inspection'],
      sensorTests: [
        { name: 'RPM Sensor', hasResistanceValue: true }
      ],
      surgeTests: ['R', 'Y', 'B'],
      dispatchChecklist: [
        'Final Inspection Completed', 'Speed Sensor Reconnection',
        'Sun Pinion Installation', 'Bolts Tightening',
        'Grease Leakage Checked', 'Bus Bar Terminal Connection',
        'Speed Sensor Connector Mounting', 'Cable Mounting Clamp',
        'Name Plate Detail Completed'
      ]
    }
  });
  console.log('✅ 830E AC Wheel Motor template seeded');

  // ── EH5000 Main Alternator ─────────────────────────────────────────
  await ComponentTemplate.create({
    componentKey: 'EH5000_MAIN_ALTERNATOR',
    displayName: 'EH5000 Main Alternator',
    equipmentModels: ['EH5000', 'EH4500'],
    componentType: 'Alternator',
    make: 'HITACHI',
    stage1: {
      incomingChecklist: [
        'Bearing Temperature Sensor Present', 'RPM Sensor Present',
        'Rectifier Box Present', 'Rectifier Present', 'Rectifier Cover Present',
        'Sensor Terminal Box Cover Present', 'Guard Present', 'Auxiliary Cable Present',
        'Grease Pipe Present', 'Sensor Terminal Connector Present',
        'Sensor Cable Terminal Strip Present', 'End Bell Front Guard Present'
      ],
      electricalTests: [
        { name: 'IR Main U1-G', terminals: ['U1 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main V1-G', terminals: ['V1 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main W1-G', terminals: ['W1 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main U2-G', terminals: ['U2 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main V2-G', terminals: ['V2 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main W2-G', terminals: ['W2 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux T1-G', terminals: ['T1 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux T2-G', terminals: ['T2 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux T3-G', terminals: ['T3 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Field f1-G', terminals: ['f1 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Field f2-G', terminals: ['f2 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Rotor R-G', terminals: ['R to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Rotor Y-G', terminals: ['Y to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Rotor B-G', terminals: ['B to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field F1-G', terminals: ['F1 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field F2-G', terminals: ['F2 to G'], standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true }
      ],
      partsChecklist: [
        { partName: 'Bearing Temperature Sensor', partNo: '', quantity: 2 },
        { partName: 'RPM sensor', partNo: '', quantity: 1 },
        { partName: 'Rectifier Box', partNo: '', quantity: 1 },
        { partName: 'Rectifier', partNo: '', quantity: 1 },
        { partName: 'Rectifier Cover', partNo: '', quantity: 1 },
        { partName: 'Sensor Terminal Box Cover', partNo: '', quantity: 1 },
        { partName: 'Guard', partNo: '', quantity: 1 },
        { partName: 'Auxiliary Cable', partNo: '', quantity: 3 },
        { partName: 'Grease Pipe', partNo: '', quantity: 1 },
        { partName: 'Sensor Terminal Connector', partNo: '', quantity: 1 },
        { partName: 'Sensor Cable Terminal Strip', partNo: '', quantity: 4 },
        { partName: 'End Bell Front Guard', partNo: '', quantity: 4 }
      ]
    },
    stage2: {
      dismantlingChecklist: [
        'Rectifier Box Removed', 'Guard Removed', 'End Bell Front Guard Removed',
        'Auxiliary Cables Removed', 'Sensors Removed', 'Bearings Removed',
        'Rotor Removed', 'Stator Removed', 'Exciter Field Removed',
        'Exciter Rotor Removed', 'Main Field Removed'
      ],
      dimensionalMeasurements: [
        { name: 'Shaft Diameter', min: 179.97, max: 180.00, unit: 'mm' },
        { name: 'Housing Bore Condition', min: 180.00, max: 180.035, unit: 'mm' },
        { name: 'Speed Sensor Gap', min: 0.030, max: 0.030, unit: 'in' },
        { name: 'Endplay', min: 0.010, max: 0.045, unit: 'in' },
        { name: 'Inboard Cup Grease', min: 510, max: 510, unit: 'grams' }
      ],
      componentConditionList: [
        'Stator Coil', 'Rotor', 'Excitor Field Winding', 'Excitor Rotor winding',
        'Main Field Winding', 'Shaft Journal', 'Bearings', 'Seals', 'Diode Body',
        'Sensors', 'Terminal Box'
      ]
    },
    stage3: {
      preAssemblyChecklist: [
        'Work Area Cleaned & Ready', 'All Parts Cleaned & Dried',
        'All Components Inspected', 'All Windings Reinsulated',
        'Required Tools & Torque Wrenches Calibrated', 'Rotor Body Cleaned'
      ],
      assemblyChecklist: [
        'Rectifier Box Installed', 'Guard Installed', 'End Bell Front Guard Installed',
        'Auxiliary Cables Installed', 'Sensors Installed', 'Bearings Installed',
        'Rotor Installed', 'Stator Installed', 'Exciter Field Installed',
        'Exciter Rotor Installed', 'Main Field Installed'
      ],
      torqueVerifications: [
        { name: 'Bearing Cap Bolts', min: 30, max: 35, unit: 'ft-lbs' },
        { name: 'End Bell Bolts', min: 75, max: 85, unit: 'ft-lbs' },
        { name: 'Exciter Mounting Bolts', min: 150, max: 170, unit: 'ft-lbs' },
        { name: 'RTD Terminal Block Screws', min: 2, max: 3, unit: 'Nm' },
        { name: 'Diode Mounting Nuts', min: 8, max: 15, unit: 'Nm' },
        { name: 'Terminal Box Bolts', min: 20, max: 35, unit: 'Nm' },
        { name: 'Guard Cover Bolt', min: 20, max: 35, unit: 'Nm' },
        { name: 'Speed Sensor Bolt', min: 17, max: 20, unit: 'ft-lbs' },
        { name: 'Drive Plate Bolt', min: 280, max: 280, unit: 'ft-lbs' }
      ]
    },
    stage4: {
      electricalTests: [
        { name: 'IR Main U1-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main V1-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main W1-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main U2-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main V2-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main W2-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux T1-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux T2-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux T3-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Field f1-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Field f2-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Rotor R-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Rotor Y-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Exciter Rotor B-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field F1-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field F2-G', standardValue: '≥ 2.8 MΩ', minValue: 2.8, unit: 'MΩ', hasAppliedVoltage: true }
      ],
      functionalTests: ['No Load Run Test', 'Rotor Free Rotation', 'Final Visual Inspection', 'Diode D1-D6 Forward/Reverse'],
      sensorTests: [
        { name: 'Bearing Temperature Sensor 1', hasResistanceValue: true },
        { name: 'Bearing Temperature Sensor 2', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 1', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 2', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 3', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 4', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 5', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 6', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 7', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 8', hasResistanceValue: true },
        { name: 'Winding Temperature Sensor 9', hasResistanceValue: true },
        { name: 'RPM Sensor', hasResistanceValue: true }
      ],
      surgeTests: ['Main U1', 'Main V1', 'Main W1', 'Main U2', 'Main V2', 'Main W2', 'Aux T1', 'Aux T2', 'Aux T3'],
      dispatchChecklist: [
        'Final Inspection Completed', 'QA Approved',
        'Test Report Attached', 'Customer Report Attached',
        'Component Cleaned & Painted', 'Dispatch Cleared'
      ]
    }
  });
  console.log('✅ EH5000 Main Alternator template seeded');

  // ── 830E DC Main Alternator ─────────────────────────────────────────
  await ComponentTemplate.create({
    componentKey: '830E_DC_MAIN_ALTERNATOR',
    displayName: '830E DC Main Alternator',
    equipmentModels: ['830E DC'],
    componentType: 'Alternator',
    make: 'KOMATSU',
    stage1: {
      incomingChecklist: [
        'Fan Housing (2nd Stage) Present', 'Impeller (2nd Stage) Present', 'Fan Housing (1st Stage) Present', 'Impeller (1st Stage) Present',
        'Speed Sensor Cable Present', 'Connector Present', 'Speed Sensor Pickup Present', 'Carbon Brushes Present',
        'Carbon Brush Holders Present', 'Connection Box Present', 'Auxiliary Cables Present', 'Main Cables Present',
        'Field Cables Present', 'Fan Housing Plate Present'
      ],
      electricalTests: [
        { name: 'Main Winding Resistance R-Y', terminals: ['R to Y'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Main Winding Resistance Y-B', terminals: ['Y to B'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Main Winding Resistance B-R', terminals: ['B to R'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Aux Winding Resistance T13-T14', terminals: ['T13 to T14'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Aux Winding Resistance T15-T16', terminals: ['T15 to T16'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Main Field Winding Resistance F1-F2', terminals: ['F1 to F2'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'IR Main Winding R-G', terminals: ['R to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Winding Y-G', terminals: ['Y to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Winding B-G', terminals: ['B to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T13-G', terminals: ['T13 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T14-G', terminals: ['T14 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T15-G', terminals: ['T15 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T16-G', terminals: ['T16 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field Winding F1-G', terminals: ['F1 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field Winding F2-G', terminals: ['F2 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true }
      ],
      partsChecklist: [
        { partName: 'FAN HOUSING, 2ND STAGE', partNo: '', quantity: 1 },
        { partName: 'IMPELLER 2nd STAGE', partNo: '', quantity: 1 },
        { partName: 'FAN HOUSING, 1ST STAGE', partNo: '', quantity: 1 },
        { partName: 'IMPELLER 1st STAGE', partNo: '', quantity: 1 },
        { partName: 'CABLE, SPEED SENSOR', partNo: '', quantity: 1 },
        { partName: 'CONNECTOR - 0.125" TO 1/4" DIAMETER CABLE', partNo: '', quantity: 1 },
        { partName: 'MAGNETIC PICKUP, SPEED SENSOR', partNo: '', quantity: 1 },
        { partName: 'CARBON BRUSH', partNo: '', quantity: 6 },
        { partName: 'CARBON BRUSH HOLDER', partNo: '', quantity: 6 },
        { partName: 'CONNECTION BOX', partNo: '', quantity: 1 },
        { partName: 'AUXILARY CABLE', partNo: '', quantity: 4 },
        { partName: 'MAIN CABLE', partNo: '', quantity: 3 },
        { partName: 'FIELD CABLE', partNo: '', quantity: 2 },
        { partName: '1ST STAGE FAN HOUSING PLATE', partNo: '', quantity: 1 }
      ],
      sensorTests: [
        { name: 'RPM Sensor', hasResistanceValue: true }
      ],
      surgeTests: [
        'Main Winding Phase R',
        'Main Winding Phase Y',
        'Main Winding Phase B',
        'Aux Winding Phase T13',
        'Aux Winding Phase T14',
        'Aux Winding Phase T15',
        'Aux Winding Phase T16'
      ]
    },
    stage2: {
      dismantlingChecklist: [
        'Fan Housings Removed', 'Impellers Removed', 'Speed Sensor Removed',
        'Carbon Brushes Removed', 'Brush Holders Removed', 'Connection Box Opened',
        'Bearing Housing Assembly Removed', 'Bearings Removed',
        'Hub Removed', 'Engine Mounting Flange Removed', 'Rotor Removed'
      ],
      dimensionalMeasurements: [
        { name: 'Shaft Journal Dia', min: 149.97, max: 150.05, unit: 'mm' },
        { name: 'Housing Bore Dia', min: 225.00, max: 225.04, unit: 'mm' }
      ],
      componentConditionList: [
        'Stator', 'Rotor', 'Shaft Journal', 'Brush Holders', 'Carbon Brushes', 'Fan Housing', 'Impeller'
      ]
    },
    stage3: {
      preAssemblyChecklist: [
        'Work Area Cleaned & Ready', 'All Parts Cleaned & Dried', 'All Components Inspected',
        'Required Tools & Torque Wrenches Calibrated'
      ],
      assemblyChecklist: [
        'Fan Housings Installed', 'Impellers Installed', 'Speed Sensor Installed',
        'Carbon Brushes Installed', 'Brush Holders Installed', 'Connection Box Closed',
        'Bearing Housing Assembly Installed', 'Bearings Installed',
        'Hub Installed', 'Engine Mounting Flange Installed', 'Rotor Installed'
      ],
      torqueVerifications: [
        { name: 'Frame head Bolts', min: 160, max: 180, unit: 'lb.ft' },
        { name: 'Brush Holder Support Bolts', min: 55, max: 60, unit: 'lb.ft' }
      ]
    },
    stage4: {
      electricalTests: [
        { name: 'IR Main Winding R-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Winding Y-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Winding B-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T13-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T14-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T15-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T16-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field Winding F1-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field Winding F2-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'Main Winding Resistance R-Y', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Main Winding Resistance Y-B', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Main Winding Resistance B-R', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Aux Winding Resistance T13-T14', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Aux Winding Resistance T15-T16', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Main Field Winding Resistance F1-F2', standardValue: 'Standard', unit: 'Ω' }
      ],
      functionalTests: ['No Load Run Test', 'Brush Sparking Check', 'Noise Check', 'Vibration Check'],
      sensorTests: [
        { name: 'RPM Sensor', hasResistanceValue: true }
      ],
      surgeTests: [
        'Main Winding Phase R',
        'Main Winding Phase Y',
        'Main Winding Phase B',
        'Aux Winding Phase T13',
        'Aux Winding Phase T14',
        'Aux Winding Phase T15',
        'Aux Winding Phase T16'
      ],
      dispatchChecklist: [
        'Final Inspection Completed', 'QA Approved', 'Test Report Attached', 'Component Painted', 'Dispatch Cleared'
      ]
    }
  });
  console.log('✅ 830E DC Main Alternator template seeded');

  // ── 830E AC Main Alternator ─────────────────────────────────────────
  await ComponentTemplate.create({
    componentKey: '830E_AC_MAIN_ALTERNATOR',
    displayName: '830E AC Main Alternator',
    equipmentModels: ['830E AC'],
    componentType: 'Alternator',
    make: 'KOMATSU',
    stage1: {
      incomingChecklist: [
        'Fan Housing (2nd Stage) Present', 'Impeller (2nd Stage) Present', 'Fan Housing (1st Stage) Present', 'Impeller (1st Stage) Present',
        'Speed Sensor Cable Present', 'Connector Present', 'Speed Sensor Pickup Present', 'Carbon Brushes Present',
        'Carbon Brush Holders Present', 'Connection Box Present', 'Auxiliary Cables Present', 'Main Cables Present',
        'Field Cables Present', 'Fan Housing Plate Present'
      ],
      electricalTests: [
        { name: 'Main Winding Resistance R-Y', terminals: ['R to Y'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Main Winding Resistance Y-B', terminals: ['Y to B'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Main Winding Resistance B-R', terminals: ['B to R'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Aux Winding Resistance T13-T14', terminals: ['T13 to T14'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'Main Field Winding Resistance F1-F2', terminals: ['F1 to F2'], standardValue: 'Standard', unit: 'Ω', isRange: false },
        { name: 'IR Main Winding R-G', terminals: ['R to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Winding Y-G', terminals: ['Y to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Winding B-G', terminals: ['B to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T13-G', terminals: ['T13 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T14-G', terminals: ['T14 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field Winding F1-G', terminals: ['F1 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field Winding F2-G', terminals: ['F2 to G'], standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true }
      ],
      partsChecklist: [
        { partName: 'FAN HOUSING, 2ND STAGE', partNo: '', quantity: 1 },
        { partName: 'IMPELLER 2nd STAGE', partNo: '', quantity: 1 },
        { partName: 'FAN HOUSING, 1ST STAGE', partNo: '', quantity: 1 },
        { partName: 'IMPELLER 1st STAGE', partNo: '', quantity: 1 },
        { partName: 'CABLE, SPEED SENSOR', partNo: '', quantity: 1 },
        { partName: 'CONNECTOR - 0.125" TO 1/4" DIAMETER CABLE', partNo: '', quantity: 1 },
        { partName: 'MAGNETIC PICKUP, SPEED SENSOR', partNo: '', quantity: 1 },
        { partName: 'CARBON BRUSH', partNo: '', quantity: 6 },
        { partName: 'CARBON BRUSH HOLDER', partNo: '', quantity: 6 },
        { partName: 'CONNECTION BOX', partNo: '', quantity: 1 },
        { partName: 'AUXILARY CABLE', partNo: '', quantity: 4 },
        { partName: 'MAIN CABLE', partNo: '', quantity: 3 },
        { partName: 'FIELD CABLE', partNo: '', quantity: 2 },
        { partName: '1ST STAGE FAN HOUSING PLATE', partNo: '', quantity: 1 }
      ],
      sensorTests: [
        { name: 'RPM Sensor', hasResistanceValue: true }
      ],
      surgeTests: [
        'Main Winding Phase R',
        'Main Winding Phase Y',
        'Main Winding Phase B',
        'Aux Winding Phase T13',
        'Aux Winding Phase T14'
      ]
    },
    stage2: {
      dismantlingChecklist: [
        'Fan Housings Removed', 'Impellers Removed', 'Speed Sensor Removed',
        'Carbon Brushes Removed', 'Brush Holders Removed', 'Connection Box Opened',
        'Bearing Housing Assembly Removed', 'Bearings Removed',
        'Hub Removed', 'Engine Mounting Flange Removed', 'Rotor Removed'
      ],
      dimensionalMeasurements: [
        { name: 'Shaft Journal Dia', min: 149.97, max: 150.05, unit: 'mm' },
        { name: 'Housing Bore Dia', min: 225.00, max: 225.04, unit: 'mm' }
      ],
      componentConditionList: [
        'Stator', 'Rotor', 'Shaft Journal', 'Brush Holders', 'Carbon Brushes', 'Fan Housing', 'Impeller'
      ]
    },
    stage3: {
      preAssemblyChecklist: [
        'Work Area Cleaned & Ready', 'All Parts Cleaned & Dried', 'All Components Inspected',
        'Required Tools & Torque Wrenches Calibrated'
      ],
      assemblyChecklist: [
        'Fan Housings Installed', 'Impellers Installed', 'Speed Sensor Installed',
        'Carbon Brushes Installed', 'Brush Holders Installed', 'Connection Box Closed',
        'Bearing Housing Assembly Installed', 'Bearings Installed',
        'Hub Installed', 'Engine Mounting Flange Installed', 'Rotor Installed'
      ],
      torqueVerifications: [
        { name: 'Frame head Bolts', min: 160, max: 180, unit: 'lb.ft' },
        { name: 'Brush Holder Support Bolts', min: 55, max: 60, unit: 'lb.ft' }
      ]
    },
    stage4: {
      electricalTests: [
        { name: 'IR Main Winding R-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Winding Y-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Winding B-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T13-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Aux Winding T14-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field Winding F1-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'IR Main Field Winding F2-G', standardValue: '≥ 1 MΩ', minValue: 1, unit: 'MΩ', hasAppliedVoltage: true },
        { name: 'Main Winding Resistance R-Y', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Main Winding Resistance Y-B', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Main Winding Resistance B-R', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Aux Winding Resistance T13-T14', standardValue: 'Standard', unit: 'Ω' },
        { name: 'Main Field Winding Resistance F1-F2', standardValue: 'Standard', unit: 'Ω' }
      ],
      functionalTests: ['No Load Run Test', 'Brush Sparking Check', 'Noise Check', 'Vibration Check'],
      sensorTests: [
        { name: 'RPM Sensor', hasResistanceValue: true }
      ],
      surgeTests: [
        'Main Winding Phase R',
        'Main Winding Phase Y',
        'Main Winding Phase B',
        'Aux Winding Phase T13',
        'Aux Winding Phase T14'
      ],
      dispatchChecklist: [
        'Final Inspection Completed', 'QA Approved', 'Test Report Attached', 'Component Painted', 'Dispatch Cleared'
      ]
    }
  });
  console.log('✅ 830E AC Main Alternator template seeded');

  console.log('\n🎉 All component templates seeded successfully!');
  process.exit(0);
}

seedTemplates().catch(err => { console.error(err); process.exit(1); });
