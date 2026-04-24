const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // We use process.env.MONGO_URI which is loaded in server.js
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1); // Stop server if DB fails
  }
};

module.exports = connectDB;