import Order from '../schema/Order.js';
import ApiError from '../utils/ApiError.js';
import Cart from '../schema/Cart.js';
import Product from '../schema/Product.js';
import Coupon from '../schema/Coupon.js';
import Setting from '../schema/Setting.js';
import User from '../schema/User.js';
import { sendEmail, orderConfirmationEmail } from '../utils/email.js';
import { generateInvoicePdf } from '../utils/invoice.js';
import { razorpayConfigured, razorpayKeyId, createRazorpayOrder, verifyRazorpaySignature, refundRazorpayPayment } from '../utils/razorpay.js';
import { logAudit } from '../utils/auditLog.js';

// Store-level commerce config (Admin → Store Settings), with safe defaults.
export const getCommerceConfig = async () => {
  const doc = await Setting.findOne({ key: 'commerce' });
  return {
    freeShippingThreshold: 599,
    shippingFee: 50,
    standardShippingDays: '3-5 business days',
    expressShippingEnabled: false,
    expressShippingFee: 150,
    expressShippingDays: '1-2 business days',
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

// Actually returns the money for a card order (Razorpay refund API); COD has
// no gateway to call, so its "refund" stays a manual/offline process this app
// can only flag, not perform. Never throws — a failed refund must not block
// the cancel/return flow that triggered it, but it IS logged so it can't go
// unnoticed.
const refundOrderPayment = async (order) => {
  if (order.paymentMethod !== 'card' || !order.razorpay?.paymentId) return;
  try {
    await refundRazorpayPayment(order.razorpay.paymentId);
  } catch (err) {
    console.error(`Razorpay refund failed for order ${order.orderNumber} (payment ${order.razorpay.paymentId}):`, err.message);
    logAudit({
      actor: { name: 'system', email: '', role: 'system' },
      action: 'refund.failed', entityType: 'Order', entityId: order._id,
      summary: `Automatic refund FAILED for order ${order.orderNumber} — needs manual refund in the Razorpay dashboard`,
      after: { error: err.message },
    });
  }
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

// Re-prices any {product, variant:{sku}, quantity} list from the catalogue
// (never trusts client-stored prices) and validates stock/quantity limits,
// without touching stock or creating an order. Shared by priceCart (customer
// checkout) and manual order creation (staff placing a phone/in-person order,
// which has no Cart document to read from).
const priceOrderItems = async (rawItems, couponCode, shippingMethod = 'standard') => {
  const commerce = await getCommerceConfig();
  if (!rawItems || rawItems.length === 0) {
    throw new ApiError(400, 'No items to price');
  }

  const productIds = [...new Set(rawItems.map((i) => String(i.product?._id || i.product)))];
  const products = await Product.find({ _id: { $in: productIds } }, 'name variants taxPercentage isDeleted status');
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  let subtotal = 0;
  let tax = 0;
  const orderItems = [];
  for (const item of rawItems) {
    const product = productById.get(String(item.product?._id || item.product));
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

  let couponData;
  if (couponCode) {
    const { coupon, discount } = await validateCoupon(couponCode, orderItems);
    couponData = { code: coupon.code, discount };
  }

  const discount = couponData?.discount || 0;
  // Express is a paid expedite, never covered by the free-shipping threshold —
  // that threshold is a "wait a bit longer, ship free" incentive, not a
  // discount on faster delivery.
  const shippingFee = shippingMethod === 'express'
    ? commerce.expressShippingFee
    : (subtotal - discount >= commerce.freeShippingThreshold ? 0 : commerce.shippingFee);
  const total = subtotal - discount + tax + shippingFee;

  return { commerce, orderItems, subtotal, tax, couponData, shippingFee, shippingMethod, total };
};

export const priceCart = async (userId, couponCode, shippingMethod) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty');
  }
  return priceOrderItems(cart.items, couponCode, shippingMethod);
};

// Staff placing an order on a customer's behalf (phone/in-person sale) — same
// pricing/stock rules as a real checkout, just sourced from a plain item list
// instead of that customer's Cart.
export const priceItemList = (items, couponCode, shippingMethod) => priceOrderItems(items, couponCode, shippingMethod);

// itemsOrSubtotal: either the priced order-items list (preferred — needed to
// compute a scoped discount) or a bare subtotal number (back-compat for
// couponApply's cart-preview call, which only has line totals, not full
// product/variant objects, before checkout re-prices everything anyway).
export const validateCoupon = async (code, itemsOrSubtotal) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isDeleted: false });
  if (!coupon || !coupon.isActive) throw new ApiError(400, 'Invalid coupon code');
  if (coupon.startsAt && coupon.startsAt > new Date()) throw new ApiError(400, 'This coupon is not active yet');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, 'This coupon has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'This coupon has been fully redeemed');

  const isItemList = Array.isArray(itemsOrSubtotal);
  const subtotal = isItemList
    ? itemsOrSubtotal.reduce((s, i) => s + i.price * i.quantity, 0)
    : itemsOrSubtotal;
  if (subtotal < coupon.minOrderValue) {
    throw new ApiError(400, `This coupon requires a minimum order of ₹${coupon.minOrderValue}`);
  }

  // Scoped coupons discount only the matching products' share of the cart.
  // Falls back to the full subtotal when we only have a bare number (the
  // couponApply preview) or the coupon has no scope set.
  const hasScope = coupon.scope?.products?.length > 0;
  const discountBase = hasScope && isItemList
    ? itemsOrSubtotal
        .filter((i) => coupon.scope.products.some((p) => p.toString() === String(i.product?._id || i.product)))
        .reduce((s, i) => s + i.price * i.quantity, 0)
    : subtotal;
  if (hasScope && discountBase === 0) {
    throw new ApiError(400, 'This coupon only applies to specific products in your cart');
  }

  let discount = coupon.type === 'percent'
    ? Math.round((discountBase * coupon.value) / 100)
    : coupon.value;
  if (coupon.type === 'percent' && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, discountBase);
  return { coupon, discount };
};

class OrderController {
  async orderList(req, res, next) {
    const { page = 1, limit = 10, status, returnStatus } = req.body;
    const query = {};

    // If it's not staff, only show their own orders
    const isStaff = ['superadmin', 'admin', 'fulfillment'].includes(req.user.role);
    if (!isStaff) {
      query.user = req.user.id;
    } else if (req.body.userId) {
      query.user = req.body.userId;
    }

    if (status) query.orderStatus = status;
    // Returns worklist: 'any' = has an active request (not 'none'); a specific
    // status narrows further (requested/approved/rejected/completed).
    if (returnStatus === 'any') query['returnRequest.status'] = { $nin: ['none', null] };
    else if (returnStatus) query['returnRequest.status'] = returnStatus;

    const total = await Order.countDocuments(query);
    const docs = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'thumbnail')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.locals.responseData = { success: true, data: { docs, total, page, limit } };
    next();
  }

  // Step 1 of the card-payment flow: price the cart (same logic orderCreate
  // uses) and open a Razorpay order for that exact amount, without touching
  // stock or creating anything yet. The frontend opens Razorpay Checkout
  // against this order id, then calls orderCreate with the resulting
  // payment id + signature once the customer has actually paid.
  async paymentCreateRazorpayOrder(req, res, next) {
    if (!razorpayConfigured) throw new ApiError(400, 'Online payment is not configured');
    const { couponCode, shippingMethod } = req.body;
    const { total } = await priceCart(req.user.id, couponCode, shippingMethod);
    const razorpayOrder = await createRazorpayOrder(total, `rcpt_${req.user.id}_${Date.now()}`);
    res.locals.responseData = {
      success: true,
      data: { razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency, keyId: razorpayKeyId },
    };
    next();
  }

  async orderCreate(req, res, next) {
    const { shippingAddress, paymentMethod = 'cod', couponCode, razorpayOrderId, razorpayPaymentId, razorpaySignature, shippingMethod = 'standard' } = req.body;
    const userId = req.user.id;

    if (!shippingAddress?.fullName || !shippingAddress?.addressLine1 || !shippingAddress?.city ||
        !shippingAddress?.postalCode || !shippingAddress?.phone) {
      throw new ApiError(400, 'Shipping address (name, address, city, postal code, phone) is required');
    }
    if (!['cod', 'card'].includes(paymentMethod)) {
      throw new ApiError(400, 'Invalid payment method');
    }

    // Card orders must already be paid — verify the gateway's signature before
    // touching stock or creating anything. COD skips straight through.
    if (paymentMethod === 'card') {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new ApiError(400, 'Payment details are missing');
      }
      if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
        throw new ApiError(400, 'Payment verification failed');
      }
    }

    if (!['standard', 'express'].includes(shippingMethod)) throw new ApiError(400, 'Invalid shipping method');
    const { commerce, orderItems, subtotal, tax, couponData, shippingFee, total } = await priceCart(userId, couponCode, shippingMethod);
    if (shippingMethod === 'express' && !commerce.expressShippingEnabled) {
      throw new ApiError(400, 'Express shipping is currently unavailable');
    }
    if (paymentMethod === 'cod' && !commerce.codEnabled) {
      throw new ApiError(400, 'Cash on Delivery is currently unavailable');
    }
    if (couponData) {
      await Coupon.updateOne({ code: couponData.code }, { $inc: { usedCount: 1 } });
    }

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

    // COD is confirmed immediately with payment pending (collected on delivery).
    // Card orders reach here only after a verified Razorpay signature, so payment
    // is already complete.
    const order = await Order.create({
      user: userId,
      orderNumber,
      items: orderItems,
      subtotal,
      tax,
      shippingFee,
      shippingMethod,
      total,
      coupon: couponData,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'card' ? 'completed' : 'pending',
      orderStatus: 'processing',
      ...(paymentMethod === 'card' && { razorpay: { orderId: razorpayOrderId, paymentId: razorpayPaymentId } })
    });

    // Clear the cart
    await Cart.findOneAndUpdate({ user: userId }, { items: [], total: 0 });

    // Fire-and-forget confirmation email
    sendEmail({ to: req.user.email, ...orderConfirmationEmail(order) });

    res.locals.responseData = { success: true, message: 'Order placed successfully', data: order };
    next();
  }

  // Staff placing an order on a customer's behalf — phone orders, in-person
  // sales, etc. Same pricing/stock rules as a real checkout (priceItemList),
  // just sourced from an explicit item list instead of that customer's own
  // Cart, and with no payment gateway step (COD, or mark-as-paid for cash
  // already collected).
  async orderCreateManual(req, res, next) {
    const { userId, items, shippingAddress, paymentMethod = 'cod', couponCode, markAsPaid, shippingMethod = 'standard' } = req.body;
    if (!userId) throw new ApiError(400, 'Customer is required');
    if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'At least one item is required');
    if (!shippingAddress?.fullName || !shippingAddress?.addressLine1 || !shippingAddress?.city ||
        !shippingAddress?.postalCode || !shippingAddress?.phone) {
      throw new ApiError(400, 'Shipping address (name, address, city, postal code, phone) is required');
    }
    if (!['cod', 'card'].includes(paymentMethod)) throw new ApiError(400, 'Invalid payment method');

    const customer = await User.findOne({ _id: userId, role: 'customer' });
    if (!customer) throw new ApiError(404, 'Customer not found');

    const { orderItems, subtotal, tax, couponData, shippingFee, total } = await priceItemList(items, couponCode, shippingMethod);
    if (couponData) {
      await Coupon.updateOne({ code: couponData.code }, { $inc: { usedCount: 1 } });
    }

    const decremented = [];
    for (const item of orderItems) {
      const ok = await decrementStock(item.product, item.variant.sku, item.quantity);
      if (!ok) {
        await restoreStock(decremented);
        throw new ApiError(409, `"${item.name}" went out of stock while placing the order.`);
      }
      decremented.push(item);
    }

    const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const order = await Order.create({
      user: customer._id,
      orderNumber,
      items: orderItems,
      subtotal,
      tax,
      shippingFee,
      shippingMethod,
      total,
      coupon: couponData,
      shippingAddress,
      paymentMethod,
      paymentStatus: markAsPaid ? 'completed' : 'pending',
      orderStatus: 'processing',
    });

    logAudit({
      actor: req.user, action: 'order.manual_create', entityType: 'Order', entityId: order._id,
      summary: `Manually created order ${orderNumber} for ${customer.email}`,
    });
    sendEmail({ to: customer.email, ...orderConfirmationEmail(order) });

    res.locals.responseData = { success: true, message: 'Order created', data: order };
    next();
  }

  async orderDetail(req, res, next) {
    const { id, orderNumber } = req.body;
    if (!id && !orderNumber) throw new ApiError(400, 'Order ID or Order Number required');

    const query = id ? { _id: id } : { orderNumber };
    if (!['superadmin', 'admin', 'fulfillment'].includes(req.user.role)) {
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

  // Streams a PDF invoice — bypasses the responsedata JSON wrapper since the
  // response body here is binary, not { success, data }.
  async orderInvoice(req, res) {
    const { id, orderNumber } = req.body;
    if (!id && !orderNumber) throw new ApiError(400, 'Order ID or Order Number required');

    const query = id ? { _id: id } : { orderNumber };
    if (!['superadmin', 'admin', 'fulfillment'].includes(req.user.role)) {
      query.user = req.user.id;
    }

    const order = await Order.findOne(query).populate('user', 'name email');
    if (!order) throw new ApiError(404, 'Order not found');

    const pdf = await generateInvoicePdf(order);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
    res.send(pdf);
  }

  async orderUpdate(req, res, next) {
    const { id, orderStatus, paymentStatus, shipment } = req.body;
    if (!id) throw new ApiError(400, 'Order ID is required');

    const order = await Order.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');

    const patch = {};
    if (shipment) {
      patch.shipment = { courier: shipment.courier || '', awbNumber: shipment.awbNumber || '', trackingUrl: shipment.trackingUrl || '' };
    }
    if (orderStatus) {
      patch.orderStatus = orderStatus;
      if (orderStatus === 'delivered' && order.orderStatus !== 'delivered') {
        patch.deliveredAt = new Date();
        if (order.paymentMethod === 'cod') patch.paymentStatus = 'completed';
      }
      // Cancelling puts reserved stock back on the shelf.
      if (orderStatus === 'cancelled' && order.orderStatus !== 'cancelled') {
        await restoreStock(order.items);
        if (order.paymentStatus === 'completed') {
          patch.paymentStatus = 'refunded';
          await refundOrderPayment(order);
        }
      }
    }
    if (paymentStatus) patch.paymentStatus = paymentStatus;

    const updated = await Order.findByIdAndUpdate(id, patch, { new: true });

    logAudit({
      actor: req.user, action: 'order.update', entityType: 'Order', entityId: id,
      summary: `Updated order ${order.orderNumber}: ${Object.entries(patch).map(([k, v]) => `${k} → ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')}`,
      before: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus },
      after: patch,
    });

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
    const wasPaid = order.paymentStatus === 'completed';
    if (wasPaid) order.paymentStatus = 'refunded';
    await order.save();
    if (wasPaid) await refundOrderPayment(order);

    res.locals.responseData = { success: true, message: 'Order cancelled', data: order };
    next();
  }

  // Customer requests a return/exchange within 7 days of delivery.
  async returnRequest(req, res, next) {
    const { id, type = 'return', reason, desiredSku, photos } = req.body;
    if (!id) throw new ApiError(400, 'Order ID is required');
    if (!['return', 'exchange'].includes(type)) throw new ApiError(400, 'Invalid request type');
    if (!reason || reason.trim().length < 5) throw new ApiError(400, 'Please provide a reason (min 5 characters)');
    if (photos !== undefined && (!Array.isArray(photos) || photos.length > 5 || photos.some((p) => typeof p !== 'string'))) {
      throw new ApiError(400, 'Photos must be an array of up to 5 image URLs');
    }

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

    let desiredVariant;
    if (type === 'exchange') {
      // Which item to swap is ambiguous on a multi-item order, so exchanges
      // (as opposed to plain returns) are only offered for single-item orders.
      if (order.items.length !== 1) {
        throw new ApiError(400, 'Exchanges are only available for orders with a single item — please request a return instead, or contact support');
      }
      if (!desiredSku) throw new ApiError(400, 'Please choose the size/colour you want in exchange');
      const originalItem = order.items[0];
      const product = await Product.findById(originalItem.product, 'variants');
      const variant = product?.variants.find((v) => v.sku === desiredSku);
      if (!variant) throw new ApiError(400, 'That option is no longer available for exchange');
      if (variant.sku === originalItem.variant.sku) throw new ApiError(400, 'Please choose a different size/colour than what you already have');
      if (variant.stock < originalItem.quantity) throw new ApiError(400, 'That option is currently out of stock');
      desiredVariant = { colour: variant.colour, size: variant.size, fit: variant.fit, sku: variant.sku };
    }

    order.returnRequest = { status: 'requested', type, reason: reason.trim(), photos: photos || [], requestedAt: new Date(), desiredVariant };
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
    let replacementOrder;
    if (status === 'completed') {
      order.returnRequest.resolvedAt = new Date();
      if (order.returnRequest.type === 'return') {
        await restoreStock(order.items);
        if (order.paymentStatus === 'completed') {
          order.paymentStatus = 'refunded';
          await refundOrderPayment(order);
        }
      } else {
        // Exchange: swap stock (restore the returned variant, take the
        // replacement variant), then create a new $0 order carrying the
        // replacement item — already paid for via the original order.
        const originalItem = order.items[0];
        const desired = order.returnRequest.desiredVariant;
        const decremented = await decrementStock(originalItem.product, desired.sku, originalItem.quantity);
        if (!decremented) {
          throw new ApiError(409, 'The requested exchange option just went out of stock — reject or ask the customer to pick a different option');
        }
        await restoreStock(order.items);

        // No additional charge — the item's price is carried over for a normal-
        // looking invoice, but payment was already collected on the original
        // order, so there's nothing new to pay (no separate price-difference
        // handling if the replacement variant happens to be priced differently
        // — a known simplification, see understand.md).
        const exchangeSubtotal = originalItem.price * originalItem.quantity;
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        replacementOrder = await Order.create({
          user: order.user,
          orderNumber,
          items: [{ product: originalItem.product, name: originalItem.name, variant: desired, quantity: originalItem.quantity, price: originalItem.price }],
          subtotal: exchangeSubtotal,
          tax: 0,
          shippingFee: 0,
          total: exchangeSubtotal,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          paymentStatus: 'completed',
          orderStatus: 'processing',
          exchangedFromOrder: order._id,
        });
        order.exchangeReplacementOrder = replacementOrder._id;
      }
    }
    if (status === 'rejected') order.returnRequest.resolvedAt = new Date();
    await order.save();

    logAudit({
      actor: req.user, action: `return.${status}`, entityType: 'Order', entityId: id,
      summary: `${order.returnRequest.type === 'exchange' ? 'Exchange' : 'Return'} request ${status} for order ${order.orderNumber}`
        + (replacementOrder ? ` — replacement order ${replacementOrder.orderNumber} created` : ''),
    });

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

    // Best-sellers by revenue, all time (excludes cancelled orders).
    const topProducts = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    // Daily revenue for the last 14 days — a lightweight in-house bar chart,
    // no charting library needed for something this simple.
    // Everything here is done in UTC deliberately: $dateToString below groups
    // in UTC by default, so building the day keys with local-time Date
    // methods (setDate/setHours) would drift by a day on any server not
    // running in UTC (e.g. IST) once toISOString() converts back — a real
    // bug caught by testing this against a server actually running in IST.
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 13);
    since.setUTCHours(0, 0, 0, 0);
    const dailyAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
      } },
    ]);
    const dailyByDate = new Map(dailyAgg.map((d) => [d._id, d.revenue]));
    const salesByDay = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      salesByDay.push({ date: key, revenue: dailyByDate.get(key) || 0 });
    }

    res.locals.responseData = {
      success: true,
      data: {
        revenue: revenueAgg?.revenue || 0,
        orders: revenueAgg?.orders || 0,
        processing,
        pendingReturns,
        lowStock,
        topProducts,
        salesByDay,
      },
    };
    next();
  }
}

export default OrderController;
