const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const ProductionPlan = require('../models/ProductionPlan');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to DB for migration');

    const plans = await ProductionPlan.find();
    console.log(`Found ${plans.length} plans to migrate.`);

    for (const plan of plans) {
      plan.financialYear = '2026-2027'; // Default for existing data

      // Determine quarter from month (YYYY-MM)
      const monthStr = plan.month; // e.g., '2026-04'
      if (monthStr) {
        const m = parseInt(monthStr.split('-')[1], 10);
        // Financial Year Q1: Apr, May, Jun
        if (m >= 4 && m <= 6) plan.quarter = 'Q1';
        else if (m >= 7 && m <= 9) plan.quarter = 'Q2';
        else if (m >= 10 && m <= 12) plan.quarter = 'Q3';
        else if (m >= 1 && m <= 3) plan.quarter = 'Q4';
      }

      // Migrate remarks to remarksHistory
      if (plan.remarks && plan.remarks.trim() !== '' && plan.remarksHistory.length === 0) {
        plan.remarksHistory.push({
          remark: plan.remarks,
          date: new Date()
        });
      }

      await plan.save();
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
