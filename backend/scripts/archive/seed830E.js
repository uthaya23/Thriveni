const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const EquipmentFamily = require('../models/EquipmentFamily');
const InspectionTemplate = require('../models/InspectionTemplate');

async function seed830E() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB for Seeding 830E DC Template...');

    // 1. Ensure Equipment Family
    let family = await EquipmentFamily.findOne({ familyName: 'Mining Trucks' });
    if (!family) {
      family = await EquipmentFamily.create({ familyName: 'Mining Trucks', description: 'Heavy haul trucks' });
    }

    // Helper functions
    const conditionParam = (name) => ({ name, parameterType: 'DROPDOWN', options: ['Pass', 'Fail', 'Attention'], passingValue: 'Pass', severity: 'MAJOR', measurementRequired: true, photoRequired: false, aiReportSection: 'Visual Assessment' });
    const boolPass = (name) => ({ name, parameterType: 'BOOLEAN', options: ['Pass', 'Fail'], passingValue: 'Pass', severity: 'MAJOR', measurementRequired: true, photoRequired: false, aiReportSection: 'Visual Assessment' });
    const boolCompleted = (name) => ({ name, parameterType: 'DROPDOWN', options: ['Completed', 'Not Completed'], passingValue: 'Completed', severity: 'MAJOR', measurementRequired: true, photoRequired: false, aiReportSection: 'Checklist' });
    const photoParam = (name) => ({ name, parameterType: 'PHOTO_REQUIRED', measurementRequired: false, photoRequired: true, aiReportSection: 'Visual Assessment' });
    const numericParam = (name, std, tolMax, tolMin, unit, severity) => ({
      name, parameterType: 'NUMERIC', standardValue: std, toleranceMax: tolMax, toleranceMin: tolMin, unit, severity, toleranceType: 'NONE', unitOptions: [unit], measurementRequired: true, photoRequired: false, aiReportSection: 'Dimensional Assessment'
    });
    const reuseRepairReplace = (name) => ({ name, parameterType: 'DROPDOWN', options: ['Reuse', 'Repair', 'Replace'], passingValue: 'Reuse', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Condition Assessment' });

    // 2. Build 830E Template
    const template830E = new InspectionTemplate({
      equipmentFamily: family._id,
      equipmentModel: '830E DC',
      templateVersion: '1.0',
      oemDocumentReference: '830E-DC-ASSY',
      isActive: true,
      stages: [
        {
          stageName: 'Visual Inspection',
          categories: [
            {
              categoryName: 'Overall Visual Inspection Photos',
              parameters: [ photoParam('Visual Inspection Photos') ]
            },
            {
              categoryName: 'Visual Inspection Checklist',
              parameters: [
                conditionParam('Paint Condition'),
                conditionParam('Corrosion'),
                conditionParam('Physical Damage'),
                conditionParam('Impact Marks'),
                conditionParam('Oil Contamination'),
                conditionParam('Grease Leakage'),
                conditionParam('Dirt Accumulation'),
                conditionParam('Water Ingress')
              ]
            }
          ]
        },
        {
          stageName: 'Inspection & Analysis',
          categories: [
            {
              categoryName: 'Electrical Inspection',
              parameters: [
                numericParam('Field Resistance S-SS', 0.075, 0.0776, 0.072, 'Ω', 'CRITICAL'),
                numericParam('Field Resistance SX-SSX', 0.075, 0.0776, 0.072, 'Ω', 'CRITICAL'),
                numericParam('Field Resistance S-SSX', 0.075, 0.0776, 0.072, 'Ω', 'CRITICAL'),
                numericParam('Armature Resistance A-AA', 0.0052, 0.0053, 0.0051, 'Ω', 'CRITICAL'),
                numericParam('Insulation Resistance S-G (Value)', 5.0, 9999, 5.0, 'MΩ', 'CRITICAL'),
                numericParam('Insulation Resistance S-G (Applied Voltage)', null, null, null, 'V', 'INFO'),
                numericParam('Insulation Resistance SS-G (Value)', 5.0, 9999, 5.0, 'MΩ', 'CRITICAL'),
                numericParam('Insulation Resistance SS-G (Applied Voltage)', null, null, null, 'V', 'INFO'),
                numericParam('Insulation Resistance SX-G (Value)', 5.0, 9999, 5.0, 'MΩ', 'CRITICAL'),
                numericParam('Insulation Resistance SX-G (Applied Voltage)', null, null, null, 'V', 'INFO'),
                numericParam('Insulation Resistance SSX-G (Value)', 5.0, 9999, 5.0, 'MΩ', 'CRITICAL'),
                numericParam('Insulation Resistance SSX-G (Applied Voltage)', null, null, null, 'V', 'INFO'),
                numericParam('Insulation Resistance A-G (Value)', 5.0, 9999, 5.0, 'MΩ', 'CRITICAL'),
                numericParam('Insulation Resistance A-G (Applied Voltage)', null, null, null, 'V', 'INFO'),
                numericParam('Insulation Resistance AA-G (Value)', 5.0, 9999, 5.0, 'MΩ', 'CRITICAL'),
                numericParam('Insulation Resistance AA-G (Applied Voltage)', null, null, null, 'V', 'INFO')
              ]
            },
            {
              categoryName: 'Bearing Area Measurements',
              parameters: [
                numericParam('NDE Shaft Journal', 130.00, 130.043, 129.970, 'mm', 'CRITICAL'),
                numericParam('NDE Housing Bore', 230.00, 230.035, 230.000, 'mm', 'CRITICAL'),
                numericParam('DE Shaft Journal', 150.00, 150.043, 149.970, 'mm', 'CRITICAL'),
                numericParam('DE Housing Bore', 225.00, 225.035, 225.000, 'mm', 'CRITICAL')
              ]
            },
            {
              categoryName: 'Armature Inspection',
              parameters: [
                numericParam('Commutator Diameter', 16.0, 16.675, 15.675, 'in', 'MAJOR'),
                numericParam('Spiral Groove Depth', 0.030, 0.046, 0.010, 'in', 'MAJOR'),
                numericParam('Spiral Groove Width', 0.094, 0.096, 0.092, 'in', 'MAJOR'),
                numericParam('Dust Groove Width', 0.437, 0.450, 0.420, 'in', 'MAJOR'),
                numericParam('Undercut Depth', 1.0, 1.2, 0.8, 'mm', 'MAJOR'),
                boolPass('Bar-to-Bar Voltage Drop Uniform'),
                boolPass('Surface Condition Smooth')
              ]
            },
            {
              categoryName: 'Brush Holder Inspection',
              parameters: [
                numericParam('Brush Length (Min 1in)', 1.5, 3.0, 1.0, 'in', 'MAJOR'),
                numericParam('Spring Pressure', 170, 192, 160, 'oz', 'MAJOR'),
                boolPass('Brush Clearance OK')
              ]
            },
            {
              categoryName: 'Component Condition Assessment',
              parameters: [
                reuseRepairReplace('Armature'),
                reuseRepairReplace('Shaft'),
                reuseRepairReplace('Bearings'),
                reuseRepairReplace('Housing'),
                reuseRepairReplace('Brush Holder'),
                reuseRepairReplace('Field Coils'),
                reuseRepairReplace('Drive Ring'),
                reuseRepairReplace('Brake Hub'),
                reuseRepairReplace('Air Baffles'),
                reuseRepairReplace('RTD'),
                reuseRepairReplace('RPM Sensor')
              ]
            },
            {
              categoryName: 'Part Check List',
              parameters: [
                { name: 'Magnetic pickup (VJ0972) Qty:1', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Brush holder (VE8429) Qty:4', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Brush (VE7609) Qty:12', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Armature cable A, AA (VE2836/BF2610) Qty:1', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Magnetic pole cable S/SS/SX/SSX (VE4491/VE4487) Qty:2', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Magnetic pickup cable (VE3957) Qty:1', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Drive Ring (VE4548) Qty:1', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Air Baffle (VE0758) Qty:2', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Mounting Bolt (VE4776) Qty:10', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Support, Brush Holder (VJ0928) Qty:4', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Support Bolt (VF7377) Qty:4', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Clamp (VJ1204) Qty:1', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Clamp (VE4483) Qty:1', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Sensor Terminal Block (VE1272) Qty:2', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Connection Strip (VJ0969) Qty:6', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' },
                { name: 'Jumper / link Strip (VE4524) Qty:1', parameterType: 'DROPDOWN', options: ['Available', 'Not Available'], passingValue: 'Available', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Checklist' }
              ]
            }
          ]
        },
        {
          stageName: 'Pre-Assembly & Assembly',
          categories: [
            {
              categoryName: 'Pre-Assembly Checklist',
              parameters: [
                boolCompleted('Parts Cleaned'),
                boolCompleted('Parts Dried'),
                boolCompleted('Varnish Applied'),
                boolCompleted('Varnish Cured'),
                boolCompleted('Windings Reinsulated'),
                boolCompleted('Bearings Ready'),
                boolCompleted('Seals Ready'),
                boolCompleted('Tools Calibrated')
              ]
            },
            {
              categoryName: 'Assembly Checklist',
              parameters: [
                boolCompleted('Stator Installed'),
                boolCompleted('Rotor Installed'),
                boolCompleted('DE Bearing Installed'),
                boolCompleted('NDE Bearing Installed'),
                boolCompleted('Brush Holder Installed'),
                boolCompleted('Air Baffle Installed'),
                boolCompleted('Drive Ring Installed'),
                boolCompleted('Encoder Installed'),
                boolCompleted('RTD Connected'),
                boolCompleted('Terminal Connections Tightened')
              ]
            },
            {
              categoryName: 'Torque Verification',
              parameters: [
                numericParam('Exciter Pole Torque', 310, 326, 293, 'lb.ft', 'CRITICAL'),
                numericParam('Commutator Pole Torque', 225, 240, 215, 'lb.ft', 'CRITICAL'),
                numericParam('Armature Frame Head Torque', 170, 180, 160, 'lb.ft', 'CRITICAL'),
                numericParam('Air Baffle Torque', 58, 60, 55, 'lb.ft', 'CRITICAL'),
                numericParam('DE Bearing Housing Torque', 58, 60, 55, 'lb.ft', 'CRITICAL'),
                numericParam('NDE Bearing Housing Torque', 58, 60, 55, 'lb.ft', 'CRITICAL'),
                numericParam('Brush Holder Torque', 310, 326, 293, 'lb.ft', 'CRITICAL')
              ]
            }
          ]
        },
        {
          stageName: 'Testing',
          categories: [
            {
              categoryName: 'Testing Photos',
              parameters: [ photoParam('Testing Photos') ]
            },
            {
              categoryName: 'Electrical Tests',
              parameters: [
                numericParam('IR Armature', 5.0, 9999, 5.0, 'MΩ', 'CRITICAL'),
                numericParam('IR Field', 5.0, 9999, 5.0, 'MΩ', 'CRITICAL')
              ]
            },
            {
              categoryName: 'Mechanical Tests',
              parameters: [
                boolPass('No Load Run Test'),
                boolPass('Noise Check'),
                boolPass('Brush Sparking Check')
              ]
            },
            {
              categoryName: 'Sensor Tests',
              parameters: [
                numericParam('Winding Temperature Sensor (RTD) - Resistance Value', null, null, null, 'Ω', 'INFO'),
                boolPass('Winding Temperature Sensor (RTD) - Status'),
                numericParam('RPM Sensor - Resistance Value', null, null, null, 'Ω', 'INFO'),
                boolPass('RPM Sensor - Status')
              ]
            },
            {
              categoryName: 'Surge Test',
              parameters: [
                { name: 'Armature Coil Surge - Waveform Result', parameterType: 'DROPDOWN', options: ['Balanced', 'Unbalanced'], passingValue: 'Balanced', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Testing' },
                numericParam('Armature Coil Surge - Applied Voltage', null, null, null, 'V', 'INFO'),
                boolPass('Armature Coil Surge - Status'),
                { name: 'Field Coil Surge - Waveform Result', parameterType: 'DROPDOWN', options: ['Balanced', 'Unbalanced'], passingValue: 'Balanced', severity: 'MAJOR', measurementRequired: true, photoRequired: false, remarksRequired: true, aiReportSection: 'Testing' },
                numericParam('Field Coil Surge - Applied Voltage', null, null, null, 'V', 'INFO'),
                boolPass('Field Coil Surge - Status')
              ]
            }
          ]
        },
        {
          stageName: 'Dispatch',
          categories: [
            {
              categoryName: 'Dispatch Checklist',
              parameters: [
                boolCompleted('Final Inspection Completed'),
                boolCompleted('QA Approved'),
                boolCompleted('Test Report Attached'),
                boolCompleted('Customer Report Attached'),
                boolCompleted('Dispatch Cleared')
              ]
            },
            {
              categoryName: 'Final Photos',
              parameters: [ photoParam('Final Assembly Photos') ]
            }
          ]
        }
      ]
    });

    // Remove existing 830E DC templates if any
    await InspectionTemplate.deleteMany({ equipmentModel: '830E DC' });
    await template830E.save();

    console.log('✅ Successfully Seeded 830E DC Template!');
    process.exit(0);
  } catch (error) {
    console.error('Error Seeding:', error);
    process.exit(1);
  }
}

seed830E();
