import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connectDB from '../utils/db.js';
import User from '../schema/User.js';

const seed = async () => {
  await connectDB();
  console.log('Database connected');

  try {
    const existingAdmin = await User.findOne({ email: 'admin@ninesecrets.com' });
    if (!existingAdmin) {
      // No hardcoded default — a fixed password would be a known credential in
      // every environment this script ever ran in, including production.
      const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
      console.log(`Seeding superadmin with password: ${password}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        name: 'Super Admin',
        email: 'admin@ninesecrets.com',
        password: hashedPassword,
        role: 'superadmin',
      });
      console.log('Superadmin created: admin@ninesecrets.com');
      if (!process.env.SEED_ADMIN_PASSWORD) {
        console.log(`Generated password (save this now, it will not be shown again): ${password}`);
      }
    } else {
      console.log('Superadmin already exists');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    process.exit();
  }
};

seed();
