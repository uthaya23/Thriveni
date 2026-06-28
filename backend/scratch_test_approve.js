require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const QAReview = require('./models/QAReview');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const admin = await User.findOne({ role: 'admin' });
  const review = await QAReview.findOne({ status: 'Pending' });
  
  if (!review) {
    console.log("No pending review found");
    process.exit(0);
  }
  
  console.log(`Found pending review for job ${review.job}`);
  
  // Try to approve it like the route does
  try {
    review.status = 'Approved';
    review.reviewedBy = admin._id;
    review.reviewedAt = new Date();
    review.approvalNotes = 'Test approve';
    await review.save();
    console.log("Successfully approved in DB");
  } catch (err) {
    console.log("Error approving:", err);
  }
  process.exit(0);
});
