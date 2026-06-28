require('dotenv').config();
const mongoose = require('mongoose');
const CT = require('./models/ComponentTemplate');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const t = await CT.findOne({ componentKey: 'EH5000_WHEEL_MOTOR' });
  console.log(JSON.stringify(t, null, 2));
  await mongoose.disconnect();
});
