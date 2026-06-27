const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');

async function checkModels() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const models = await Job.aggregate([
      { $group: { _id: '$equipmentModel', count: { $sum: 1 } } }
    ]);
    console.log('Equipment Model breakdown:');
    models.forEach(m => console.log(`- ${m._id}: ${m.count}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkModels();
