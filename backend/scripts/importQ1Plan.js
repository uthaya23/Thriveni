const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const ProductionPlan = require('../models/ProductionPlan');
const Job = require('../models/Job');

const plansData = [
  // KOMATSU 830E AC
  { make: 'KOMATSU', model: '830E AC', desc: 'Wheel Motor', apr: 1, may: 1, jun: 0 },
  { make: 'KOMATSU', model: '830E AC', desc: 'Main Alternator', apr: 0, may: 0, jun: 1, remarks: 'Unplanned' },
  { make: 'KOMATSU', model: '830E AC', desc: 'Grid Blower Motor', apr: 0, may: 1, jun: 0, remarks: 'Core not received' },
  
  // KOMATSU 830E DC
  { make: 'KOMATSU', model: '830E DC', desc: 'Wheel Motor', apr: 2, may: 2, jun: 2 },
  { make: 'KOMATSU', model: '830E DC', desc: 'Main Alternator', apr: 1, may: 1, jun: 0 },
  { make: 'KOMATSU', model: '830E DC', desc: 'Grid Blower Motor', apr: 1, may: 0, jun: 1, remarks: 'Send to current for rewinding' },
  
  // BELAZ 75306 / 75302
  { make: 'BELAZ', model: '75306/75302', desc: 'Wheel Motor', apr: 0, may: 1, jun: 0, remarks: 'Core not received' },
  { make: 'BELAZ', model: '75306/75302', desc: 'Main Alternator', apr: 0, may: 0, jun: 0 },
  { make: 'BELAZ', model: '75306/75302', desc: 'Grid Blower Motor', apr: 0, may: 0, jun: 0 },
  
  // HITACHI EH4500
  { make: 'HITACHI', model: 'EH4500', desc: 'Wheel Motor', apr: 1, may: 1, jun: 0 },
  { make: 'HITACHI', model: 'EH4500', desc: 'Main Alternator', apr: 0, may: 1, jun: 0 },
  { make: 'HITACHI', model: 'EH4500', desc: 'Grid Blower Motor', apr: 0, may: 0, jun: 1 },
  { make: 'HITACHI', model: 'EH4500', desc: 'Main Blower Motor', apr: 0, may: 0, jun: 1 },
  { make: 'HITACHI', model: 'EH4500', desc: 'Control Cabinet', apr: 0, may: 0, jun: 1 },
  
  // HITACHI EH5000
  { make: 'HITACHI', model: 'EH5000', desc: 'Wheel Motor', apr: 4, may: 4, jun: 4, remarks: 'Sufficient motor available' },
  { make: 'HITACHI', model: 'EH5000', desc: 'Main Alternator', apr: 2, may: 2, jun: 2, remarks: 'Sufficient alternator available' },
  { make: 'HITACHI', model: 'EH5000', desc: 'Grid Blower Motor', apr: 2, may: 2, jun: 2 },
  { make: 'HITACHI', model: 'EH5000', desc: 'Main Blower Motor', apr: 2, may: 2, jun: 2, remarks: 'Sufficient blower available' },
  { make: 'HITACHI', model: 'EH5000', desc: 'Auxiliary Inverter', apr: 0, may: 1, jun: 1 },
  
  // LETOURNEAU L2350
  { make: 'LETOURNEAU', model: 'L2350', desc: 'Wheel Motor', apr: 1, may: 1, jun: 0, remarks: 'Plan Changed' },
  { make: 'LETOURNEAU', model: 'L2350', desc: 'Main Alternator', apr: 1, may: 0, jun: 0, remarks: 'Plan Changed' },
];

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not defined in environment variables.');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    // 1. Clear all existing production plans and links in jobs
    console.log('Clearing old production plans...');
    await ProductionPlan.deleteMany({});
    await Job.updateMany({}, { productionPlan: null });
    console.log('Database cleared for seeding.');

    const months = [
      { key: 'apr', str: '2026-04' },
      { key: 'may', str: '2026-05' },
      { key: 'jun', str: '2026-06' }
    ];

    for (const item of plansData) {
      for (const m of months) {
        const plannedQty = item[m.key] || 0;
        // Even if plannedQty is 0, we can seed it if needed, but let's stick to plannedQty > 0
        // wait, in the spreadsheet, there are rows with 0 planned quantity, but they exist.
        // Let's seed them so they appear in the matrix as 0 or '-' just like the excel sheet!
        // Yes, this is very important. To show the full matrix with all rows, we should seed all rows for all three months!
        const planItem = new ProductionPlan({
          month: m.str,
          make: item.make,
          model: item.model,
          description: item.desc,
          scopeOfWork: 'Overhauling', // Default scope
          plannedQty: plannedQty,
          prPoStatus: 'Pending',
          remarks: item.remarks || '',
          remarksHistory: item.remarks ? [{ remark: item.remarks, date: new Date() }] : []
        });

        await planItem.save();
        console.log(`Created plan: ${m.str} ${item.make} ${item.model} ${item.desc} (Qty: ${plannedQty})`);

        // Retro-link jobs
        // Match by received month
        const jobs = await Job.find({
          dateReceived: new RegExp(`^${m.str}`),
          productionPlan: null
        });

        const matchedJobIds = [];
        jobs.forEach(job => {
          const makeMatch = (job.equipmentMake && job.equipmentMake.toLowerCase() === item.make.toLowerCase()) ||
                            (job.subAssemblyMake && job.subAssemblyMake.toLowerCase() === item.make.toLowerCase()) ||
                            (job.description && job.description.toLowerCase().includes(item.make.toLowerCase()));
                            
          // Smart model match to support BELAZ and EH5000 variations
          const modelMatch = job.equipmentModel && (
            job.equipmentModel.toLowerCase() === item.model.toLowerCase() ||
            (job.equipmentModel.toLowerCase() === 'belaz' && item.model.toLowerCase() === '75306/75302') ||
            (job.equipmentModel.toLowerCase() === 'eh5000' && item.model.toLowerCase().includes('eh5000'))
          );
          
          const descMatch = (job.componentType && job.componentType.toLowerCase() === item.desc.toLowerCase()) ||
                            (job.description && job.description.toLowerCase().includes(item.desc.toLowerCase()));
                            
          if (makeMatch && modelMatch && descMatch) {
            matchedJobIds.push(job._id);
          }
        });

        if (matchedJobIds.length > 0) {
          await Job.updateMany({ _id: { $in: matchedJobIds } }, { productionPlan: planItem._id });
          console.log(`  Linked ${matchedJobIds.length} jobs to this plan.`);
        }
      }
    }

    // Now recalculate completedQty for all plans based on actual completed jobs
    console.log('Calculating completions...');
    const allPlans = await ProductionPlan.find({});
    for (const plan of allPlans) {
      const linkedJobs = await Job.find({ productionPlan: plan._id });
      // Count completed/dispatched jobs
      const completedCount = linkedJobs.filter(j => j.stage === 'Completed' || j.status === 'Completed' || j.stage === 'Testing & Dispatch').length;
      plan.completedQty = completedCount;
      await plan.save();
      if (completedCount > 0) {
        console.log(`Updated completion: ${plan.month} ${plan.make} ${plan.description} -> ${completedCount} completed`);
      }
    }

    console.log('Finished Q1 month-wise data import and linking.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
