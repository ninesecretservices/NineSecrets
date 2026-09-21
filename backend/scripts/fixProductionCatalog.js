// One-off catalog clean-up for the pre-Razorpay-review pass: sensible names,
// real colours, sizes S–XL, unique SKUs, realistic prices, no placeholder
// descriptions, trimmed category names, a few flagged bestsellers, and small
// settings fixes. Prices/MRPs and stock for the added sizes are placeholder
// values chosen for a demo catalog — the owner should adjust them in Admin.
//
// Safe by construction: keyed by product _id (never by name), dry-run unless
// --apply is passed, deletes nothing (the duplicate-photo product is set to
// draft, not removed), and re-running just rewrites the same values.
//
// Usage (run from backend/):
//   node scripts/fixProductionCatalog.js "<mongodb-uri>"          # dry run
//   node scripts/fixProductionCatalog.js "<mongodb-uri>" --apply  # write

import { MongoClient, ObjectId } from 'mongodb';

const [, , uri, flag] = process.argv;
const APPLY = flag === '--apply';
if (!uri) {
  console.error('Usage: node scripts/fixProductionCatalog.js "<mongodb-uri>" [--apply]');
  process.exit(1);
}

const SIZES = ['S', 'M', 'L', 'XL'];
const NEW_SIZE_STOCK = 25;

const COLOURS = {
  'Black': '#000000',
  'Navy Blue': '#1F2A5A',
  'Pink': '#EE6C8A',
  'Peach': '#F5C2A5',
  'Lime Green': '#A8C13A',
  'Dark Pink': '#B5588F',
  'Steel Blue': '#4F7F9C',
  'Blue': '#4A78C2',
  'Pista Green': '#B6E0A8',
  'Maroon': '#6B1F2E',
  'Teal': '#17677A',
  'Dark Green': '#4E6B2F',
};

// id, the name it has today (safety check), and the intended end state.
const PRODUCTS = [
  { id: '6a5b948d1579870ee664656b', was: 'Black T-shirt', name: 'Black T-shirt Set', colour: 'Black', code: 'BLACK', price: 499, mrp: 699, featured: true },
  { id: '6a5b94ec1579870ee664656e', was: 'Dark Black T-shirt', name: 'Navy Blue T-shirt Set', colour: 'Navy Blue', code: 'NAVY', price: 499, mrp: 699,
    description: 'A navy blue T-shirt set with a classic crew neckline and short sleeves, finished with a palm-tree graphic on the chest. It is paired with mint green trousers in an abstract wave pattern — an easy two-piece for lounging and sleeping.' },
  { id: '6a5b953a1579870ee6646572', was: 'Pink T-shirt', name: 'Pink T-shirt Set', colour: 'Pink', code: 'PINK', price: 549, mrp: 749, featured: true },
  { id: '6a5b959a1579870ee6646577', was: 'Semi Pink T-shirt', name: 'Peach T-shirt Set', colour: 'Peach', code: 'PEACH', price: 499, mrp: 699,
    replace: [[/Semi Pink T-shirt set/g, 'peach T-shirt set'], [/matching pink shades/g, 'matching peach shades']] },
  { id: '6a5b95c81579870ee664657d', was: 'Khakhi Color T-Shirt', name: 'Lime Green T-shirt Set', colour: 'Lime Green', code: 'LIME', price: 499, mrp: 699,
    replace: [[/khakhi/gi, 'lime green']] },
  { id: '6a5b96631579870ee664659b', was: 'Dark Pink', name: 'Dark Pink Pyjama Set', colour: 'Dark Pink', code: 'DKPINK', price: 449, mrp: 649, featured: true,
    replace: [[/EvryDay/g, 'Everyday']] },
  { id: '6a5b96f11579870ee66465bd', was: 'Dark Grey', name: 'Steel Blue Pyjama Set', colour: 'Steel Blue', code: 'STEEL', price: 449, mrp: 649,
    description: 'A steel blue T-shirt with a crew neckline, short sleeves and a bold text print on the chest, paired with blue and white abstract-print pyjama bottoms. A comfortable two-piece for everyday loungewear and sleep.' },
  { id: '6a5b971f1579870ee66465c6', was: 'Light Grey', name: 'Blue Pyjama Set', colour: 'Blue', code: 'BLUE', price: 449, mrp: 649,
    replace: [[/EvryDay/g, 'Everyday'], [/light blue/g, 'blue']] },
  { id: '6a5b97581579870ee66465d0', was: 'Pista COlor T-shirt', name: 'Pista Green T-shirt Set', colour: 'Pista Green', code: 'PISTA', price: 479, mrp: 679 },
  // Same photograph as the Pista Green set above — hidden (draft) rather than
  // deleted, so it can be restored once it has its own photo.
  { id: '6a5b97a21579870ee66465db', was: 'Light Pista color', name: 'Light Pista Green Pyjama Set', colour: 'Pista Green', code: 'LTPISTA', price: 479, mrp: 679, status: 'draft',
    description: 'A light pista green T-shirt set with a floral graphic on the chest, paired with pyjama bottoms in a light green and white leaf pattern.' },
  { id: '6a5b981b1579870ee66465e7', was: 'New Hello Black', name: 'New Hello Black T-shirt Set', colour: 'Black', code: 'HELLO', price: 599, mrp: 799, featured: true },
  { id: '6a5b984c1579870ee66465f4', was: 'Brown T-shirt', name: 'Maroon Amazing T-shirt Set', colour: 'Maroon', code: 'MAROONAM', price: 549, mrp: 749,
    replace: [[/This brown women's/g, "This maroon women's"], [/brown tones/g, 'maroon tones']] },
  { id: '6a5b98761579870ee6646602', was: 'Denim t-shirt', name: 'Teal T-shirt Set', colour: 'Teal', code: 'TEAL', price: 549, mrp: 749,
    replace: [[/women's denim t-shirt/g, "women's T-shirt"]] },
  { id: '6a5b98a31579870ee6646611', was: 'Brown Tshirt', name: 'Maroon Leaf Print T-shirt Set', colour: 'Maroon', code: 'MAROONLF', price: 529, mrp: 729,
    replace: [[/This brown women's/g, "This maroon women's"]] },
  { id: '6a5b99141579870ee6646621', was: 'dark Green T-shirt', name: 'Dark Green T-shirt Set', colour: 'Dark Green', code: 'DKGREEN', price: 599, mrp: 799 },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const colourCode = (name) => name.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase();

const log = (...a) => console.log(...a);

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  log(`Database: ${db.databaseName}   Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);
  const now = new Date();

  // ---- Colours & sizes (create missing, never touch existing) ----
  const colourId = {};
  for (const [name, hex] of Object.entries(COLOURS)) {
    let doc = await db.collection('colours').findOne({ name, isDeleted: { $ne: true } });
    if (!doc) {
      doc = { _id: new ObjectId(), name, hexCode: hex, status: 'active', isDeleted: false, createdAt: now, updatedAt: now };
      log(`+ colour "${name}" ${hex}`);
      if (APPLY) await db.collection('colours').insertOne(doc);
    }
    colourId[name] = doc._id;
  }
  const sizeId = {};
  for (const name of SIZES) {
    let doc = await db.collection('sizes').findOne({ name, isDeleted: { $ne: true } });
    if (!doc) {
      doc = { _id: new ObjectId(), name, status: 'active', isDeleted: false, createdAt: now, updatedAt: now };
      log(`+ size "${name}"`);
      if (APPLY) await db.collection('sizes').insertOne(doc);
    }
    sizeId[name] = doc._id;
  }

  // ---- Products ----
  const seenSkus = new Map();
  let changed = 0;
  for (const spec of PRODUCTS) {
    const _id = new ObjectId(spec.id);
    const p = await db.collection('products').findOne({ _id });
    if (!p) { log(`! ${spec.id} not found — skipped`); continue; }
    if (p.name !== spec.was && p.name !== spec.name) {
      log(`! ${spec.id} is now "${p.name}" (expected "${spec.was}") — skipped, not touching a product that changed`);
      continue;
    }

    const fitId = p.variants?.[0]?.fit;
    const byWhole = new Map((p.variants || []).map((v) => [String(v.size), v]));
    const variants = SIZES.map((size) => {
      const existing = byWhole.get(String(sizeId[size]));
      return {
        ...(existing || { _id: new ObjectId(), barcode: '' }),
        colour: colourId[spec.colour],
        size: sizeId[size],
        fit: existing?.fit || fitId,
        sku: `NS-${spec.code}-${colourCode(spec.colour)}-${size}`,
        stock: existing ? existing.stock : NEW_SIZE_STOCK,
        mrp: spec.mrp,
        sellingPrice: spec.price,
      };
    });
    // A product that only had a size outside S/M/L/XL would lose it here.
    for (const v of p.variants || []) {
      if (!Object.values(sizeId).some((id) => String(id) === String(v.size))) {
        log(`! ${spec.name}: has a variant with an unexpected size — skipped`);
        variants.length = 0;
        break;
      }
    }
    if (variants.length === 0) continue;

    for (const v of variants) {
      if (seenSkus.has(v.sku)) throw new Error(`SKU collision inside this script: ${v.sku} (${spec.name} vs ${seenSkus.get(v.sku)})`);
      seenSkus.set(v.sku, spec.name);
    }

    let description = spec.description ?? p.description ?? '';
    for (const [re, to] of spec.replace || []) description = description.replace(re, to);
    if (!spec.description && !p.description?.trim()) throw new Error(`${spec.name} has no description and none was supplied`);

    const nameChanged = p.name !== spec.name;
    const slug = p.slug?.startsWith(slugify(spec.name) + '-') ? p.slug : `${slugify(spec.name)}-${spec.id.slice(-6)}`;
    const update = {
      name: spec.name,
      slug,
      description,
      variants,
      status: spec.status || p.status,
      isFeatured: !!spec.featured,
      updatedAt: now,
    };
    changed += 1;
    log(`~ ${nameChanged ? `"${p.name}" -> ` : ''}"${spec.name}"  ${spec.colour}  Rs.${spec.price} (MRP ${spec.mrp})  ${variants.map((v) => v.sku.split('-').pop()).join('/')}${spec.status ? `  [${spec.status}]` : ''}${spec.featured ? '  [bestseller]' : ''}`);
    if (APPLY) await db.collection('products').updateOne({ _id }, { $set: update });
  }

  // ---- Category names: trim stray whitespace ----
  const items = await db.collection('items').find({}).toArray();
  for (const it of items) {
    const clean = it.name.trim().replace(/\s+/g, ' ');
    if (clean !== it.name) {
      log(`~ category "${it.name}" -> "${clean}"`);
      if (APPLY) await db.collection('items').updateOne({ _id: it._id }, { $set: { name: clean, updatedAt: now } });
    }
  }

  // ---- Settings ----
  const patchHomepage = (c) => {
    if (!c) return c;
    const out = JSON.parse(JSON.stringify(c));
    if (Array.isArray(out.usp)) out.usp = out.usp.map((u) => (/Sizes S\s*[–-]\s*3XL/.test(u.label) ? { ...u, label: 'Sizes S – XL' } : u));
    if (Array.isArray(out.categories)) out.categories = out.categories.map((c2) => (c2.link ? { ...c2, link: c2.link.replace(/(&cat=[^&]*?)(%20)+$/, '$1').replace(/EvryDay/g, 'EveryDay') } : c2));
    return out;
  };
  const patchCommerce = (c) => {
    if (!c) return c;
    const out = { ...c };
    if (out.contactEmail) out.contactEmail = out.contactEmail.trim().toLowerCase();
    if (out.contactAddress) out.contactAddress = out.contactAddress.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
    return out;
  };
  for (const [key, patch] of [['homepage', patchHomepage], ['commerce', patchCommerce]]) {
    const doc = await db.collection('settings').findOne({ key });
    if (!doc) continue;
    const value = patch(doc.value);
    const draft = doc.draft ? patch(doc.draft) : doc.draft;
    if (JSON.stringify(value) !== JSON.stringify(doc.value) || JSON.stringify(draft) !== JSON.stringify(doc.draft)) {
      log(`~ settings "${key}" updated`);
      if (APPLY) await db.collection('settings').updateOne({ key }, { $set: { value, draft, updatedAt: now } });
    }
  }

  log(`\n${changed} product(s) ${APPLY ? 'updated' : 'would be updated'}.`);
  await client.close();
}

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
