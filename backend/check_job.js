require('dotenv').config();
const mongoose = require('mongoose');
const JobData = require('./models/JobData');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const jd = await JobData.findOne({ job: 'J/TRC/DA021' });
  console.log('Stage 1 photos:', jd?.stage1?.photos);
  mongoose.connection.close();
}
check();
