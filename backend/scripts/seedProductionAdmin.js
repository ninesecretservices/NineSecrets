// Creates the initial superadmin account directly in a target database,
// bypassing the app's own MONGODB_URI (see scripts/seed.js for the normal
// version of this, which only ever runs against whatever .env is loaded).
//
// Needed because production's real database was found empty of any user
// accounts at all — nothing ever seeded a superadmin there.
//
// Usage (run from backend/):
//   node scripts/seedProductionAdmin.js "<mongodb-uri>"
//
// Pass the real connection string directly as an argument — nothing is read
// from or written to .env, so no credentials end up on disk from running this.

import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

const [, , uri] = process.argv;
if (!uri) {
  console.error('Usage: node scripts/seedProductionAdmin.js "<mongodb-uri>"');
  process.exit(1);
}

const ADMIN_PASSWORD = 'Admin@123'; // fixed by request, matches local/UAT — change after first login if you want something unique to production

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log(`Connected to database: ${db.databaseName}`);

  const existing = await db.collection('users').findOne({ email: 'admin@ninesecrets.com' });
  if (existing) {
    console.log('A user with email admin@ninesecrets.com already exists — not overwriting. Role:', existing.role);
    await client.close();
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const now = new Date();
  await db.collection('users').insertOne({
    name: 'Super Admin',
    email: 'admin@ninesecrets.com',
    password: hashedPassword,
    role: 'superadmin',
    isActive: true,
    wishlist: [],
    tags: [],
    addresses: [],
    createdAt: now,
    updatedAt: now,
  });

  console.log('Superadmin created.');
  console.log('Email:    admin@ninesecrets.com');
  console.log('Password:', ADMIN_PASSWORD);
  await client.close();
}

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
