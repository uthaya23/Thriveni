require('dotenv').config();
const mongoose = require('mongoose');

async function fixEmptyDates() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const jobs = db.collection('jobs');

  const dateFields = [
    'dateReceived',
    'disassyDate', 
    'assyDate',
    'sendDate',
    'installedDate',
    'removalDate',
    'completedAt',
    'recDate',
    'rfdDate'
  ];

  // Build unset object for empty string dates
  let totalFixed = 0;

  for (const field of dateFields) {
    // Find jobs where this field is an empty string
    const result = await jobs.updateMany(
      { [field]: '' },
      { $unset: { [field]: '' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`Fixed ${result.modifiedCount} jobs with empty string ${field}`);
      totalFixed += result.modifiedCount;
    }
  }

  // Also fix "Invalid Date" strings
  for (const field of dateFields) {
    const result = await jobs.updateMany(
      { [field]: 'Invalid Date' },
      { $unset: { [field]: '' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`Fixed ${result.modifiedCount} jobs with Invalid Date in ${field}`);
      totalFixed += result.modifiedCount;
    }
  }

  console.log(`\nTotal fields fixed: ${totalFixed}`);

  // Verify the fix
  const sample = await jobs.find(
    {},
    { 
      projection: { 
        jobNo: 1, 
        dateReceived: 1, 
        disassyDate: 1,
        assyDate: 1,
        sendDate: 1,
        _id: 0 
      } 
    }
  ).limit(5).toArray();

  console.log('\nSample after fix:');
  console.log(JSON.stringify(sample, null, 2));

  await mongoose.disconnect();
  console.log('\nDone. Disconnected from MongoDB.');
}

fixEmptyDates().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
