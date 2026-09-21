import Cart from '../schema/Cart.js';
import Product from '../schema/Product.js';
import ApiError from '../utils/ApiError.js';

class CartController {
  async cartDetail(req, res, next) {
    const userId = req.user.id;
    let cart = await Cart.findOne({ user: userId })
      .populate('items.product', 'name slug thumbnail')
      .populate('items.variant.colour', 'name hexCode')
      .populate('items.variant.size', 'name')
      .populate('items.variant.fit', 'name');

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], total: 0 });
    }

    res.locals.responseData = { success: true, data: cart };
    next();
  }

  async cartUpdate(req, res, next) {
    const userId = req.user.id;
    const { items } = req.body; // Expecting full items array to replace or specific actions

    if (!Array.isArray(items)) {
      throw new ApiError(400, 'Items array is required');
    }

    // Re-validate every line against the live catalogue — stock and price were
    // previously trusted as-sent by the client, so a stale/tampered cart could
    // sit indefinitely over the real stock or at a since-changed price until
    // checkout finally caught it. This mirrors the re-pricing priceCart()
    // already does for orders, just applied earlier (at cart-edit time too).
    const productIds = [...new Set(items.map((i) => String(i.product?._id || i.product)))];
    const products = await Product.find(
      { _id: { $in: productIds } },
      'name variants isDeleted status'
    );
    const productById = new Map(products.map((p) => [p._id.toString(), p]));

    const adjustments = [];
    const validItems = [];
    for (const item of items) {
      const productId = String(item.product?._id || item.product);
      const product = productById.get(productId);
      if (!product || product.isDeleted || product.status !== 'active') {
        adjustments.push(`An item is no longer available and was removed from your bag`);
        continue;
      }
      const variant = product.variants.find((v) => v.sku === item.variant?.sku);
      if (!variant) {
        adjustments.push(`"${product.name}" (that option) is no longer available and was removed from your bag`);
        continue;
      }
      if (variant.stock <= 0) {
        adjustments.push(`"${product.name}" is out of stock and was removed from your bag`);
        continue;
      }
      const price = variant.sellingPrice ?? variant.mrp;
      const quantity = Math.min(item.quantity, variant.stock);
      if (quantity < item.quantity) {
        adjustments.push(`"${product.name}" quantity was reduced to ${quantity} — only that many left in stock`);
      }
      validItems.push({ product: productId, variant: item.variant, quantity, price });
    }

    const total = validItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { items: validItems, total },
      { new: true, upsert: true }
    )
      .populate('items.product', 'name slug thumbnail')
      .populate('items.variant.colour', 'name hexCode')
      .populate('items.variant.size', 'name')
      .populate('items.variant.fit', 'name');

    res.locals.responseData = {
      success: true,
      message: adjustments.length > 0 ? adjustments.join('; ') : 'Cart updated successfully',
      data: cart,
    };
    next();
  }
}

export default CartController;
