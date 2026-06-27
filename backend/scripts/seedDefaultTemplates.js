const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const ComponentTemplate = require('../models/ComponentTemplate');

  const templates = [
    {
      componentKey: 'DEFAULT_GBM',
      displayName: 'Grid Blower Motor (GBM)',
      equipmentModels: ['EH5000', 'EH4500', '830E DC', '830E AC'],
      componentType: 'GBM',
      isActive: true,
      stage1: {
        electricalTests: [
          { name: 'Insulation Resistance (IR)', standardValue: '>5', minValue: 5, unit: 'MΩ', isRange: false },
          { name: 'Winding Resistance', standardValue: '0.5 - 2.0', minValue: 0.5, maxValue: 2.0, unit: 'Ω', isRange: true }
        ],
        partsChecklist: [
          { partName: 'Terminal Box', partNo: '', quantity: 1 }
        ],
        surgeTests: [],
        sensorTests: []
      },
      stage2: {
        dismantlingChecklist: ['Remove Covers', 'Extract Rotor', 'Inspect Stator'],
        dimensionalMeasurements: [
          { name: 'Bearing Housing NDE', min: 100, max: 100.05, unit: 'mm' }
        ],
        componentConditionList: ['Rotor', 'Stator', 'Bearings']
      },
      stage3: {
        assemblyChecklist: ['Install Rotor', 'Fit Bearings', 'Close Covers'],
        torqueVerifications: [
          { name: 'Cover Bolts', min: 40, max: 50, unit: 'Nm' }
        ]
      },
      stage4: {
        electricalTests: [
          { name: 'Final IR Test', standardValue: '>5', minValue: 5, unit: 'MΩ', isRange: false }
        ],
        functionalTests: ['No Load Run Test'],
        surgeTests: [],
        sensorTests: [],
        dispatchChecklist: []
      }
    },
    {
      componentKey: 'DEFAULT_MBM',
      displayName: 'Main Blower Motor (MBM)',
      equipmentModels: ['EH5000', 'EH4500', '830E DC', '830E AC'],
      componentType: 'MBM',
      isActive: true,
      stage1: {
        electricalTests: [
          { name: 'Insulation Resistance (IR)', standardValue: '>5', minValue: 5, unit: 'MΩ', isRange: false },
          { name: 'Winding Resistance', standardValue: '0.5 - 2.0', minValue: 0.5, maxValue: 2.0, unit: 'Ω', isRange: true }
        ],
        partsChecklist: [
          { partName: 'Terminal Box', partNo: '', quantity: 1 }
        ],
        surgeTests: [],
        sensorTests: []
      },
      stage2: {
        dismantlingChecklist: ['Remove Covers', 'Extract Rotor', 'Inspect Stator'],
        dimensionalMeasurements: [
          { name: 'Bearing Housing NDE', min: 100, max: 100.05, unit: 'mm' }
        ],
        componentConditionList: ['Rotor', 'Stator', 'Bearings']
      },
      stage3: {
        assemblyChecklist: ['Install Rotor', 'Fit Bearings', 'Close Covers'],
        torqueVerifications: [
          { name: 'Cover Bolts', min: 40, max: 50, unit: 'Nm' }
        ]
      },
      stage4: {
        electricalTests: [
          { name: 'Final IR Test', standardValue: '>5', minValue: 5, unit: 'MΩ', isRange: false }
        ],
        functionalTests: ['No Load Run Test'],
        surgeTests: [],
        sensorTests: [],
        dispatchChecklist: []
      }
    },
    {
      componentKey: 'DEFAULT_TRANSFORMER',
      displayName: 'Transformer',
      equipmentModels: ['EH5000', 'EH4500', '830E DC', '830E AC'],
      componentType: 'Transformer',
      isActive: true,
      stage1: {
        electricalTests: [
          { name: 'Primary IR', standardValue: '>100', minValue: 100, unit: 'MΩ', isRange: false },
          { name: 'Secondary IR', standardValue: '>100', minValue: 100, unit: 'MΩ', isRange: false },
          { name: 'Winding Resistance (Pri)', standardValue: '0.1 - 0.5', minValue: 0.1, maxValue: 0.5, unit: 'Ω', isRange: true }
        ],
        partsChecklist: [
          { partName: 'Bushing', partNo: '', quantity: 3 }
        ],
        surgeTests: [],
        sensorTests: []
      },
      stage2: {
        dismantlingChecklist: ['Drain Oil', 'Remove Bushings', 'Extract Core'],
        dimensionalMeasurements: [],
        componentConditionList: ['Core', 'Windings', 'Tank']
      },
      stage3: {
        assemblyChecklist: ['Install Core', 'Fit Bushings', 'Fill Oil'],
        torqueVerifications: [
          { name: 'Tank Cover Bolts', min: 80, max: 100, unit: 'Nm' }
        ]
      },
      stage4: {
        electricalTests: [
          { name: 'Final Primary IR', standardValue: '>100', minValue: 100, unit: 'MΩ', isRange: false }
        ],
        functionalTests: ['Ratio Test'],
        surgeTests: [],
        sensorTests: [],
        dispatchChecklist: []
      }
    }
  ];

  for (const t of templates) {
    await ComponentTemplate.findOneAndUpdate(
      { componentKey: t.componentKey },
      { $set: t },
      { upsert: true, new: true }
    );
    console.log('Created/Updated template:', t.componentKey);
  }

  mongoose.disconnect();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
