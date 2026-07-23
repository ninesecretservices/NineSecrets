import Product from '../schema/Product.js';
import ApiError from '../utils/ApiError.js';
import slugify from 'slugify';

class ProductController {
  async productList(req, res, next) {
    const { page = 1, limit = 10, search = '', department, item, fit, sort = 'newest', ids, featured } = req.body;
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
    const isAdmin = req.user && ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin) query.status = 'active';

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (department) query.department = department;
    if (item) query.item = item;
    if (fit) query['variants.fit'] = fit; // matches products that have at least one variant with this fit
    
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
    
    data.createdBy = req.user.id;
    const newProduct = await Product.create(data);
    
    res.locals.responseData = { success: true, message: 'Product created successfully', data: newProduct };
    next();
  }

  async productUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Product ID is required');
    
    if (data.name && !data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true }) + '-' + Date.now();
    }
    
    data.updatedBy = req.user.id;
    const updatedProduct = await Product.findByIdAndUpdate(id, data, { new: true });
    
    if (!updatedProduct) throw new ApiError(404, 'Product not found');
    
    res.locals.responseData = { success: true, message: 'Product updated successfully', data: updatedProduct };
    next();
  }

  async productDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Product ID is required');
    
    const deletedProduct = await Product.findByIdAndUpdate(id, { isDeleted: true, updatedBy: req.user.id }, { new: true });
    if (!deletedProduct) throw new ApiError(404, 'Product not found');
    
    res.locals.responseData = { success: true, message: 'Product deleted successfully' };
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
}

export default ProductController;
