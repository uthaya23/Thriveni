require('dotenv').config();
const mongoose = require('mongoose');
const ComponentTemplate = require('./models/ComponentTemplate');

async function testVersioning() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // IMPORTANT: Drop the old unique index on componentKey if it exists!
    // Changing unique: true in Mongoose schema doesn't drop the existing DB index.
    try {
      await mongoose.connection.collection('componenttemplates').dropIndex('componentKey_1');
      console.log('✅ Dropped legacy componentKey_1 unique index');
    } catch (e) {
      if (e.codeName !== 'IndexNotFound') {
        console.log('Note on index drop:', e.message);
      }
    }

    // Ensure the new compound index is built
    await ComponentTemplate.syncIndexes();
    console.log('✅ Synced new compound indexes');

    const key = 'EH5000_WHEEL_MOTOR';
    
    // Check initial state
    let active = await ComponentTemplate.findOne({ componentKey: key, status: 'Active' });
    if (!active) {
       console.log('⚠️ No active template found. Make sure seeder was run.');
       return;
    }
    
    console.log(`Found Active Template. Revision: ${active.revision}, Name: ${active.displayName}`);

    // SIMULATE PUBLISH
    const updateData = active.toObject();
    updateData.displayName = 'EH5000 Wheel Motor (Updated Limits)';
    
    let newRevision = 1;
    active.status = 'Superseded';
    await active.save();
    console.log(`✅ Marked revision ${active.revision} as Superseded`);
    newRevision = active.revision + 1;
    
    const newTemplateData = {
      ...updateData,
      revision: newRevision,
      status: 'Active',
      publishedAt: new Date(),
      changeSummary: 'Testing version bump'
    };
    
    delete newTemplateData._id;
    delete newTemplateData.createdAt;
    delete newTemplateData.updatedAt;
    delete newTemplateData.__v;
    
    const newTemplate = await ComponentTemplate.create(newTemplateData);
    console.log(`✅ Published new Active Template. Revision: ${newTemplate.revision}, Name: ${newTemplate.displayName}`);

    // FINAL VERIFICATION
    const all = await ComponentTemplate.find({ componentKey: key }).select('revision status displayName changeSummary').sort({ revision: 1 });
    console.log('\n--- Final Database State ---');
    console.log(JSON.stringify(all, null, 2));

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected');
  }
}

testVersioning();
