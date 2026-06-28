require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const { MachineModel, ComponentType } = require('../models/AdminLookups');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  const machines = await MachineModel.find();
  console.log('Machine Models:');
  console.log(JSON.stringify(machines, null, 2));

  const components = await ComponentType.find();
  console.log('\nComponent Types:');
  console.log(JSON.stringify(components, null, 2));

  await mongoose.disconnect();
}

check().catch(console.error);
