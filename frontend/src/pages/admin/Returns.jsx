import { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import api from '../../utils/api';
import useEscapeToClose from '../../utils/useEscapeToClose';
import OrderDetailModal from '../../components/admin/OrderDetailModal';

const FILTERS = [
  { value: 'requested', label: 'Needs Action' },
  { value: 'approved', label: 'Approved (awaiting completion)' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'any', label: 'All' },
];

const STATUS_STYLES = {
  requested: 'bg-blush',
  approved: 'bg-baby-pink',
  completed: 'bg-pastel-green',
  rejected: 'bg-beige',
};

export default function Returns() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('requested');
  const [detail, setDetail] = useState(null);

  useEscapeToClose(!!detail, () => setDetail(null));

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/order/list', { page: 1, limit: 100, returnStatus: filter });
      setOrders(res.data.data.docs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load return requests');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  return (
    <div className="rounded-2xl border border-beige bg-white p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl italic text-ink">Returns &amp; Exchanges</h2>
          <p className="mt-1 text-sm text-mauve-dark">Every order with an active return or exchange request, in one place</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${filter === f.value ? 'border-ink bg-ink text-cream' : 'border-beige text-ink'}`}
            >
              {f.label}
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
              <th className="py-2.5 pr-3">Customer</th>
              <th className="py-2.5 pr-3">Type</th>
              <th className="py-2.5 pr-3">Reason</th>
              <th className="py-2.5 pr-3">Requested</th>
              <th className="py-2.5 pr-3">Status</th>
              <th className="py-2.5 text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-mauve">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-mauve">Nothing here.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id} className="border-b border-beige/60 transition-colors hover:bg-cream/50">
                  <td className="py-3 pr-3 font-medium text-ink">{o.orderNumber}</td>
                  <td className="py-3 pr-3 text-mauve-dark">
                    {o.user?.name || '—'}
                    <span className="block text-[11px] text-mauve">{o.user?.email}</span>
                  </td>
                  <td className="py-3 pr-3 capitalize text-ink">{o.returnRequest?.type}</td>
                  <td className="max-w-[220px] truncate py-3 pr-3 text-mauve-dark" title={o.returnRequest?.reason}>
                    {o.returnRequest?.reason}
                  </td>
                  <td className="py-3 pr-3 text-mauve-dark">
                    {o.returnRequest?.requestedAt ? new Date(o.returnRequest.requestedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] capitalize text-ink ${STATUS_STYLES[o.returnRequest?.status] || 'bg-beige'}`}>
                      {o.returnRequest?.status}
                    </span>
                  </td>
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
            fetchReturns();
          }}
        />
      )}
    </div>
  );
}
