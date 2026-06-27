const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const RepairMethod = require('../models/RepairMethod');
const EquipmentFamily = require('../models/EquipmentFamily');
const Instrument = require('../models/Instrument');
const InspectionTemplate = require('../models/InspectionTemplate');

async function seedOemEngine() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB for Seeding OEM Framework...');

    // Clear old data
    await RepairMethod.deleteMany({});
    await EquipmentFamily.deleteMany({});
    await Instrument.deleteMany({});
    await InspectionTemplate.deleteMany({});
    console.log('🗑️ Cleared existing OEM frameworks');

    // 1. Seed Instruments
    const instruments = await Instrument.insertMany([
      { name: 'Megger MIT525', type: 'Insulation Tester' },
      { name: 'Megger MIT1025', type: 'Insulation Tester' },
      { name: 'Surge Tester', type: 'Winding Tester' },
      { name: 'Micrometer 100-200mm', type: 'Dimensional Tool' },
      { name: 'Vernier Caliper', type: 'Dimensional Tool' },
      { name: 'Dial Indicator', type: 'Runout Tool' },
      { name: 'Bore Gauge', type: 'Dimensional Tool' },
      { name: 'Multimeter', type: 'Electrical Tool' }
    ]);
    console.log(`✅ Seeded ${instruments.length} Instruments`);

    // 2. Seed Equipment Families
    const families = await EquipmentFamily.insertMany([
      { familyName: 'Mining Trucks', description: 'Heavy haul trucks' },
      { familyName: 'Alternators', description: 'Main power generation' },
      { familyName: 'Auxiliaries', description: 'Blower motors and control cabinets' }
    ]);
    const truckFamily = families.find(f => f.familyName === 'Mining Trucks');

    // 3. Seed Repair Methods
    const repairMethods = await RepairMethod.insertMany([
      { code: 'RM001', title: 'Drying & Baking', category: 'Electrical', estimatedHours: 24 },
      { code: 'RM002', title: 'Bearing Replacement', category: 'Mechanical', estimatedHours: 4 },
      { code: 'RM003', title: 'Metal Spray', category: 'Machining', estimatedHours: 8 },
      { code: 'RM004', title: 'Sleeve Repair', category: 'Machining', estimatedHours: 12 },
      { code: 'RM005', title: 'Dynamic Rotor Balancing', category: 'Mechanical', estimatedHours: 6 },
      { code: 'RM006', title: 'Complete Rewinding', category: 'Electrical', estimatedHours: 120 },
      { code: 'RM007', title: 'VPI Treatment', category: 'Electrical', estimatedHours: 48 },
      { code: 'RM008', title: 'Component Replacement', category: 'General', estimatedHours: 2 },
      { code: 'RM009', title: 'Engineering Evaluation Required', category: 'Engineering', estimatedHours: 8 }
    ]);
    const getRM = (code) => repairMethods.find(r => r.code === code)._id;

    // Helper functions for parameter definitions
    const textParam = (name, required = true) => ({ name, parameterType: 'TEXT', measurementRequired: required, photoRequired: false, aiReportSection: 'Visual Assessment' });
    const conditionParam = (name) => ({ name, parameterType: 'DROPDOWN', options: ['Good', 'Minor Defect', 'Major Defect'], passingValue: 'Good', severity: 'MAJOR', measurementRequired: true, photoRequired: false, aiReportSection: 'Visual Assessment' });
    const photoParam = (name, required = true) => ({ name, parameterType: 'PHOTO_REQUIRED', measurementRequired: false, photoRequired: required, aiReportSection: 'Visual Assessment' });
    const booleanParam = (name, pass, failList, severity) => ({ name, parameterType: 'BOOLEAN', options: [pass, ...failList], passingValue: pass, severity, measurementRequired: true, photoRequired: false, aiReportSection: 'Visual Assessment' });

    const boolYes = (name, severity = 'MAJOR') => booleanParam(name, 'Yes', ['No'], severity);
    const boolNo = (name, severity = 'MAJOR') => booleanParam(name, 'No', ['Yes'], severity);
    const numericParam = (name, std, tolMax, tolMin, unit, oemCode, severity, tolType, units) => ({
      name, parameterType: 'NUMERIC', standardValue: std, toleranceMax: tolMax, toleranceMin: tolMin, unit, oemProcedure: oemCode, severity, toleranceType: tolType, unitOptions: units, measurementRequired: true, photoRequired: false, aiReportSection: 'Dimensional Assessment'
    });

    // 4. Build Comprehensive EH5000 Template
    const eh5000Template = new InspectionTemplate({
      equipmentFamily: truckFamily._id,
      equipmentModel: 'EH5000 Wheel Motor',
      templateVersion: '2.0',
      oemDocumentReference: 'HITACHI-EH5000-VOL2',
      isActive: true,
      stages: [
        {
          stageName: 'Visual Inspection',
          categories: [
            {
              categoryName: 'Incoming Photo Gallery',
              parameters: [
                photoParam('Overall Front View'),
                photoParam('Overall Rear View'),
                photoParam('Nameplate'),
                photoParam('Drive End'),
                photoParam('Non Drive End'),
                photoParam('Terminal Box')
              ]
            },
            {
              categoryName: 'External Condition Inspection',
              parameters: [
                boolYes('Paint Intact'),
                boolNo('Corrosion Present'),
                boolNo('Physical Damage'),
                boolNo('Impact Marks'),
                boolNo('Oil Contamination'),
                boolNo('Grease Leakage'),
                boolNo('Dirt Accumulation'),
                boolNo('Water Ingress Evidence')
              ]
            },
            {
              categoryName: 'Cable & Terminal Box Inspection',
              parameters: [
                boolYes('Terminal Box Intact'),
                boolYes('Cable Glands Intact'),
                boolYes('Terminal Studs Intact')
              ]
            },
            {
              categoryName: 'Sensor Inspection',
              parameters: [
                boolYes('Speed Sensor Available'),
                boolYes('Speed Sensor Condition Good'),
                boolYes('RTD 1 Available'),
                boolYes('RTD 1 Condition Good'),
                boolYes('RTD 2 Available'),
                boolYes('RTD 2 Condition Good'),
                boolYes('BTD 1 Available'),
                boolYes('BTD 1 Condition Good')
              ]
            }
          ]
        },
        {
          stageName: 'Electrical Testing',
          categories: [
            {
              categoryName: 'Insulation Resistance Test',
              parameters: [
                {
                  name: 'Applied Voltage',
                  parameterType: 'NUMERIC',
                  unit: 'V',
                  measurementRequired: true,
                  photoRequired: true,
                  aiReportSection: 'Electrical Assessment'
                },
                {
                  name: 'U to G IR',
                  parameterType: 'NUMERIC',
                  severity: 'CRITICAL',
                  standardValue: 10,
                  toleranceType: 'MINIMUM',
                  unitOptions: ['MΩ', 'GΩ', 'kΩ', 'mΩ', 'Ω', 'TΩ'],
                  repairMethod: getRM('RM001'),
                  measurementRequired: true,
                  photoRequired: true,
                  aiReportSection: 'Electrical Assessment'
                },
                {
                  name: 'V to G IR',
                  parameterType: 'NUMERIC',
                  severity: 'CRITICAL',
                  standardValue: 10,
                  toleranceType: 'MINIMUM',
                  unitOptions: ['MΩ', 'GΩ', 'kΩ', 'mΩ', 'Ω', 'TΩ'],
                  repairMethod: getRM('RM001'),
                  measurementRequired: true,
                  photoRequired: true,
                  aiReportSection: 'Electrical Assessment'
                },
                {
                  name: 'W to G IR',
                  parameterType: 'NUMERIC',
                  severity: 'CRITICAL',
                  standardValue: 10,
                  toleranceType: 'MINIMUM',
                  unitOptions: ['MΩ', 'GΩ', 'kΩ', 'mΩ', 'Ω', 'TΩ'],
                  repairMethod: getRM('RM001'),
                  measurementRequired: true,
                  photoRequired: true,
                  aiReportSection: 'Electrical Assessment'
                },
                boolNo('Voltage Drop Observed', 'CRITICAL')
              ]
            },
            {
              categoryName: 'Polarization Index (PI) Test',
              parameters: [
                {
                  name: '1 Minute Reading',
                  parameterType: 'NUMERIC',
                  unit: 'MΩ',
                  measurementRequired: true,
                  photoRequired: false,
                  aiReportSection: 'Electrical Assessment'
                },
                {
                  name: '10 Minute Reading',
                  parameterType: 'NUMERIC',
                  unit: 'MΩ',
                  measurementRequired: true,
                  photoRequired: false,
                  aiReportSection: 'Electrical Assessment'
                },
                {
                  name: 'PI Ratio',
                  parameterType: 'NUMERIC',
                  severity: 'CRITICAL',
                  standardValue: 2.0,
                  toleranceType: 'MINIMUM',
                  repairMethod: getRM('RM001'),
                  measurementRequired: true,
                  photoRequired: true,
                  aiReportSection: 'Electrical Assessment'
                }
              ]
            },
            {
              categoryName: 'Winding Resistance Test',
              parameters: [
                {
                  name: 'U-V Resistance',
                  parameterType: 'NUMERIC',
                  severity: 'MAJOR',
                  unitOptions: ['mΩ', 'Ω', 'kΩ', 'MΩ'],
                  toleranceType: 'BALANCE',
                  toleranceMax: 5,
                  repairMethod: getRM('RM006'),
                  measurementRequired: true,
                  photoRequired: true,
                  aiReportSection: 'Electrical Assessment'
                },
                {
                  name: 'V-W Resistance',
                  parameterType: 'NUMERIC',
                  severity: 'MAJOR',
                  unitOptions: ['mΩ', 'Ω', 'kΩ', 'MΩ'],
                  toleranceType: 'BALANCE',
                  toleranceMax: 5,
                  repairMethod: getRM('RM006'),
                  measurementRequired: true,
                  photoRequired: true,
                  aiReportSection: 'Electrical Assessment'
                },
                {
                  name: 'W-U Resistance',
                  parameterType: 'NUMERIC',
                  severity: 'MAJOR',
                  unitOptions: ['mΩ', 'Ω', 'kΩ', 'MΩ'],
                  toleranceType: 'BALANCE',
                  toleranceMax: 5,
                  repairMethod: getRM('RM006'),
                  measurementRequired: true,
                  photoRequired: true,
                  aiReportSection: 'Electrical Assessment'
                }
              ]
            },
            {
              categoryName: 'RTD Sensor Testing',
              parameters: [
                { name: 'RTD 1 Resistance', parameterType: 'NUMERIC', unit: 'Ω', standardValue: 100, toleranceType: 'RANGE', toleranceMin: 98, toleranceMax: 120, severity: 'MINOR', repairMethod: getRM('RM008'), measurementRequired: true, photoRequired: false, aiReportSection: 'Electrical Assessment' },
                { name: 'RTD 2 Resistance', parameterType: 'NUMERIC', unit: 'Ω', standardValue: 100, toleranceType: 'RANGE', toleranceMin: 98, toleranceMax: 120, severity: 'MINOR', repairMethod: getRM('RM008'), measurementRequired: true, photoRequired: false, aiReportSection: 'Electrical Assessment' },
                { name: 'RTD 3 Resistance', parameterType: 'NUMERIC', unit: 'Ω', standardValue: 100, toleranceType: 'RANGE', toleranceMin: 98, toleranceMax: 120, severity: 'MINOR', repairMethod: getRM('RM008'), measurementRequired: true, photoRequired: false, aiReportSection: 'Electrical Assessment' }
              ]
            },
            {
              categoryName: 'Encoder / Speed Sensor Check',
              parameters: [
                { name: 'Continuity Check', parameterType: 'BOOLEAN', options: ['Pass', 'Fail'], passingValue: 'Pass', severity: 'MAJOR', repairMethod: getRM('RM008'), measurementRequired: true, photoRequired: false, aiReportSection: 'Electrical Assessment' },
                { name: 'Sensor Visual Inspection', parameterType: 'BOOLEAN', options: ['Intact', 'Damaged'], passingValue: 'Intact', severity: 'MINOR', repairMethod: getRM('RM008'), measurementRequired: true, photoRequired: false, aiReportSection: 'Electrical Assessment' }
              ]
            }
          ]
        },
        {
          stageName: 'Dimensional Inspection',
          categories: [
            {
              categoryName: 'Critical Fits (Bearing Seats)',
              parameters: [
                numericParam('DE Bearing Seat Diameter', 150.00, 150.05, 149.95, 'mm', 'EH-DIM-01', 'CRITICAL', 'NONE', ['mm', 'in']),
                numericParam('NDE Bearing Seat Diameter', 120.00, 120.05, 119.95, 'mm', 'EH-DIM-02', 'CRITICAL', 'NONE', ['mm', 'in']),
                numericParam('Housing Bore DE', 250.00, 250.10, 249.90, 'mm', 'EH-DIM-03', 'CRITICAL', 'NONE', ['mm', 'in']),
                numericParam('Housing Bore NDE', 200.00, 200.10, 199.90, 'mm', 'EH-DIM-04', 'CRITICAL', 'NONE', ['mm', 'in'])
              ]
            },
            {
              categoryName: 'Runouts & Clearances',
              parameters: [
                numericParam('Rotor Runout TIR', 0.05, 0.05, 0.00, 'mm', 'EH-DIM-05', 'MAJOR', 'MAXIMUM', ['mm', 'in']),
                numericParam('Shaft Runout TIR', 0.03, 0.03, 0.00, 'mm', 'EH-DIM-06', 'MAJOR', 'MAXIMUM', ['mm', 'in']),
                numericParam('Air Gap Clearance DE', 2.50, 2.70, 2.30, 'mm', 'EH-DIM-07', 'CRITICAL', 'NONE', ['mm', 'in']),
                numericParam('Air Gap Clearance NDE', 2.50, 2.70, 2.30, 'mm', 'EH-DIM-08', 'CRITICAL', 'NONE', ['mm', 'in'])
              ]
            },
            {
              categoryName: 'Brake Disc Geometry',
              parameters: [
                numericParam('Disc Thickness', 30.0, 30.5, 28.0, 'mm', 'EH-DIM-09', 'MAJOR', 'NONE', ['mm', 'in']),
                numericParam('Disc Runout', 0.15, 0.15, 0.00, 'mm', 'EH-DIM-10', 'MAJOR', 'MAXIMUM', ['mm', 'in'])
              ]
            },
            {
              categoryName: 'Insulation Resistance (IR)',
              parameters: [
                numericParam('U Phase to Ground (1000V)', 500, null, 100, 'MΩ', 'EH-ELEC-01', 'CRITICAL', 'MINIMUM', ['MΩ', 'GΩ', 'TΩ', 'kΩ', 'Ω', 'mΩ']),
                numericParam('V Phase to Ground (1000V)', 500, null, 100, 'MΩ', 'EH-ELEC-01', 'CRITICAL', 'MINIMUM', ['MΩ', 'GΩ', 'TΩ', 'kΩ', 'Ω', 'mΩ']),
                numericParam('W Phase to Ground (1000V)', 500, null, 100, 'MΩ', 'EH-ELEC-01', 'CRITICAL', 'MINIMUM', ['MΩ', 'GΩ', 'TΩ', 'kΩ', 'Ω', 'mΩ'])
              ]
            },
            {
              categoryName: 'Winding Resistance (MilliOhm)',
              parameters: [
                numericParam('U-V Phase Resistance', 15.0, 15.5, 14.5, 'mΩ', 'EH-ELEC-02', 'MAJOR', 'NONE', ['mΩ', 'Ω', 'kΩ']),
                numericParam('V-W Phase Resistance', 15.0, 15.5, 14.5, 'mΩ', 'EH-ELEC-02', 'MAJOR', 'NONE', ['mΩ', 'Ω', 'kΩ']),
                numericParam('W-U Phase Resistance', 15.0, 15.5, 14.5, 'mΩ', 'EH-ELEC-02', 'MAJOR', 'NONE', ['mΩ', 'Ω', 'kΩ'])
              ]
            }
          ]
        },

        {
          stageName: 'Repair / Reclamation',
          categories: [
            {
              categoryName: 'Reclamation Works',
              parameters: [
                { name: 'Parts Repaired', parameterType: 'TEXT', measurementRequired: true, photoRequired: true, aiReportSection: 'Repair Details' },
                { name: 'Machining Details', parameterType: 'TEXT', measurementRequired: false, photoRequired: false, aiReportSection: 'Repair Details' },
                { name: 'Welding Details', parameterType: 'TEXT', measurementRequired: false, photoRequired: false, aiReportSection: 'Repair Details' }
              ]
            }
          ]
        },
        {
          stageName: 'Pre-Assembly',
          categories: [
            {
              categoryName: 'Stator Preparation',
              parameters: [
                boolNo('Stator Cleaned', 'MAJOR'),
                boolNo('Winding Repaired', 'MAJOR'),
                boolNo('RTD Installed', 'MAJOR'),
                boolNo('Lead Connections Repaired', 'MAJOR'),
                boolNo('Slot Wedges Checked', 'MAJOR')
              ]
            },
            {
              categoryName: 'Varnish Activity',
              parameters: [
                boolNo('Varnish Applied', 'CRITICAL'),
                { name: 'Varnish Type', parameterType: 'TEXT', measurementRequired: true, photoRequired: false, aiReportSection: 'Repair Details' },
                { name: 'Batch No', parameterType: 'TEXT', measurementRequired: true, photoRequired: false, aiReportSection: 'Repair Details' },
                { name: 'Date', parameterType: 'TEXT', measurementRequired: true, photoRequired: false, aiReportSection: 'Repair Details' },
                { name: 'Technician', parameterType: 'TEXT', measurementRequired: true, photoRequired: false, aiReportSection: 'Repair Details' }
              ]
            },
            {
              categoryName: 'Baking',
              parameters: [
                boolNo('Baking Completed', 'CRITICAL'),
                { name: 'Temperature (°C)', parameterType: 'NUMERIC', standardValue: 150, minValue: 140, maxValue: 160, unit: '°C', severity: 'MAJOR', toleranceType: 'RANGE', unitOptions: ['°C', '°F'], aiReportSection: 'Repair Details' },
                { name: 'Duration (Hours)', parameterType: 'NUMERIC', standardValue: 8, minValue: 6, maxValue: 10, unit: 'Hours', severity: 'MAJOR', toleranceType: 'RANGE', unitOptions: ['Hours'], aiReportSection: 'Repair Details' },
                { name: 'Oven Number', parameterType: 'TEXT', measurementRequired: true, photoRequired: false, aiReportSection: 'Repair Details' }
              ]
            },
            {
              categoryName: 'Post-Varnish Electrical Verification',
              parameters: [
                numericParam('IR Value Before', 500, null, 100, 'MΩ', 'EH-ELEC-03', 'CRITICAL', 'MINIMUM', ['MΩ', 'GΩ']),
                numericParam('IR Value After', 1000, null, 500, 'MΩ', 'EH-ELEC-04', 'CRITICAL', 'MINIMUM', ['MΩ', 'GΩ']),
                numericParam('PI Value Before', 2.0, null, 1.0, 'Ratio', 'EH-ELEC-05', 'CRITICAL', 'MINIMUM', ['Ratio']),
                numericParam('PI Value After', 2.0, null, 1.5, 'Ratio', 'EH-ELEC-06', 'CRITICAL', 'MINIMUM', ['Ratio'])
              ]
            },
            {
              categoryName: 'Pre-Assembly Readiness',
              parameters: [
                boolNo('Rotor Ready', 'CRITICAL'),
                boolNo('Stator Ready', 'CRITICAL'),
                boolNo('Bearings Available', 'CRITICAL'),
                boolNo('Seals Available', 'CRITICAL'),
                boolNo('Encoder Available', 'MAJOR'),
                boolNo('Brake Components Ready', 'MAJOR'),
                boolNo('Drive Ring Ready', 'MAJOR')
              ]
            }
          ]
        },
        {
          stageName: 'Engineering Assessment',
          categories: [
            {
              categoryName: 'Final Engineering Review',
              parameters: [
                { name: 'Visual Inspection Remarks', parameterType: 'TEXT', measurementRequired: true, photoRequired: false, aiReportSection: 'Failure Analysis' },
                { name: 'Electrical Test Remarks', parameterType: 'TEXT', measurementRequired: true, photoRequired: false, aiReportSection: 'Failure Analysis' },
                { 
                  name: 'Suspected Failure Cause', 
                  parameterType: 'DROPDOWN', 
                  options: ['Bearing Failure', 'Insulation Failure', 'Moisture Ingress', 'Overheating', 'Mechanical Damage', 'Rotor Damage', 'Sensor Failure', 'Multiple Causes', 'None (Routine Overhaul)'],
                  passingValue: 'None (Routine Overhaul)',
                  severity: 'INFO',
                  measurementRequired: true,
                  photoRequired: false,
                  aiReportSection: 'Failure Analysis'
                },
                { 
                  name: 'Recommended Repair Action', 
                  parameterType: 'DROPDOWN', 
                  options: ['Serviceable', 'Minor Repair Required', 'Major Overhaul Required', 'Engineering Evaluation Required'],
                  passingValue: 'Serviceable',
                  severity: 'INFO',
                  repairMethod: getRM('RM009'),
                  measurementRequired: true,
                  photoRequired: false,
                  aiReportSection: 'Failure Analysis'
                }
              ]
            }
          ]
        }
      ]
    });

    await eh5000Template.save();
    console.log(`✅ Seeded Comprehensive EH5000 Wheel Motor Template successfully!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  }
}

seedOemEngine();
