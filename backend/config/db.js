import mongoose from 'mongoose';

// Create a cached variable to store the connection
let cachedDb = null;

const connectDB = async () => {
  // If a connection already exists, reuse it!
  if (cachedDb) {
    console.log("Using existing database connection");
    return Promise.resolve(cachedDb);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    // Save the connection to the cache
    cachedDb = conn.connection; 
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return cachedDb;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
