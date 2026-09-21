import cron from 'node-cron';
import Cart from '../schema/Cart.js';
import { sendEmail, abandonedCartEmail } from '../utils/email.js';

const ABANDONED_AFTER_MS = (Number(process.env.ABANDONED_CART_HOURS) || 2) * 60 * 60 * 1000;

// A cart counts as abandoned once it's held items, untouched, past the
// threshold. Checkout empties the cart (order.js orderCreate), so a non-empty
// cart past the threshold reliably means the user didn't complete the order —
// no separate "did they check out" check needed.
export async function sendAbandonedCartEmails() {
  const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS);
  const carts = await Cart.find({
    'items.0': { $exists: true },
    updatedAt: { $lte: cutoff },
    $expr: { $or: [{ $eq: ['$abandonedEmailSentAt', null] }, { $lt: ['$abandonedEmailSentAt', '$updatedAt'] }] },
  }).populate('user', 'name email').populate('items.product', 'name');

  let sent = 0;
  for (const cart of carts) {
    if (!cart.user?.email) continue; // cart's user was deleted after the cart was created
    await sendEmail({ to: cart.user.email, ...abandonedCartEmail(cart) });
    // Plain .save() would also bump `updatedAt` (schema has timestamps:true),
    // landing it a few ms after the abandonedEmailSentAt set in the same
    // statement — which would make the cart look "changed since last email"
    // on every future run and resend forever. { timestamps: false } writes
    // only the one field, leaving updatedAt as the real last-edit time.
    await Cart.updateOne({ _id: cart._id }, { $set: { abandonedEmailSentAt: new Date() } }, { timestamps: false });
    sent += 1;
  }

  return sent;
}

export function startAbandonedCartJob() {
  // Every 30 minutes — frequent enough that carts aren't sitting past the
  // threshold for long, cheap enough (single indexed-ish query) to not matter.
  cron.schedule('*/30 * * * *', () => {
    sendAbandonedCartEmails().catch((err) => console.error('Abandoned cart job failed:', err.message));
  });
}
