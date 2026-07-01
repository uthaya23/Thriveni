const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('./models/Job');

dotenv.config();

const jobNos = [
  "J/TRC/EH5000GBM010",
  "J/TRC/EH5000WM010",
  "J/TRC/EH5000WM016",
  "J/TRC/EH5000WM017",
  "J/TRC/EH5000WM015",
  "J/TRC/EH5000WM004",
  "J/TRC/EH5000WM008",
  "J/TRC/EH5000WM012",
  "J/TRC/DW038",
  "J/TRC/DW040",
  "J/TRC/DW041",
  "J/TRC/EH5000A010",
  "J/TRC/EH5000A001",
  "J/TRC/EH5000A002"
];

async function activateJobs() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const result = await Job.updateMany(
      { jobNo: { $in: jobNos } },
      { 
        $set: { 
          status: 'RFD',
          stage: 'Testing & Dispatch' 
        } 
      }
    );

    console.log(`Matched ${result.matchedCount} jobs.`);
    console.log(`Modified ${result.modifiedCount} jobs.`);

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

activateJobs();
