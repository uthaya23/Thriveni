require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const CT = require('../models/ComponentTemplate');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const templates = await CT.find({}, { componentKey: 1, make: 1, equipmentModels: 1, 'stage1.partsChecklist': 1, 'stage2.dismantlingChecklist': 1 });
  console.log(JSON.stringify(templates, null, 2));
  await mongoose.disconnect();
}).catch(console.error);
