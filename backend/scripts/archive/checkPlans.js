const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const ProductionPlan = require('../models/ProductionPlan');

async function checkPlans() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const plansCount = await ProductionPlan.countDocuments();
    console.log('Total production plans in DB:', plansCount);

    const plans = await ProductionPlan.find({}).limit(10);
    console.log('Sample plans:', JSON.stringify(plans, null, 2));

    const junePlans = await ProductionPlan.find({ month: '2026-06' });
    console.log('June 2026 plans count:', junePlans.length);
    if (junePlans.length > 0) {
      console.log('June plans sum plannedQty:', junePlans.reduce((sum, p) => sum + p.plannedQty, 0));
    }

    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkPlans();
