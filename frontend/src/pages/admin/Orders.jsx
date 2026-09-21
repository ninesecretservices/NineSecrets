import { useEffect, useState, useCallback } from 'react';
import { Eye, ImageOff, Plus } from 'lucide-react';
import api, { resolveImageUrl } from '../../utils/api';
import useStore from '../../store/useStore';
import useEscapeToClose from '../../utils/useEscapeToClose';
import Select from '../../components/admin/Select';
import OrderDetailModal from '../../components/admin/OrderDetailModal';
import ManualOrderModal from '../../components/admin/ManualOrderModal';

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
    <Select
      value={value}
      onChange={onChange}
      options={options.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
      className="w-auto min-w-[130px]"
      triggerClassName={`flex cursor-pointer items-center justify-between gap-1.5 rounded-full border-0 px-2.5 py-1 text-left text-[11px] text-ink outline-none ${STATUS_STYLES[value] || 'bg-beige'}`}
    />
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [showManualOrder, setShowManualOrder] = useState(false);
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl italic text-ink">Orders</h2>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={() => setShowManualOrder(true)}
            className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-cream transition-opacity hover:opacity-85"
          >
            <Plus size={14} /> New Order
          </button>
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

      {detail && (
        <OrderDetailModal
          order={detail}
          onClose={() => setDetail(null)}
          onResolved={(updated) => {
            setDetail(updated);
            fetchOrders();
          }}
        />
      )}

      {showManualOrder && (
        <ManualOrderModal
          onClose={() => setShowManualOrder(false)}
          onCreated={() => {
            setShowManualOrder(false);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}
