const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('./models/Job');
const JobData = require('./models/JobData');
const AuditEvent = require('./models/AuditEvent');

async function deleteJob() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const jobNo = 'J/TRC/EH5000WM022';
    const job = await Job.findOne({ jobNo });

    if (job) {
      await JobData.deleteMany({ job: job._id });
      await AuditEvent.deleteMany({ entityId: job._id });
      await Job.deleteOne({ _id: job._id });
      console.log('Successfully hard deleted job, job data, and audit logs.');
    } else {
      console.log('Job not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

deleteJob();
