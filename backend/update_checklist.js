require('dotenv').config();
const mongoose = require('mongoose');
const ComponentTemplate = require('./models/ComponentTemplate');

async function update() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await ComponentTemplate.updateOne(
    { componentKey: '830E_DC_MAIN_ALTERNATOR' },
    {
      $set: {
        'stage2.dismantlingChecklist': [
          'Fan Housings Removed', 'Impellers Removed', 'Speed Sensor Removed',
          'Carbon Brushes Removed', 'Brush Holders Removed', 'Connection Box Opened',
          'Bearing Housing Assembly Removed', 'Bearings Removed',
          'Hub Removed', 'Engine Mounting Flange Removed', 'Rotor Removed'
        ]
      }
    }
  );
  console.log('Updated:', result.modifiedCount, 'document(s)');
  mongoose.connection.close();
}
update().catch(console.error);
