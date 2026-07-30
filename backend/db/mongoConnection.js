import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

// Fix Windows Node.js SRV DNS lookup for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore DNS override errors
}

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) return true;
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI environment variable is not defined in .env.');
    return false;
  }

  try {
    console.log('🍃 Connecting to MongoDB Atlas database...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas successfully!');
    return true;
  } catch (err) {
    console.warn('⚠️ MongoDB Atlas connection notice:', err.message);
    console.log('ℹ️ Operating with SQL fallback mode.');
    return false;
  }
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
