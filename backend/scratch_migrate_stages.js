const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // 1. Migrate JobData (move dispatch fields from stage4 to stage6)
    // JobData models generally don't have CastErrors because most fields are Strings or Mixed
    const jobDatas = await mongoose.connection.collection('jobdatas').find({ 'stage4': { $exists: true } }).toArray();
    let dataModified = 0;
    
    for (const data of jobDatas) {
      if (data.stage4 && (data.stage4.dispatchChecklist || data.stage4.qaApprovedBy || data.stage4.qaApprovedDate)) {
        if (!data.stage6) data.stage6 = {};
        
        if (data.stage4.dispatchChecklist) data.stage6.dispatchChecklist = data.stage4.dispatchChecklist;
        if (data.stage4.qaApprovedBy) data.stage6.qaApprovedBy = data.stage4.qaApprovedBy;
        if (data.stage4.qaApprovedDate) data.stage6.qaApprovedDate = data.stage4.qaApprovedDate;
        
        // delete from stage4
        delete data.stage4.dispatchChecklist;
        delete data.stage4.qaApprovedBy;
        delete data.stage4.qaApprovedDate;
        
        await mongoose.connection.collection('jobdatas').updateOne(
          { _id: data._id },
          { 
            $set: { stage6: data.stage6, stage4: data.stage4 } 
          }
        );
        dataModified++;
      }
    }
    console.log(`Migrated ${dataModified} JobData records.`);

    // 2. Migrate Job stage strings
    const jobs = await mongoose.connection.collection('jobs').find({ stage: 'Testing & Dispatch' }).toArray();
    let jobsModified = 0;
    
    for (const job of jobs) {
      const data = await mongoose.connection.collection('jobdatas').findOne({ job: job._id });
      
      const componentTypeStr = job.componentType ? String(job.componentType).toLowerCase() : '';
      const equipmentModelStr = job.equipmentModel ? String(job.equipmentModel).toLowerCase() : '';
      const isWheelMotor = componentTypeStr.includes('wheel motor') || equipmentModelStr.includes('wm');
      let newStage = 'Testing'; // Default
      
      if (data && data.stage4 && data.stage4.status === 'Completed') {
        if (isWheelMotor) {
          if (data.stage5 && data.stage5.status === 'Completed') {
            newStage = 'Dispatch';
          } else {
            newStage = 'Final Drive Installation';
          }
        } else {
          newStage = 'Dispatch';
        }
      }
      
      await mongoose.connection.collection('jobs').updateOne(
        { _id: job._id },
        { $set: { stage: newStage } }
      );
      jobsModified++;
    }
    console.log(`Migrated ${jobsModified} Job records.`);

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
