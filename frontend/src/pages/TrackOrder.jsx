import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../utils/api';
import { inr } from '../utils/format';
import useTitle from '../utils/useTitle';
import { OrderTimeline } from './Account';

const inputClass =
  'w-full border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink';

// Guest order tracking — no account needed. Verifies with the order number +
// the phone number on the shipping address, so it can't be used to look up
// someone else's order just by guessing/incrementing order numbers.
export default function TrackOrder() {
  useTitle('Track Your Order');
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await api.post('/order/track', { orderNumber: orderNumber.trim(), phone: phone.trim() });
      setOrder(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not find that order');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] bg-cream font-body text-ink">
      <div className="mx-auto max-w-xl px-6 py-16 md:px-10">
        <h1 className="mb-2 font-heading text-3xl italic text-ink">Track Your Order</h1>
        <p className="mb-8 text-sm text-mauve-dark">
          Enter your order number and the phone number used at checkout — no account needed.
        </p>

        <form onSubmit={submit} className="mb-8 space-y-4 border border-beige bg-white p-6">
          <div>
            <label className={labelClass}>Order Number</label>
            <input
              required
              placeholder="e.g. NS-100234"
              className={inputClass}
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input
              required
              placeholder="The phone number on the delivery address"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 bg-ink py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            <Search size={14} /> {loading ? 'Looking up...' : 'Track Order'}
          </button>
        </form>

        {order && (
          <div className="border border-beige bg-white p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{order.orderNumber}</p>
                <p className="text-xs text-mauve">
                  {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item{order.items.length === 1 ? '' : 's'} · {inr(order.total)}
                </p>
                {order.returnRequest?.status && order.returnRequest.status !== 'none' && (
                  <span className="mt-1.5 inline-block bg-beige px-3 py-1 text-[11px] capitalize text-ink">
                    {order.returnRequest.type}: {order.returnRequest.status}
                  </span>
                )}
              </div>
              <OrderTimeline status={order.orderStatus} />
            </div>
            <div className="space-y-1 border-t border-beige/60 pt-3 text-sm text-mauve-dark">
              {order.items.map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{i.name} × {i.quantity}</span>
                  <span>{inr(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-beige/60 pt-3 text-xs text-mauve">
              Shipping to {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-mauve-dark">
          Want to cancel an order or request a return?{' '}
          <Link to="/login" className="font-semibold text-ink underline underline-offset-4">Sign in</Link> to manage it from My Account.
        </p>
      </div>
    </div>
  );
}
