import crypto from 'crypto';
import Razorpay from 'razorpay';
import ApiError from './ApiError.js';

// Keys pasted into a hosting dashboard often pick up a trailing space or
// newline, which makes Razorpay reject them as invalid — trim defensively.
const KEY_ID = (process.env.RAZORPAY_KEY_ID || '').trim();
const KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || '').trim();

export const razorpayConfigured = !!(KEY_ID && KEY_SECRET);
export const razorpayKeyId = KEY_ID;

const client = razorpayConfigured ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET }) : null;

// amount is in rupees (whole units, matching the rest of the app); Razorpay's
// API wants paise.
export const createRazorpayOrder = async (amount, receipt) => {
  try {
    return await client.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt });
  } catch (err) {
    // The SDK throws { statusCode, error: { code, description } } — log the
    // real reason (e.g. 401 "Authentication failed" = wrong key/secret) instead
    // of letting it surface as an anonymous 500.
    console.error('[razorpay] order creation failed:', err.statusCode, err.error?.code, err.error?.description || err.message);
    throw new ApiError(502, 'Could not start online payment right now. Please try again, or choose Cash on Delivery.');
  }
};

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
    .createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
};
