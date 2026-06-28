require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await Job.findOneAndUpdate(
    { jobNo: 'AUDIT001' },
    { stage: 'Testing & Dispatch' },
    { new: true }
  );
  console.log('Updated job stage:', result?.stage);
  await mongoose.disconnect();
});
