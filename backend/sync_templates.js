require('dotenv').config();
const mongoose = require('mongoose');
const ComponentTemplate = require('./models/ComponentTemplate');

async function syncTemplates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const templates = await ComponentTemplate.find({});
    let updated = 0;
    
    for (const tmpl of templates) {
      if (tmpl.stage1 && tmpl.stage1.electricalTests && tmpl.stage4) {
        // Deep clone stage 1 electrical tests to stage 4
        tmpl.stage4.electricalTests = JSON.parse(JSON.stringify(tmpl.stage1.electricalTests));
        
        // Ensure no " (Post Repair)" suffix exists in stage 1, just in case
        tmpl.stage4.electricalTests.forEach(test => {
          if (test.name) {
            test.name = test.name.replace(' (Post Repair)', '');
          }
        });

        await tmpl.save();
        updated++;
      }
    }
    
    console.log(`Successfully synchronized electrical tests for ${updated} templates.`);
    process.exit(0);
  } catch (err) {
    console.error('Error syncing templates:', err);
    process.exit(1);
  }
}

syncTemplates();
