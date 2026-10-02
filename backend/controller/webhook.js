import Order from '../schema/Order.js';
import PendingPayment from '../schema/PendingPayment.js';
import User from '../schema/User.js';
import { verifyWebhookSignature, refundRazorpayPayment } from '../utils/razorpay.js';
import { finalizeCardOrder } from './order.js';

// Safety net for the one gap a client-driven checkout can't close on its own:
// a customer pays successfully, then closes the tab (or loses connection)
// before our own POST /order/create call ever lands — Razorpay has captured
// real money and we have no order to show for it. Razorpay calls this URL
// directly (not through a logged-in session), configured on their dashboard
// under Settings -> Webhooks, pointed at /api/webhooks/razorpay with its own
// secret (RAZORPAY_WEBHOOK_SECRET — not the API key secret).
//
// Mounted in index.js with express.raw() instead of the app-wide express.json(),
// since the signature is computed over the exact raw bytes Razorpay sent.
export async function razorpayWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body; // Buffer

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('[razorpay webhook] rejected: invalid or missing signature');
    return res.status(400).json({ success: false });
  }

  const event = JSON.parse(rawBody.toString('utf8'));

  if (event.event === 'payment.captured') {
    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;

    if (razorpayOrderId) {
      const existing = await Order.findOne({ 'razorpay.orderId': razorpayOrderId });
      if (!existing) {
        const pending = await PendingPayment.findOne({ razorpayOrderId });
        const user = pending && await User.findById(pending.user);

        if (pending && user) {
          try {
            await finalizeCardOrder({
              userId: pending.user,
              userEmail: user.email,
              shippingAddress: pending.shippingAddress,
              shippingMethod: pending.shippingMethod,
              couponCode: pending.couponCode,
              razorpayOrderId,
              razorpayPaymentId: payment.id,
            });
            await PendingPayment.deleteOne({ razorpayOrderId });
            console.log(`[razorpay webhook] recovered order for ${razorpayOrderId} — the normal checkout call never arrived.`);
          } catch (err) {
            // Most likely cause: the item sold out in the gap between payment
            // and this webhook. There's no order to fulfill, so refund rather
            // than silently keep money for nothing.
            console.error(`[razorpay webhook] could not finalize order for ${razorpayOrderId}: ${err.message} — issuing a refund.`);
            await refundRazorpayPayment(payment.id).catch((refundErr) => {
              console.error(`[razorpay webhook] REFUND ALSO FAILED for payment ${payment.id} — needs manual refund in the Razorpay dashboard:`, refundErr.message);
            });
            await PendingPayment.deleteOne({ razorpayOrderId });
          }
        } else {
          // No order AND no pending-payment record — we have no shipping
          // address or user to recover this with. Logged for manual
          // reconciliation in the Razorpay dashboard; a retry won't help,
          // since the missing data isn't coming back.
          console.error(`[razorpay webhook] payment.captured for order ${razorpayOrderId} (payment ${payment.id}) has no matching order or pending-payment record — needs manual reconciliation.`);
        }
      }
      // else: the normal checkout flow already created this order — nothing to do.
    }
  }
  // payment.failed and anything else: nothing to reconcile. An abandoned
  // PendingPayment record simply expires on its own (TTL index).

  res.status(200).json({ success: true });
}
