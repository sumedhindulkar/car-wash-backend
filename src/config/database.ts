import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log('Connected to MongoDB');
  } catch (error: unknown) {
    console.error('MongoDB connection failed', error);
    throw error;
  }
}
