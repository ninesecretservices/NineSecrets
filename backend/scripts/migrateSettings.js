// Copies the Setting collection (homepage content, store config — anything
// managed from Admin -> Homepage / Store Settings) from one database to
// another. Kept separate from scripts/migrateCatalog.js, which deliberately
// excludes settings since site-wide content is usually something you want to
// review before it goes live rather than copy blindly — this script exists
// for the explicit case where you DO want that content carried over as-is.
//
// Non-destructive: every write is an upsert by _id. Nothing already in the
// destination is deleted, and a document is only overwritten if it shares the
// exact same _id as the source.
//
// Usage (run from backend/):
//   node scripts/migrateSettings.js "<source-mongodb-uri>" "<dest-mongodb-uri>"

import { MongoClient } from 'mongodb';

const [, , sourceUri, destUri] = process.argv;

if (!sourceUri || !destUri) {
  console.error('Usage: node scripts/migrateSettings.js "<source-mongodb-uri>" "<dest-mongodb-uri>"');
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

  const docs = await sourceDb.collection('settings').find({}).toArray();
  if (docs.length === 0) {
    console.log('settings: 0 documents in source — nothing to copy.');
  } else {
    let upserted = 0;
    for (const doc of docs) {
      // Upsert by `key`, not `_id` — `key` is the actual unique identifier
      // the app looks documents up by, and the destination may already have
      // its own document for the same key with a different _id (e.g.
      // auto-created with defaults the first time someone opened the admin
      // panel there).
      const { _id, key, ...rest } = doc;
      // updatedBy references a User _id that only exists in the source
      // environment — dropping it rather than carrying over a dangling
      // reference. updatedByName (a display-string snapshot) stays intact.
      delete rest.updatedBy;
      const result = await destDb.collection('settings').updateOne({ key }, { $set: rest }, { upsert: true });
      if (result.upsertedCount || result.modifiedCount) upserted += 1;
      console.log(`  - key "${key}" copied`);
    }
    console.log(`settings: ${docs.length} document(s) in source, ${upserted} inserted/updated in destination`);
  }

  await sourceClient.close();
  await destClient.close();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
