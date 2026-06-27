const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Photo = require('./models/Photo');
  const photos = await Photo.find({});
  console.log('Total Photos in DB:', photos.length);
  if (photos.length > 0) {
    console.log('Sample Photo:', photos[0]);
  }
  mongoose.disconnect();
}).catch(console.error);
