const mongoose = require("mongoose");

// Create a cached variable to store the connection
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb) {
    console.log("Using existing database connection");
    return cachedDb;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    cachedDb = conn.connection;

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    return cachedDb;
  } catch (error) {
    console.error(error.message);
    throw error; // Better than process.exit() in serverless
  }
};

module.exports = connectDB;
