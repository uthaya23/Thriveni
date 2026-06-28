require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function checkIndexes() {
  await mongoose.connect(process.env.MONGO_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  if (collections.some(c => c.name === 'assets')) {
    const indexes = await mongoose.connection.db.collection('assets').indexes();
    console.log('Indexes on assets:', indexes);
    // Drop the old index if it exists
    try {
      await mongoose.connection.db.collection('assets').dropIndex('assetId_1');
      console.log('Dropped assetId_1 index successfully');
    } catch (e) {
      console.log('Could not drop assetId_1:', e.message);
    }
  }
  process.exit(0);
}
checkIndexes().catch(console.error);
