const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const JobSchema = new mongoose.Schema({}, { strict: false });
const Job = mongoose.model('Job', JobSchema);

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const jobs = await Job.find({}, 'jobNo description equipmentModel componentType');
  console.log('JOBS LIST:');
  jobs.forEach(j => {
    console.log(`- JobNo: ${j.get('jobNo')}, Desc: ${j.get('description')}, Model: ${j.get('equipmentModel')}, Type: ${j.get('componentType')}`);
  });
  process.exit(0);
}

check().catch(console.error);
