const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const JobSchema = new mongoose.Schema({
  description: String,
  componentType: String
}, { strict: false });
const Job = mongoose.model('Job', JobSchema);

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB for migration');

  const jobs = await Job.find({});
  let updatedCount = 0;

  for (const job of jobs) {
    const desc = (job.description || '').toLowerCase();
    let targetType = job.componentType;

    if (desc.includes('wheel motor') || desc.includes('traction motor')) {
      targetType = 'Wheel Motor';
    } else if (desc.includes('alternator') || desc.includes('generator')) {
      targetType = 'Alternator';
    } else if (desc.includes('grid blower') || desc.includes('gbm')) {
      targetType = 'GBM';
    } else if (desc.includes('main blower') || desc.includes('mbm')) {
      targetType = 'MBM';
    } else if (desc.includes('transformer')) {
      targetType = 'Transformer';
    }

    if (targetType && targetType !== job.componentType) {
      job.componentType = targetType;
      await job.save();
      updatedCount++;
      console.log(`Updated Job ${job.jobNo || job._id}: "${job.description}" -> componentType: "${targetType}"`);
    }
  }

  console.log(`🎉 Migration completed! Updated ${updatedCount} jobs.`);
  process.exit(0);
}

migrate().catch(console.error);
