import Product from '../schema/Product.js';
import Department from '../schema/Department.js';
import Item from '../schema/Item.js';
import Design from '../schema/Design.js';
import Fabric from '../schema/Fabric.js';
import Colour from '../schema/Colour.js';
import Size from '../schema/Size.js';
import Fit from '../schema/Fit.js';
import ApiError from '../utils/ApiError.js';
import slugify from 'slugify';
import { logAudit } from '../utils/auditLog.js';

// Cart lines, stock imports and invoices all identify an option by SKU, so two
// products sharing one makes them indistinguishable. Rejects duplicates inside
// the submitted variants and clashes with any other live product.
async function assertUniqueSkus(variants, ownProductId) {
  if (!Array.isArray(variants)) return;
  const skus = variants.map((v) => String(v.sku || '').trim()).filter(Boolean);
  const seen = new Set();
  for (const sku of skus) {
    if (seen.has(sku)) throw new ApiError(400, `SKU "${sku}" is used more than once on this product — every option needs its own SKU`);
    seen.add(sku);
  }
  if (skus.length === 0) return;
  const clash = await Product.findOne(
    { isDeleted: false, 'variants.sku': { $in: skus }, ...(ownProductId && { _id: { $ne: ownProductId } }) },
    'name variants.sku'
  ).lean();
  if (clash) {
    const dup = clash.variants.find((v) => skus.includes(v.sku))?.sku;
    throw new ApiError(400, `SKU "${dup}" is already used by "${clash.name}" — SKUs must be unique across products`);
  }
}

class ProductController {
  async productList(req, res, next) {
    const { page = 1, limit = 10, search = '', department, item, fit, sizes, colours, minPrice, maxPrice, sort = 'newest', ids, featured } = req.body;
    const query = { isDeleted: false };
    if (Array.isArray(ids) && ids.length > 0) query._id = { $in: ids };
    if (featured) query.isFeatured = true;
    // A secondary _id tiebreaker is required: ties on the primary key (e.g. two
    // products at the same price) otherwise have no guaranteed stable order
    // across separate skip/limit calls, which duplicates or skips items when
    // paginating (Load More).
    const sortMap = {
      newest: { createdAt: -1, _id: -1 },
      'price-asc': { 'variants.sellingPrice': 1, _id: 1 },
      'price-desc': { 'variants.sellingPrice': -1, _id: 1 },
    };
    const sortSpec = sortMap[sort] || sortMap.newest;

    // Shoppers only ever see active products; drafts are admin-only.
    const isAdmin = req.user && ['admin', 'superadmin', 'catalog'].includes(req.user.role);
    if (!isAdmin) query.status = 'active';

    if (search) {
      // Matches name OR description — previously name-only, so a product only
      // described by a term (not named it) was invisible to search.
      const re = { $regex: search, $options: 'i' };
      query.$or = [{ name: re }, { description: re }];
    }
    if (department) query.department = department;
    if (item) query.item = item;
    if (fit) query['variants.fit'] = fit; // matches products that have at least one variant with this fit
    // Each facet independently checks "does any variant match" — a product
    // with a red S and a blue M matches colour=red AND size=M, even though no
    // single variant is both. Combinable, simple, and what most PLPs do;
    // requiring one variant to satisfy every facet at once would be a much
    // fussier UX for a store this size.
    if (Array.isArray(sizes) && sizes.length > 0) query['variants.size'] = { $in: sizes };
    if (Array.isArray(colours) && colours.length > 0) query['variants.colour'] = { $in: colours };
    if (minPrice != null || maxPrice != null) {
      const range = {};
      if (minPrice != null) range.$gte = Number(minPrice);
      if (maxPrice != null) range.$lte = Number(maxPrice);
      query['variants.sellingPrice'] = range;
    }

    const total = await Product.countDocuments(query);
    const data = await Product.find(query)
      .populate('department', 'name')
      .populate('item', 'name')
      .populate('design', 'name')
      .populate('fabric', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sortSpec);

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async productCreate(req, res, next) {
    const data = req.body;
    
    if (!data.name) throw new ApiError(400, 'Product name is required');
    if (!data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true }) + '-' + Date.now();
    }
    
    await assertUniqueSkus(data.variants);
    data.createdBy = req.user.id;
    const newProduct = await Product.create(data);
    logAudit({ actor: req.user, action: 'product.create', entityType: 'Product', entityId: newProduct._id, summary: `Created product "${newProduct.name}"` });

    res.locals.responseData = { success: true, message: 'Product created successfully', data: newProduct };
    next();
  }

  async productUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Product ID is required');

    if (data.name && !data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true }) + '-' + Date.now();
    }

    if (data.variants) await assertUniqueSkus(data.variants, id);
    data.updatedBy = req.user.id;
    const before = await Product.findById(id, 'name variants status');
    const updatedProduct = await Product.findByIdAndUpdate(id, data, { new: true });

    if (!updatedProduct) throw new ApiError(404, 'Product not found');

    logAudit({
      actor: req.user, action: 'product.update', entityType: 'Product', entityId: id,
      summary: `Updated product "${updatedProduct.name}"`,
      before: before ? { name: before.name, status: before.status, variants: before.variants } : undefined,
      after: { name: updatedProduct.name, status: updatedProduct.status, variants: updatedProduct.variants },
    });

    res.locals.responseData = { success: true, message: 'Product updated successfully', data: updatedProduct };
    next();
  }

  async productDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Product ID is required');

    const deletedProduct = await Product.findByIdAndUpdate(id, { isDeleted: true, updatedBy: req.user.id }, { new: true });
    if (!deletedProduct) throw new ApiError(404, 'Product not found');

    logAudit({ actor: req.user, action: 'product.delete', entityType: 'Product', entityId: id, summary: `Deleted product "${deletedProduct.name}"` });

    res.locals.responseData = { success: true, message: 'Product deleted successfully' };
    next();
  }

  // Clones a product as a starting point for a similar listing. Stock resets
  // to 0 and status to 'draft' on every variant — a duplicate should never
  // silently go live selling against the original's real stock count.
  async productDuplicate(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Product ID is required');

    const original = await Product.findOne({ _id: id, isDeleted: false }).lean();
    if (!original) throw new ApiError(404, 'Product not found');

    const { _id, createdAt, updatedAt, __v, ...rest } = original;
    const copy = await Product.create({
      ...rest,
      name: `${original.name} (Copy)`,
      slug: slugify(`${original.name}-copy`, { lower: true, strict: true }) + '-' + Date.now(),
      status: 'draft',
      // SKUs must stay unique across products, so the copy gets a suffixed SKU.
      variants: (original.variants || []).map(({ _id, ...v }, i) => ({
        ...v,
        sku: `${v.sku}-C${Date.now().toString(36).slice(-3).toUpperCase()}${i}`,
        stock: 0,
      })),
      createdBy: req.user.id,
      updatedBy: undefined,
    });

    logAudit({ actor: req.user, action: 'product.duplicate', entityType: 'Product', entityId: copy._id, summary: `Duplicated "${original.name}" as "${copy.name}"` });

    res.locals.responseData = { success: true, message: 'Product duplicated', data: copy };
    next();
  }

  // Adjusts sellingPrice across every variant of the selected products, either
  // by a percentage or a flat rupee amount — preserves each variant's existing
  // price relationships rather than forcing them all to one number.
  async bulkPriceUpdate(req, res, next) {
    const { ids, mode, value } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new ApiError(400, 'No products selected');
    if (!['percent', 'fixed'].includes(mode)) throw new ApiError(400, 'Mode must be "percent" or "fixed"');
    if (typeof value !== 'number' || Number.isNaN(value)) throw new ApiError(400, 'Value must be a number');

    const products = await Product.find({ _id: { $in: ids }, isDeleted: false });
    let updatedCount = 0;
    for (const product of products) {
      for (const variant of product.variants) {
        const current = variant.sellingPrice ?? variant.mrp;
        const next = mode === 'percent'
          ? Math.round(current * (1 + value / 100))
          : current + value;
        variant.sellingPrice = Math.max(0, next);
      }
      product.updatedBy = req.user.id;
      await product.save();
      updatedCount += 1;
    }

    logAudit({
      actor: req.user, action: 'product.bulk_price_update', entityType: 'Product',
      summary: `Bulk price update on ${updatedCount} product(s): ${mode === 'percent' ? `${value > 0 ? '+' : ''}${value}%` : `${value > 0 ? '+' : ''}₹${value}`}`,
    });

    res.locals.responseData = { success: true, message: `Updated prices on ${updatedCount} product(s)` };
    next();
  }

  async productDetail(req, res, next) {
    const { id, slug } = req.body;
    if (!id && !slug) throw new ApiError(400, 'Product ID or Slug is required');
    
    const query = id ? { _id: id } : { slug };
    const doc = await Product.findOne(query)
      .populate('department', 'name')
      .populate('item', 'name')
      .populate('design', 'name')
      .populate('fabric', 'name')
      .populate('variants.colour', 'name hexCode')
      .populate('variants.size', 'name')
      .populate('variants.fit', 'name');
      
    if (!doc || doc.isDeleted) throw new ApiError(404, 'Product not found');

    res.locals.responseData = { success: true, data: doc };
    next();
  }

  // Bulk stock update from an external inventory export (e.g. Alpha-E Excel).
  // rows: [{ code, stock }] — code matches a variant barcode first, then SKU.
  // apply=false returns a preview (what would change); apply=true writes it.
  async stockImport(req, res, next) {
    const { rows, apply = false } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) throw new ApiError(400, 'No rows to import');
    if (rows.length > 2000) throw new ApiError(400, 'Too many rows (max 2000 per import)');

    const matched = [];
    const unmatched = [];
    const seen = new Set();

    for (const row of rows) {
      const code = String(row.code ?? '').trim();
      const stock = Number(row.stock);
      if (!code) continue;
      if (seen.has(code)) {
        unmatched.push({ code, reason: 'Duplicate row in file (only the first is used)' });
        continue;
      }
      seen.add(code);
      if (!Number.isFinite(stock) || stock < 0) {
        unmatched.push({ code, reason: 'Stock value is not a valid number' });
        continue;
      }

      const product = await Product.findOne({
        isDeleted: false,
        $or: [{ 'variants.barcode': code }, { 'variants.sku': code }],
      }).select('name variants.sku variants.barcode variants.stock');

      const variant = product?.variants.find((v) => v.barcode === code) ||
        product?.variants.find((v) => v.sku === code);

      if (!product || !variant) {
        unmatched.push({ code, reason: 'No product option with this barcode or stock code' });
        continue;
      }

      matched.push({
        productId: product._id,
        productName: product.name,
        sku: variant.sku,
        barcode: variant.barcode || '',
        code,
        oldStock: variant.stock,
        newStock: Math.floor(stock),
        changed: variant.stock !== Math.floor(stock),
      });
    }

    if (apply) {
      for (const m of matched) {
        if (!m.changed) continue;
        await Product.updateOne(
          { _id: m.productId, 'variants.sku': m.sku },
          { $set: { 'variants.$.stock': m.newStock, updatedBy: req.user.id } }
        );
      }
      const changedRows = matched.filter((m) => m.changed);
      if (changedRows.length > 0) {
        logAudit({
          actor: req.user, action: 'stock.import', entityType: 'Stock',
          summary: `Stock import: ${changedRows.length} SKU(s) updated`,
          after: changedRows.map((m) => ({ sku: m.sku, from: m.oldStock, to: m.newStock })),
        });
      }
    }

    res.locals.responseData = {
      success: true,
      message: apply
        ? `Stock updated for ${matched.filter((m) => m.changed).length} option(s)`
        : 'Preview ready',
      data: { matched, unmatched, applied: !!apply },
    };
    next();
  }

  // Full-attribute product import: one row per variant, grouped by product
  // name — unlike stockImport (quantities only), this can create brand-new
  // products or add/update variants on existing ones. Master-data references
  // (department/category/design/fabric/colour/size/fit) are matched by name
  // against what already exists; nothing is auto-created, since a typo
  // silently spawning a new "Departmnet" would be worse than the row erroring.
  async bulkImport(req, res, next) {
    const { rows, apply = false } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) throw new ApiError(400, 'No rows to import');
    if (rows.length > 2000) throw new ApiError(400, 'Too many rows (max 2000 per import)');

    const [departments, items, designs, fabrics, colours, sizes, fits, existingProducts] = await Promise.all([
      Department.find({ isDeleted: false }),
      Item.find({ isDeleted: false }),
      Design.find({ isDeleted: false }),
      Fabric.find({ isDeleted: false }),
      Colour.find({ isDeleted: false }),
      Size.find({ isDeleted: false }),
      Fit.find({ isDeleted: false }),
      Product.find({ isDeleted: false }, 'name slug variants'),
    ]);
    const byName = (docs) => new Map(docs.map((d) => [d.name.trim().toLowerCase(), d]));
    const departmentByName = byName(departments);
    const itemByName = byName(items);
    const designByName = byName(designs);
    const fabricByName = byName(fabrics);
    const colourByName = byName(colours);
    const sizeByName = byName(sizes);
    const fitByName = byName(fits);
    const productByName = new Map(existingProducts.map((p) => [p.name.trim().toLowerCase(), p]));
    // sku -> owning product key (existing product name, lowercased). Grows as
    // new products in this same file claim SKUs, so two rows in one upload
    // can't collide either.
    const skuOwner = new Map();
    for (const p of existingProducts) {
      for (const v of p.variants || []) skuOwner.set(v.sku, p.name.trim().toLowerCase());
    }

    // Group rows by product name, preserving first-seen casing for display.
    const groups = new Map();
    for (const row of rows) {
      const key = String(row.productName || '').trim().toLowerCase();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, { productName: String(row.productName).trim(), rows: [] });
      groups.get(key).rows.push(row);
    }

    const results = [];
    for (const { productName, rows: groupRows } of groups.values()) {
      const first = groupRows[0];
      const groupErrors = [];

      const department = departmentByName.get(String(first.department || '').trim().toLowerCase());
      if (!department) groupErrors.push(`Department "${first.department || ''}" not found`);
      const item = itemByName.get(String(first.category || '').trim().toLowerCase());
      if (!item) groupErrors.push(`Category "${first.category || ''}" not found`);
      let design, fabric;
      if (first.design) {
        design = designByName.get(String(first.design).trim().toLowerCase());
        if (!design) groupErrors.push(`Design "${first.design}" not found`);
      }
      if (first.fabric) {
        fabric = fabricByName.get(String(first.fabric).trim().toLowerCase());
        if (!fabric) groupErrors.push(`Fabric "${first.fabric}" not found`);
      }

      const rowErrors = [];
      const variants = [];
      for (const row of groupRows) {
        if (!row.sku) { rowErrors.push({ sku: '(blank)', reason: 'SKU is required' }); continue; }
        const skuKey = String(row.sku).trim();
        const owner = skuOwner.get(skuKey);
        if (owner && owner !== productName.toLowerCase()) {
          rowErrors.push({ sku: row.sku, reason: `SKU already used by another product ("${owner}") — SKUs must be unique` });
          continue;
        }
        const colour = colourByName.get(String(row.colour || '').trim().toLowerCase());
        const size = sizeByName.get(String(row.size || '').trim().toLowerCase());
        const fit = fitByName.get(String(row.fit || '').trim().toLowerCase());
        if (!colour) { rowErrors.push({ sku: row.sku, reason: `Colour "${row.colour || ''}" not found` }); continue; }
        if (!size) { rowErrors.push({ sku: row.sku, reason: `Size "${row.size || ''}" not found` }); continue; }
        if (!fit) { rowErrors.push({ sku: row.sku, reason: `Fit "${row.fit || ''}" not found` }); continue; }
        const mrp = Number(row.mrp);
        const sellingPrice = Number(row.sellingPrice);
        const stock = Number(row.stock);
        if (!Number.isFinite(mrp) || !Number.isFinite(sellingPrice)) { rowErrors.push({ sku: row.sku, reason: 'MRP/Selling Price must be numbers' }); continue; }
        skuOwner.set(skuKey, productName.toLowerCase());
        variants.push({
          colour: colour._id, size: size._id, fit: fit._id, sku: skuKey,
          barcode: row.barcode ? String(row.barcode).trim() : undefined,
          mrp, sellingPrice, stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0,
        });
      }

      if (groupErrors.length > 0 || variants.length === 0) {
        results.push({ productName, action: 'skipped', variantCount: 0, errors: groupErrors, rowErrors });
        continue;
      }

      const existing = productByName.get(productName.toLowerCase());
      const action = existing ? 'update' : 'create';
      results.push({ productName, action, variantCount: variants.length, errors: [], rowErrors });

      if (!apply) continue;

      if (existing) {
        const bySku = new Map((existing.variants || []).map((v) => [v.sku, v]));
        for (const v of variants) bySku.set(v.sku, v);
        const update = { variants: [...bySku.values()], updatedBy: req.user.id };
        if (department) update.department = department._id;
        if (item) update.item = item._id;
        if (design) update.design = design._id;
        if (fabric) update.fabric = fabric._id;
        if (first.description) update.description = first.description;
        await Product.updateOne({ _id: existing._id }, update);
      } else {
        await Product.create({
          name: productName,
          slug: slugify(productName, { lower: true, strict: true }) + '-' + Date.now(),
          description: first.description || undefined,
          department: department._id,
          item: item._id,
          design: design?._id,
          fabric: fabric?._id,
          variants,
          status: ['active', 'draft', 'out-of-stock'].includes(first.status) ? first.status : 'draft',
          isFeatured: /^(yes|true|1)$/i.test(String(first.featured || '')),
          taxPercentage: Number(first.taxPercentage) || 0,
          createdBy: req.user.id,
        });
      }
    }

    if (apply) {
      const created = results.filter((r) => r.action === 'create').length;
      const updated = results.filter((r) => r.action === 'update').length;
      logAudit({
        actor: req.user, action: 'product.bulk_import', entityType: 'Product',
        summary: `Bulk product import: ${created} created, ${updated} updated`,
      });
    }

    res.locals.responseData = {
      success: true,
      message: apply ? 'Import applied' : 'Preview ready',
      data: { results, applied: !!apply },
    };
    next();
  }
}

export default ProductController;
