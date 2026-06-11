const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const ProductionPlan = require('../models/ProductionPlan');
const Job = require('../models/Job');

const plansData = [
  // KOMATSU 830E AC
  { make: 'KOMATSU', model: '830E AC', desc: 'Wheel Motor', apr: 1, may: 1, jun: 1 },
  { make: 'KOMATSU', model: '830E AC', desc: 'Main Alternator', apr: 0, may: 0, jun: 1, remarks: 'Unplane may' },
  { make: 'KOMATSU', model: '830E AC', desc: 'Grid Blower Motor', apr: 0, may: 1, jun: 1, remarks: 'Core not recieved may' },
  
  // KOMATSU 830E DC
  { make: 'KOMATSU', model: '830E DC', desc: 'Wheel Motor', apr: 2, may: 2, jun: 2 },
  { make: 'KOMATSU', model: '830E DC', desc: 'Main Alternator', apr: 1, may: 1, jun: 0 },
  { make: 'KOMATSU', model: '830E DC', desc: 'Grid Blower Motor', apr: 1, may: 0, jun: 1, remarks: 'April - send to current for rewinding' },
  
  // BELAZ 75306 / 75302
  { make: 'BELAZ', model: '75306/75302', desc: 'Wheel Motor', apr: 0, may: 1, jun: 1, remarks: 'Core not recieved' },
  { make: 'BELAZ', model: '75306/75302', desc: 'Main Alternator', apr: 0, may: 0, jun: 1 },
  { make: 'BELAZ', model: '75306/75302', desc: 'Grid Blower Motor', apr: 0, may: 0, jun: 1 },
  
  // HITACHI EH4500
  { make: 'HITACHI', model: 'EH4500', desc: 'Wheel Motor', apr: 1, may: 1, jun: 1 },
  { make: 'HITACHI', model: 'EH4500', desc: 'Main Alternator', apr: 0, may: 1, jun: 1 },
  { make: 'HITACHI', model: 'EH4500', desc: 'Grid Blower Motor', apr: 0, may: 0, jun: 1 },
  { make: 'HITACHI', model: 'EH4500', desc: 'Main Blower Motor', apr: 0, may: 0, jun: 1 },
  { make: 'HITACHI', model: 'EH4500', desc: 'Control Cabinet', apr: 0, may: 0, jun: 1 },
  
  // HITACHI EH5000
  { make: 'HITACHI', model: 'EH5000', desc: 'Wheel Motor', apr: 4, may: 4, jun: 4, remarks: 'April- Sufficient motor avaialble' },
  { make: 'HITACHI', model: 'EH5000', desc: 'Main Alternator', apr: 2, may: 2, jun: 2, remarks: 'May- Sufficient motor avaialble' },
  { make: 'HITACHI', model: 'EH5000', desc: 'Grid Blower Motor', apr: 2, may: 2, jun: 2 },
  { make: 'HITACHI', model: 'EH5000', desc: 'Main Blower Motor', apr: 2, may: 2, jun: 2, remarks: 'April- Sufficient motor avaialble' },
  { make: 'HITACHI', model: 'EH5000', desc: 'Auxiliary Inverter', apr: 0, may: 1, jun: 1 },
  
  // LETOURNEAU L2350
  { make: 'LETOURNEAU', model: 'L2350', desc: 'Wheel Motor', apr: 1, may: 1, jun: 0, remarks: 'Plan Changed l2350 2nd machine' },
  { make: 'LETOURNEAU', model: 'L2350', desc: 'Main Alternator', apr: 1, may: 0, jun: 0, remarks: 'Plan Changed l2350 2nd machine' },
];

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://user:pass@cluster.mongodb.net/thriveni'; // Will use the one from .env
    // Ensure we are connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to DB');
    }

    const months = [
      { key: 'apr', str: '2026-04' },
      { key: 'may', str: '2026-05' },
      { key: 'jun', str: '2026-06' }
    ];

    for (const item of plansData) {
      for (const m of months) {
        const plannedQty = item[m.key] || 0;
        if (plannedQty > 0) {
          // Check if already exists to avoid duplicates
          let planItem = await ProductionPlan.findOne({
            month: m.str,
            make: item.make,
            model: item.model,
            description: item.desc
          });

          if (!planItem) {
            planItem = new ProductionPlan({
              month: m.str,
              make: item.make,
              model: item.model,
              description: item.desc,
              scopeOfWork: 'Servicing', // Default
              plannedQty: plannedQty,
              prPoStatus: 'Pending',
              remarks: item.remarks || ''
            });
            await planItem.save();
            console.log(`Created plan: ${m.str} ${item.make} ${item.desc} (Qty: ${plannedQty})`);
          } else {
            planItem.plannedQty = plannedQty;
            planItem.remarks = item.remarks || planItem.remarks;
            await planItem.save();
            console.log(`Updated plan: ${m.str} ${item.make} ${item.desc} (Qty: ${plannedQty})`);
          }

          // Retro-link jobs
          const jobs = await Job.find({
            dateReceived: new RegExp(`^${m.str}`),
            productionPlan: null
          });

          const matchedJobIds = [];
          jobs.forEach(job => {
            const makeMatch = (job.equipmentMake && job.equipmentMake.toLowerCase() === item.make.toLowerCase()) ||
                              (job.subAssemblyMake && job.subAssemblyMake.toLowerCase() === item.make.toLowerCase()) ||
                              (job.description && job.description.toLowerCase().includes(item.make.toLowerCase()));
                              
            const modelMatch = job.equipmentModel && job.equipmentModel.toLowerCase() === item.model.toLowerCase();
            
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
    }

    console.log('Finished Q1 data import.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
