import mongoose from 'mongoose';

export async function connectDB() {
  try {
    await mongoose.connect('mongodb://mongo:27017/queue');
    console.log('MongoDB connected successful');
  } catch (error) {
    console.error('Error connected to MongoDB:', error);
  }
}
