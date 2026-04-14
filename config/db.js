import mongoose from 'mongoose';

/**
 * Database Connection Function
 * Establishes connection to MongoDB and handles connection errors gracefully.
 */
export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✓ MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1); // Exit process if DB connection fails
  }
};

/**
 * Database Disconnection Function
 * Safely closes the MongoDB connection.
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✓ MongoDB disconnected successfully');
  } catch (error) {
    console.error('✗ MongoDB disconnection failed:', error.message);
  }
};
