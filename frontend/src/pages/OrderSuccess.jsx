import { Link, useLocation, useParams } from 'react-router-dom';
import { CircleCheck, Download } from 'lucide-react';
import { downloadInvoice } from '../utils/invoice';
import useStore from '../store/useStore';

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const order = state?.order;
  const toast = useStore((s) => s.toast);

  return (
    <div className="flex min-h-[65vh] items-center justify-center bg-cream px-6 py-16 font-body">
      <div className="w-full max-w-lg text-center">
        <CircleCheck
          size={52}
          strokeWidth={1}
          className="mx-auto mb-6 text-pastel-green"
        />
        <h1 className="mb-3 font-heading text-3xl italic text-ink">
          Thank you for your order!
        </h1>
        <p className="mb-1 text-sm text-mauve-dark">
          Order <span className="font-semibold text-ink">{orderNumber}</span>{' '}
          has been placed.
        </p>
        <p className="mb-8 text-sm text-mauve-dark">
          A confirmation email is on its way.{' '}
          {order?.paymentMethod === 'cod'
            ? 'Please keep the amount ready at delivery.'
            : ''}
        </p>

        {order && (
          <div className="mb-8 border border-beige bg-white p-6 text-left text-sm">
            {order.items.map((i, idx) => (
              <div
                key={idx}
                className="flex justify-between border-b border-beige/60 py-2"
              >
                <span className="text-ink">
                  {i.name} × {i.quantity}
                </span>
                <span className="font-medium text-ink">
                  ₹{i.price * i.quantity}
                </span>
              </div>
            ))}
            <div className="space-y-1.5 pt-3 text-mauve-dark">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              {order.coupon?.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount ({order.coupon.code})</span>
                  <span>−₹{order.coupon.discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax</span>
                <span>₹{order.tax}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {order.shippingFee === 0 ? 'Free' : `₹${order.shippingFee}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-beige pt-2 font-bold text-ink">
                <span>Total</span>
                <span>₹{order.total}</span>
              </div>
            </div>
          </div>
        )}

        {order && (
          <button
            onClick={async () => {
              try {
                await downloadInvoice(order);
              } catch {
                toast('Could not download invoice', 'error');
              }
            }}
            className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-mauve-dark underline underline-offset-4 hover:text-ink"
          >
            <Download size={13} /> Download Invoice
          </button>
        )}

        <div className="flex justify-center gap-4">
          <Link
            to="/account"
            className="border border-ink px-7 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-all hover:bg-ink hover:text-cream"
          >
            My Orders
          </Link>
          <Link
            to="/collection"
            className="bg-ink px-7 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
