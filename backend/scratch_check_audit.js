require('dotenv').config();
const mongoose = require('mongoose');
const QAReview = require('./models/QAReview');
const Job = require('./models/Job');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const job = await Job.findOne({ jobNo: 'AUDIT001' });
  console.log('Job stage:', job?.stage);
  const qa = await QAReview.findOne({ job: job?._id });
  console.log('QA Review:', JSON.stringify(qa, null, 2));
  await mongoose.disconnect();
});
