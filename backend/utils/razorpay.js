import crypto from 'crypto';
import Razorpay from 'razorpay';

export const razorpayConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const client = razorpayConfigured
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

// amount is in rupees (whole units, matching the rest of the app); Razorpay's
// API wants paise.
export const createRazorpayOrder = (amount, receipt) =>
  client.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt });

// Full refund of a captured payment. Returns the Razorpay refund object, or
// null if Razorpay isn't configured or the order wasn't actually paid via it
// (e.g. COD) — callers should still mark paymentStatus 'refunded' either way
// since COD "refunds" are a manual/offline process this app can't automate.
export const refundRazorpayPayment = async (paymentId) => {
  if (!razorpayConfigured || !paymentId) return null;
  return client.payments.refund(paymentId);
};

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  if (!razorpayConfigured) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
};
