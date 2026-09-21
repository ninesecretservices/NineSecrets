import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  variant: {
    colour: { type: mongoose.Schema.Types.ObjectId, ref: 'Colour' },
    size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size' },
    fit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fit' },
    sku: { type: String }
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, required: true, unique: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  shippingMethod: { type: String, enum: ['standard', 'express'], default: 'standard' },
  total: { type: Number, required: true },
  shippingAddress: {
    fullName: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    phone: { type: String }
  },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  orderStatus: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
  paymentMethod: { type: String, enum: ['card', 'cod'], default: 'cod' },
  razorpay: {
    orderId: { type: String },
    paymentId: { type: String }
  },
  deliveredAt: { type: Date },
  coupon: {
    code: { type: String },
    discount: { type: Number, default: 0 }
  },
  // Manual entry only — no live courier-API integration, just a number + carrier
  // name + optional link an admin types in so it can be shown to the customer.
  shipment: {
    courier: { type: String },
    awbNumber: { type: String },
    trackingUrl: { type: String }
  },
  returnRequest: {
    status: { type: String, enum: ['none', 'requested', 'approved', 'rejected', 'completed'], default: 'none' },
    type: { type: String, enum: ['return', 'exchange'] },
    reason: { type: String },
    photos: [{ type: String }],
    // Only set for type 'exchange' — the variant the customer wants instead.
    // Exchanges are only supported for single-item orders (see returnRequest
    // controller) to avoid the ambiguity of "which item" on a multi-item order.
    desiredVariant: {
      colour: { type: mongoose.Schema.Types.ObjectId, ref: 'Colour' },
      size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size' },
      fit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fit' },
      sku: { type: String }
    },
    requestedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  // Set on the ORIGINAL order once its exchange is fulfilled, pointing at the
  // new order created for the replacement item.
  exchangeReplacementOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  // Set on the NEW replacement order, pointing back at the original.
  exchangedFromOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
