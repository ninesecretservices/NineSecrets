import BulkOrder from '../schema/BulkOrder.js';
import Shop from '../schema/Shop.js';
import Product from '../schema/Product.js';
import ApiError from '../utils/ApiError.js';
import { decrementStock, restoreStock } from './order.js';
import { logAudit } from '../utils/auditLog.js';

const isStaffAdmin = (role) => ['superadmin', 'admin'].includes(role);

class BulkOrderController {
  // superadmin/admin see every bulk order (oversight); a sales rep only sees
  // their own — same split as Order's customer-vs-staff visibility rule.
  async bulkOrderList(req, res, next) {
    const { page = 1, limit = 20, shop, salesPerson } = req.body;
    const query = {};
    if (!isStaffAdmin(req.user.role)) {
      query.salesPerson = req.user.id;
    } else if (salesPerson) {
      query.salesPerson = salesPerson;
    }
    if (shop) query.shop = shop;

    const total = await BulkOrder.countDocuments(query);
    const docs = await BulkOrder.find(query)
      .populate('shop', 'name city')
      .populate('salesPerson', 'name email')
      .populate('items.product', 'thumbnail')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.locals.responseData = { success: true, data: { docs, total, page, limit } };
    next();
  }

  async bulkOrderDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Bulk order ID is required');
    const query = { _id: id };
    if (!isStaffAdmin(req.user.role)) query.salesPerson = req.user.id;

    const order = await BulkOrder.findOne(query)
      .populate('shop')
      .populate('salesPerson', 'name email')
      .populate('items.variant.colour', 'name hexCode')
      .populate('items.variant.size', 'name')
      .populate('items.variant.fit', 'name');
    if (!order) throw new ApiError(404, 'Bulk order not found');

    res.locals.responseData = { success: true, data: order };
    next();
  }

  // Finalizes a bulk order: re-prices every line from the real catalog's
  // wholesalePrice (never trusts a client-sent price), decrements real stock
  // immediately — the same Product.variants.stock pool the public storefront
  // sells from — and rolls back cleanly if any line can't be fulfilled.
  async bulkOrderCreate(req, res, next) {
    const { shop: shopId, items } = req.body;
    if (!shopId) throw new ApiError(400, 'Shop is required');
    if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'At least one item is required');

    const shop = await Shop.findOne({ _id: shopId, isActive: true });
    if (!shop) throw new ApiError(404, 'Shop not found');

    const productIds = [...new Set(items.map((i) => String(i.product)))];
    const products = await Product.find({ _id: { $in: productIds }, isDeleted: false }, 'name variants status');
    const productById = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    let totalPieces = 0;
    let totalAmount = 0;
    for (const item of items) {
      const product = productById.get(String(item.product));
      if (!product || product.status !== 'active') {
        throw new ApiError(400, `"${product?.name || 'A product'}" is no longer available`);
      }
      const variant = product.variants.find((v) => v.sku === item.variant?.sku);
      if (!variant) throw new ApiError(400, `Variant ${item.variant?.sku} of "${product.name}" no longer exists`);
      if (variant.wholesalePrice == null) {
        throw new ApiError(400, `"${product.name}" (${variant.sku}) has no wholesale price set yet — ask an admin to add one`);
      }
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new ApiError(400, `Invalid quantity for "${product.name}"`);
      if (variant.stock < quantity) {
        throw new ApiError(400, `Only ${variant.stock} left in stock for "${product.name}" (${variant.sku})`);
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        variant: item.variant,
        quantity,
        price: variant.wholesalePrice,
      });
      totalPieces += quantity;
      totalAmount += variant.wholesalePrice * quantity;
    }

    // Decrement stock with guarded atomic updates; roll back on any failure —
    // same discipline as the customer checkout path.
    const decremented = [];
    for (const item of orderItems) {
      const ok = await decrementStock(item.product, item.variant.sku, item.quantity);
      if (!ok) {
        await restoreStock(decremented);
        throw new ApiError(409, `"${item.name}" went out of stock while finalizing this order.`);
      }
      decremented.push(item);
    }

    const orderNumber = 'BO-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const order = await BulkOrder.create({
      orderNumber,
      shop: shop._id,
      salesPerson: req.user.id,
      items: orderItems,
      totalPieces,
      totalAmount,
      status: 'sent',
    });

    logAudit({
      actor: req.user, action: 'bulkorder.create', entityType: 'BulkOrder', entityId: order._id,
      summary: `Bulk order ${orderNumber}: ${totalPieces} pieces to "${shop.name}" by ${req.user.name}`,
    });

    res.locals.responseData = { success: true, message: 'Order finalized', data: order };
    next();
  }

  // Marks goods as physically received at the shop — a status flag only.
  // Deliberately does NOT touch stock again (stock was already decremented at
  // finalize time) — this is for the team's own tracking, not inventory math.
  async bulkOrderUpdateStatus(req, res, next) {
    const { id, status } = req.body;
    if (!id) throw new ApiError(400, 'Bulk order ID is required');
    if (!['sent', 'received', 'cancelled'].includes(status)) throw new ApiError(400, 'Invalid status');

    const query = { _id: id };
    if (!isStaffAdmin(req.user.role)) query.salesPerson = req.user.id;
    const order = await BulkOrder.findOneAndUpdate(query, { status }, { new: true });
    if (!order) throw new ApiError(404, 'Bulk order not found');

    res.locals.responseData = { success: true, message: 'Status updated', data: order };
    next();
  }
}

export default BulkOrderController;
