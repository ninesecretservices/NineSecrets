// Copies the product catalog (departments, items, designs, fabrics, colours,
// sizes, fits, products) from one MongoDB database to another, preserving
// _ids so product-to-master-data references stay intact.
//
// Deliberately NOT included: users, orders, carts, coupons, settings,
// audit logs, reviews — those are environment-specific and must never
// cross from UAT into production (or vice versa).
//
// Non-destructive: every write is an upsert by _id. Nothing already in the
// destination is ever deleted, and documents are only overwritten if they
// share the exact same _id as the source (i.e. were already migrated before).
//
// Usage (run from backend/):
//   node scripts/migrateCatalog.js "<source-mongodb-uri>" "<dest-mongodb-uri>"
//
// Pass real connection strings directly as arguments — nothing is read from
// or written to .env, so no credentials end up on disk from running this.

import { MongoClient } from 'mongodb';

const COLLECTIONS = ['departments', 'items', 'designs', 'fabrics', 'colours', 'sizes', 'fits', 'products'];

const [, , sourceUri, destUri] = process.argv;

if (!sourceUri || !destUri) {
  console.error('Usage: node scripts/migrateCatalog.js "<source-mongodb-uri>" "<dest-mongodb-uri>"');
  process.exit(1);
}

async function migrate() {
  const sourceClient = new MongoClient(sourceUri);
  const destClient = new MongoClient(destUri);

  await sourceClient.connect();
  await destClient.connect();
  const sourceDb = sourceClient.db();
  const destDb = destClient.db();

  console.log(`Source: ${sourceDb.databaseName}  →  Destination: ${destDb.databaseName}`);
  if (sourceDb.databaseName === destDb.databaseName && sourceUri === destUri) {
    throw new Error('Source and destination URIs are identical — refusing to run.');
  }

  for (const name of COLLECTIONS) {
    const docs = await sourceDb.collection(name).find({}).toArray();
    if (docs.length === 0) {
      console.log(`${name}: 0 documents — skipped`);
      continue;
    }
    let upserted = 0;
    for (const doc of docs) {
      const { _id, ...rest } = doc;
      const result = await destDb.collection(name).updateOne({ _id }, { $set: rest }, { upsert: true });
      if (result.upsertedCount || result.modifiedCount) upserted += 1;
    }
    console.log(`${name}: ${docs.length} document(s) in source, ${upserted} inserted/updated in destination`);
  }

  await sourceClient.close();
  await destClient.close();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
