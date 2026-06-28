require('dotenv').config();
const mongoose = require('mongoose');
const CT = require('./models/ComponentTemplate');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  console.log('--- TEMPLATES (WHEEL MOTOR) ---');
  const templates = await CT.find({ componentType: /wheel motor/i });
  console.log(JSON.stringify(templates, null, 2));
  
  console.log('\n--- USERS ---');
  const users = await User.find({}, { name: 1, role: 1, _id: 0 });
  console.log(JSON.stringify(users, null, 2));
  
  console.log('\n--- ALL TEMPLATES SUMMARY ---');
  const allTemplates = await CT.find({}, { 
    componentKey: 1, 
    componentType: 1, 
    make: 1, 
    equipmentModels: 1,
    _id: 0 
  });
  console.log(JSON.stringify(allTemplates, null, 2));
  
  await mongoose.disconnect();
}

run().catch(console.error);
