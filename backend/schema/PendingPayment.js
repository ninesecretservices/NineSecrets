import mongoose from 'mongoose';

// Snapshot of what's needed to create an Order, taken the moment a Razorpay
// order is opened (before the widget even shows) — not when checkout
// finishes. Exists so a payment.captured webhook can still create the order
// if the customer paid but their browser closed before the normal
// POST /order/create call ever reached us (the gap that leaves Razorpay
// holding a captured payment with nothing on our side to show for it).
//
// Deleted once the matching order is created, by whichever path gets there
// first (the normal flow or the webhook). The TTL index below cleans up the
// rest — abandoned/failed payments that never convert — after 24 hours.
const pendingPaymentSchema = new mongoose.Schema({
  razorpayOrderId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shippingAddress: {
    fullName: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    phone: { type: String },
  },
  shippingMethod: { type: String, enum: ['standard', 'express'], default: 'standard' },
  couponCode: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

export default mongoose.model('PendingPayment', pendingPaymentSchema);
