import Order from '../schema/Order.js';
import ApiError from '../utils/ApiError.js';
import Cart from '../schema/Cart.js';
import Product from '../schema/Product.js';
import Coupon from '../schema/Coupon.js';
import Setting from '../schema/Setting.js';
import { sendEmail, orderConfirmationEmail } from '../utils/email.js';

// Store-level commerce config (Admin → Store Settings), with safe defaults.
export const getCommerceConfig = async () => {
  const doc = await Setting.findOne({ key: 'commerce' });
  return {
    freeShippingThreshold: 599,
    shippingFee: 50,
    codEnabled: true,
    lowStockThreshold: 5,
    maxOrderQty: 10,
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    facebookUrl: '',
    ...(doc?.value || {}),
  };
};

// Atomically decrement stock for one variant; fails if stock is insufficient.
const decrementStock = async (productId, sku, qty) => {
  const res = await Product.updateOne(
    { _id: productId, variants: { $elemMatch: { sku, stock: { $gte: qty } } } },
    { $inc: { 'variants.$.stock': -qty } }
  );
  return res.modifiedCount === 1;
};

const restoreStock = async (items) => {
  for (const item of items) {
    if (!item.variant?.sku) continue;
    await Product.updateOne(
      { _id: item.product, 'variants.sku': item.variant.sku },
      { $inc: { 'variants.$.stock': item.quantity } }
    );
  }
};

export const validateCoupon = async (code, subtotal) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isDeleted: false });
  if (!coupon || !coupon.isActive) throw new ApiError(400, 'Invalid coupon code');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, 'This coupon has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'This coupon has been fully redeemed');
  if (subtotal < coupon.minOrderValue) {
    throw new ApiError(400, `This coupon requires a minimum order of ₹${coupon.minOrderValue}`);
  }
  let discount = coupon.type === 'percent'
    ? Math.round((subtotal * coupon.value) / 100)
    : coupon.value;
  if (coupon.type === 'percent' && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { coupon, discount };
};

class OrderController {
  async orderList(req, res, next) {
    const { page = 1, limit = 10, status } = req.body;
    const query = {};

    // If it's not a superadmin/admin, only show their own orders
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      query.user = req.user.id;
    } else if (req.body.userId) {
      query.user = req.body.userId;
    }

    if (status) query.orderStatus = status;

    const total = await Order.countDocuments(query);
    const docs = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.locals.responseData = { success: true, data: { docs, total, page, limit } };
    next();
  }

  async orderCreate(req, res, next) {
    const { shippingAddress, paymentMethod = 'cod', couponCode } = req.body;
    const userId = req.user.id;

    if (!shippingAddress?.fullName || !shippingAddress?.addressLine1 || !shippingAddress?.city ||
        !shippingAddress?.postalCode || !shippingAddress?.phone) {
      throw new ApiError(400, 'Shipping address (name, address, city, postal code, phone) is required');
    }
    if (!['cod', 'card'].includes(paymentMethod)) {
      throw new ApiError(400, 'Invalid payment method');
    }
    const commerce = await getCommerceConfig();
    if (paymentMethod === 'cod' && !commerce.codEnabled) {
      throw new ApiError(400, 'Cash on Delivery is currently unavailable');
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product', 'name variants taxPercentage isDeleted status');
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    // Re-price every line from the catalogue — never trust prices stored in the cart —
    // and validate stock before touching anything.
    let subtotal = 0;
    let tax = 0;
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;
      if (!product || product.isDeleted || product.status !== 'active') {
        throw new ApiError(400, `"${product?.name || 'A product'}" is no longer available`);
      }
      const variant = product.variants.find((v) => v.sku === item.variant.sku);
      if (!variant) throw new ApiError(400, `Variant ${item.variant.sku} of "${product.name}" no longer exists`);
      if (variant.stock < item.quantity) {
        throw new ApiError(400, `Only ${variant.stock} left in stock for "${product.name}" (${variant.sku})`);
      }
      if (item.quantity > commerce.maxOrderQty) {
        throw new ApiError(400, `Maximum ${commerce.maxOrderQty} units per item`);
      }
      const price = variant.sellingPrice ?? variant.mrp;
      subtotal += price * item.quantity;
      tax += Math.round((price * item.quantity * (product.taxPercentage || 0)) / 100);
      orderItems.push({
        product: product._id,
        name: product.name,
        variant: item.variant,
        quantity: item.quantity,
        price
      });
    }

    // Coupon
    let couponData = undefined;
    if (couponCode) {
      const { coupon, discount } = await validateCoupon(couponCode, subtotal);
      couponData = { code: coupon.code, discount };
      await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
    }

    const discount = couponData?.discount || 0;
    const shippingFee = subtotal - discount >= commerce.freeShippingThreshold ? 0 : commerce.shippingFee;
    const total = subtotal - discount + tax + shippingFee;

    // Decrement stock with guarded atomic updates; roll back on any failure.
    const decremented = [];
    for (const item of orderItems) {
      const ok = await decrementStock(item.product, item.variant.sku, item.quantity);
      if (!ok) {
        await restoreStock(decremented);
        throw new ApiError(409, `"${item.name}" went out of stock while placing the order. Please review your cart.`);
      }
      decremented.push(item);
    }

    const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    // Payment: COD orders are confirmed immediately with payment pending (collected
    // on delivery). Card payments stay 'pending' until a gateway (e.g. Razorpay)
    // confirms via its callback — integrate the gateway here when keys are available.
    const order = await Order.create({
      user: userId,
      orderNumber,
      items: orderItems,
      subtotal,
      tax,
      shippingFee,
      total,
      coupon: couponData,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'processing'
    });

    // Clear the cart
    await Cart.findOneAndUpdate({ user: userId }, { items: [], total: 0 });

    // Fire-and-forget confirmation email
    sendEmail({ to: req.user.email, ...orderConfirmationEmail(order) });

    res.locals.responseData = { success: true, message: 'Order placed successfully', data: order };
    next();
  }

  async orderDetail(req, res, next) {
    const { id, orderNumber } = req.body;
    if (!id && !orderNumber) throw new ApiError(400, 'Order ID or Order Number required');

    const query = id ? { _id: id } : { orderNumber };
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    const order = await Order.findOne(query)
      .populate('user', 'name email')
      .populate('items.variant.colour', 'name hexCode')
      .populate('items.variant.size', 'name');
    if (!order) throw new ApiError(404, 'Order not found');

    res.locals.responseData = { success: true, data: order };
    next();
  }

  // Public: lets a guest (COD, no account) look up an order with just its
  // number + the phone number on the shipping address — no other order
  // details are exposed by order number alone, so this can't be used to
  // enumerate/scrape other customers' orders.
  async orderTrack(req, res, next) {
    const { orderNumber, phone } = req.body;
    if (!orderNumber || !phone) throw new ApiError(400, 'Order number and phone number are required');

    const normalize = (p) => (p || '').replace(/\D/g, '').slice(-10);
    const wantPhone = normalize(phone);

    const order = wantPhone.length === 10
      ? await Order.findOne({ orderNumber: orderNumber.trim() })
          .populate('items.product', 'name thumbnail slug')
          .populate('items.variant.colour', 'name hexCode')
          .populate('items.variant.size', 'name')
      : null;

    if (!order || normalize(order.shippingAddress?.phone) !== wantPhone) {
      throw new ApiError(404, "No order found — check your order number and phone number");
    }

    res.locals.responseData = { success: true, data: order };
    next();
  }

  async orderUpdate(req, res, next) {
    const { id, orderStatus, paymentStatus } = req.body;
    if (!id) throw new ApiError(400, 'Order ID is required');

    const order = await Order.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');

    const patch = {};
    if (orderStatus) {
      patch.orderStatus = orderStatus;
      if (orderStatus === 'delivered' && order.orderStatus !== 'delivered') {
        patch.deliveredAt = new Date();
        if (order.paymentMethod === 'cod') patch.paymentStatus = 'completed';
      }
      // Cancelling puts reserved stock back on the shelf.
      if (orderStatus === 'cancelled' && order.orderStatus !== 'cancelled') {
        await restoreStock(order.items);
        if (order.paymentStatus === 'completed') patch.paymentStatus = 'refunded';
      }
    }
    if (paymentStatus) patch.paymentStatus = paymentStatus;

    const updated = await Order.findByIdAndUpdate(id, patch, { new: true });
    res.locals.responseData = { success: true, message: 'Order updated successfully', data: updated };
    next();
  }

  // Customer cancels their own order while it is still processing.
  async orderCancel(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Order ID is required');

    const order = await Order.findOne({ _id: id, user: req.user.id });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.orderStatus !== 'processing') {
      throw new ApiError(400, 'Only orders that have not shipped can be cancelled');
    }

    await restoreStock(order.items);
    order.orderStatus = 'cancelled';
    if (order.paymentStatus === 'completed') order.paymentStatus = 'refunded';
    await order.save();

    res.locals.responseData = { success: true, message: 'Order cancelled', data: order };
    next();
  }

  // Customer requests a return/exchange within 7 days of delivery.
  async returnRequest(req, res, next) {
    const { id, type = 'return', reason } = req.body;
    if (!id) throw new ApiError(400, 'Order ID is required');
    if (!['return', 'exchange'].includes(type)) throw new ApiError(400, 'Invalid request type');
    if (!reason || reason.trim().length < 5) throw new ApiError(400, 'Please provide a reason (min 5 characters)');

    const order = await Order.findOne({ _id: id, user: req.user.id });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.orderStatus !== 'delivered') throw new ApiError(400, 'Only delivered orders can be returned or exchanged');
    if (order.returnRequest?.status && order.returnRequest.status !== 'none') {
      throw new ApiError(400, 'A return request already exists for this order');
    }
    const deliveredAt = order.deliveredAt || order.updatedAt;
    if (Date.now() - deliveredAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
      throw new ApiError(400, 'The 7-day exchange window for this order has passed');
    }

    order.returnRequest = { status: 'requested', type, reason: reason.trim(), requestedAt: new Date() };
    await order.save();

    res.locals.responseData = {
      success: true,
      message: `${type === 'return' ? 'Return' : 'Exchange'} request submitted`,
      data: order,
    };
    next();
  }

  // Admin resolves a return request.
  async returnUpdate(req, res, next) {
    const { id, status } = req.body;
    if (!id) throw new ApiError(400, 'Order ID is required');
    if (!['approved', 'rejected', 'completed'].includes(status)) throw new ApiError(400, 'Invalid status');

    const order = await Order.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.returnRequest || order.returnRequest.status === 'none') {
      throw new ApiError(400, 'This order has no return request');
    }

    order.returnRequest.status = status;
    if (status === 'completed') {
      order.returnRequest.resolvedAt = new Date();
      if (order.returnRequest.type === 'return') {
        await restoreStock(order.items);
        if (order.paymentStatus === 'completed') order.paymentStatus = 'refunded';
      }
    }
    if (status === 'rejected') order.returnRequest.resolvedAt = new Date();
    await order.save();

    res.locals.responseData = { success: true, message: 'Return request updated', data: order };
    next();
  }

  // Admin dashboard stats: revenue, order counts, low-stock variants.
  async orderStats(req, res, next) {
    const [revenueAgg] = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
    ]);
    const processing = await Order.countDocuments({ orderStatus: 'processing' });
    const pendingReturns = await Order.countDocuments({ 'returnRequest.status': 'requested' });

    const { lowStockThreshold } = await getCommerceConfig();
    const lowStock = await Product.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: '$variants' },
      { $match: { 'variants.stock': { $lt: lowStockThreshold } } },
      { $project: { name: 1, sku: '$variants.sku', stock: '$variants.stock' } },
      { $sort: { stock: 1 } },
      { $limit: 10 }
    ]);

    res.locals.responseData = {
      success: true,
      data: {
        revenue: revenueAgg?.revenue || 0,
        orders: revenueAgg?.orders || 0,
        processing,
        pendingReturns,
        lowStock
      },
    };
    next();
  }
}

export default OrderController;
