import { useEffect, useState, useCallback } from 'react';
import { Eye, X, ImageOff } from 'lucide-react';
import api, { resolveImageUrl } from '../../utils/api';
import useEscapeToClose from '../../utils/useEscapeToClose';
import useStore from '../../store/useStore';

const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

const STATUS_STYLES = {
  processing: 'bg-baby-pink',
  shipped: 'bg-beige',
  delivered: 'bg-pastel-green',
  cancelled: 'bg-blush',
  pending: 'bg-baby-pink',
  completed: 'bg-pastel-green',
  failed: 'bg-blush',
  refunded: 'bg-beige',
};

function StatusSelect({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-[11px] capitalize text-ink outline-none ${STATUS_STYLES[value] || 'bg-beige'}`}
    >
      {options.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const toast = useStore((s) => s.toast);

  useEscapeToClose(!!detail, () => setDetail(null));

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/order/list', { page: 1, limit: 100, ...(filter && { status: filter }) });
      setOrders(res.data.data.docs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const resolveReturn = async (id, status) => {
    try {
      const res = await api.post('/order/return-update', { id, status });
      setDetail(res.data.data);
      fetchOrders();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update return request', 'error');
    }
  };

  const updateOrder = async (id, patch) => {
    const prev = orders;
    setOrders((os) => os.map((o) => (o._id === id ? { ...o, ...patch } : o)));
    try {
      const order = orders.find((o) => o._id === id);
      await api.post('/order/update', {
        id,
        orderStatus: patch.orderStatus ?? order.orderStatus,
        paymentStatus: patch.paymentStatus ?? order.paymentStatus,
      });
    } catch (err) {
      setOrders(prev);
      toast(err.response?.data?.message || 'Failed to update order', 'error');
    }
  };

  return (
    <div className="rounded-2xl border border-beige bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl italic text-ink">Orders</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('')}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${!filter ? 'border-ink bg-ink text-cream' : 'border-beige text-ink'}`}
          >
            All
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition-all ${filter === s ? 'border-ink bg-ink text-cream' : 'border-beige text-ink'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              <th className="py-2.5 pr-3">Order #</th>
              <th className="py-2.5 pr-3">Item</th>
              <th className="py-2.5 pr-3">Customer</th>
              <th className="py-2.5 pr-3">Total</th>
              <th className="py-2.5 pr-3">Payment</th>
              <th className="py-2.5 pr-3">Status</th>
              <th className="py-2.5 pr-3">Date</th>
              <th className="py-2.5 text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-mauve">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-mauve">No orders found.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id} className="border-b border-beige/60 transition-colors hover:bg-cream/50">
                  <td className="py-3 pr-3">
                    <span className="font-medium text-ink">{o.orderNumber}</span>
                    {o.returnRequest?.status === 'requested' && (
                      <span className="ml-2 rounded-full bg-blush px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-ink">
                        {o.returnRequest.type}!
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      {o.items?.[0]?.product?.thumbnail ? (
                        <img
                          src={resolveImageUrl(o.items[0].product.thumbnail)}
                          alt=""
                          className="h-11 w-9 flex-shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-cream">
                          <ImageOff size={14} className="text-mauve" />
                        </div>
                      )}
                      <div className="max-w-[140px]">
                        <p className="truncate text-[13px] text-ink">{o.items?.[0]?.name || '—'}</p>
                        {o.items?.length > 1 && (
                          <p className="text-[11px] text-mauve">+{o.items.length - 1} more</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-mauve-dark">
                    {o.user?.name || '—'}
                    <span className="block text-[11px] text-mauve">{o.user?.email}</span>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-ink">₹{o.total}</td>
                  <td className="py-3 pr-3">
                    <StatusSelect
                      value={o.paymentStatus}
                      options={PAYMENT_STATUSES}
                      onChange={(v) => updateOrder(o._id, { paymentStatus: v })}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <StatusSelect
                      value={o.orderStatus}
                      options={ORDER_STATUSES}
                      onChange={(v) => updateOrder(o._id, { orderStatus: v })}
                    />
                  </td>
                  <td className="py-3 pr-3 text-mauve-dark">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="py-3">
                    <div className="flex justify-end">
                      <button onClick={() => setDetail(o)} className="rounded-lg p-2 text-ink transition-colors hover:bg-beige/60" aria-label="View order">
                        <Eye size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-xl italic text-ink">{detail.orderNumber}</h3>
                <p className="text-xs text-mauve">{new Date(detail.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-mauve hover:text-ink" aria-label="Close">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-cream p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve">Customer</p>
                <p className="font-medium text-ink">{detail.user?.name || '—'}</p>
                <p className="text-mauve-dark">{detail.user?.email}</p>
              </div>
              <div className="rounded-xl bg-cream p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve">Shipping Address</p>
                {detail.shippingAddress?.fullName ? (
                  <>
                    <p className="font-medium text-ink">{detail.shippingAddress.fullName}</p>
                    <p className="text-mauve-dark">
                      {[detail.shippingAddress.addressLine1, detail.shippingAddress.city, detail.shippingAddress.state, detail.shippingAddress.postalCode]
                        .filter(Boolean).join(', ')}
                    </p>
                    <p className="text-mauve-dark">{detail.shippingAddress.phone}</p>
                  </>
                ) : (
                  <p className="text-mauve">Not provided</p>
                )}
              </div>
            </div>

            <table className="mb-5 w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {(detail.items || []).map((it, i) => (
                  <tr key={i} className="border-b border-beige/60">
                    <td className="py-2.5 pr-3 text-ink">{it.name}</td>
                    <td className="py-2.5 pr-3 text-mauve-dark">{it.variant?.sku || '—'}</td>
                    <td className="py-2.5 pr-3 text-mauve-dark">{it.quantity}</td>
                    <td className="py-2.5 text-right font-medium text-ink">₹{it.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto w-56 space-y-1.5 text-sm">
              <div className="flex justify-between text-mauve-dark"><span>Subtotal</span><span>₹{detail.subtotal}</span></div>
              {detail.coupon?.discount > 0 && (
                <div className="flex justify-between text-mauve-dark"><span>Discount ({detail.coupon.code})</span><span>−₹{detail.coupon.discount}</span></div>
              )}
              <div className="flex justify-between text-mauve-dark"><span>Tax</span><span>₹{detail.tax}</span></div>
              <div className="flex justify-between text-mauve-dark"><span>Shipping</span><span>₹{detail.shippingFee}</span></div>
              <div className="flex justify-between border-t border-beige pt-1.5 font-bold text-ink"><span>Total</span><span>₹{detail.total}</span></div>
            </div>

            {/* Return / exchange handling */}
            {detail.returnRequest?.status && detail.returnRequest.status !== 'none' && (
              <div className="mt-6 rounded-xl bg-cream p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve">
                  {detail.returnRequest.type} request — <span className="capitalize text-ink">{detail.returnRequest.status}</span>
                </p>
                <p className="mb-3 text-sm text-mauve-dark">“{detail.returnRequest.reason}”</p>
                {['requested', 'approved'].includes(detail.returnRequest.status) && (
                  <div className="flex gap-2">
                    {detail.returnRequest.status === 'requested' && (
                      <>
                        <button
                          onClick={() => resolveReturn(detail._id, 'approved')}
                          className="rounded-full bg-pastel-green px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => resolveReturn(detail._id, 'rejected')}
                          className="rounded-full bg-blush px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {detail.returnRequest.status === 'approved' && (
                      <button
                        onClick={() => resolveReturn(detail._id, 'completed')}
                        className="rounded-full bg-ink px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-cream"
                      >
                        Mark Completed (restocks items{detail.returnRequest.type === 'return' ? ' + refund' : ''})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
