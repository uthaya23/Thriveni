require('dotenv').config();
const mongoose = require('mongoose');
const QAReview = require('./models/QAReview');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const review = await QAReview.findOne({ job: '6a4000b5b3f0979e8c8c8ceb' });
  console.log("DB Review:", review);
  process.exit(0);
});
