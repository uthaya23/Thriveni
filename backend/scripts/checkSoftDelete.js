require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  
  const db = mongoose.connection.db;
  
  // Query directly without Mongoose middleware
  const deletedJobs = await db.collection('jobs')
    .find({ isDeleted: true })
    .project({ jobNo: 1, deletedAt: 1, _id: 0 })
    .toArray();

  console.log('Soft deleted jobs:');
  console.log(JSON.stringify(deletedJobs, null, 2));

  const totalJobs = await db.collection('jobs').countDocuments({});
  const activeJobs = await db.collection('jobs').countDocuments({ isDeleted: { $ne: true } });
  const deletedCount = await db.collection('jobs').countDocuments({ isDeleted: true });

  console.log(`\nTotal in database: ${totalJobs}`);
  console.log(`Active jobs: ${activeJobs}`);
  console.log(`Soft deleted: ${deletedCount}`);

  await mongoose.disconnect();
}

check().catch(console.error);
