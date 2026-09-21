import { useCallback, useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import api from '../../utils/api';
import { inr } from '../../utils/format';
import useStore from '../../store/useStore';
import useEscapeToClose from '../../utils/useEscapeToClose';
import Select from '../../components/admin/Select';

function CustomerDetail({ customer, onClose, onUpdated }) {
  const toast = useStore((s) => s.toast);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [notes, setNotes] = useState(customer.notes || '');
  const [tagsInput, setTagsInput] = useState((customer.tags || []).join(', '));
  const [isActive, setIsActive] = useState(customer.isActive !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.post('/order/list', { page: 1, limit: 20, userId: customer._id });
        setOrders(res.data.data.docs || []);
      } catch {
        setOrders([]);
      }
      setLoadingOrders(false);
    })();
  }, [customer._id]);

  const save = async () => {
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await api.post('/customer/update', { id: customer._id, notes, tags, isActive });
      onUpdated(res.data.data);
      toast('Customer updated');
    } catch (err) {
      toast(err.response?.data?.message || 'Update failed', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-xl italic text-ink">{customer.name}</h3>
            <p className="text-xs text-mauve">{customer.email}</p>
          </div>
          <button onClick={onClose} className="text-mauve hover:text-ink" aria-label="Close">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-cream p-4 text-center">
            <p className="text-2xl font-bold text-ink">{customer.orderCount ?? 0}</p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-mauve">Orders</p>
          </div>
          <div className="rounded-xl bg-cream p-4 text-center">
            <p className="text-2xl font-bold text-ink">{inr(customer.ltv || 0)}</p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-mauve">Lifetime Value</p>
          </div>
          <div className="rounded-xl bg-cream p-4 text-center">
            <p className="text-2xl font-bold text-ink">{new Date(customer.createdAt).toLocaleDateString()}</p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-mauve">Joined</p>
          </div>
        </div>

        <div className="mb-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Status</label>
            <Select
              value={isActive}
              onChange={setIsActive}
              options={[{ value: true, label: 'Active' }, { value: false, label: 'Blocked (cannot log in)' }]}
              className="w-56"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Tags (comma-separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="VIP, wholesale, frequent-returner..."
              className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Internal Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Never shown to the customer — for staff reference only."
              className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve">Order History</p>
          {loadingOrders ? (
            <p className="py-4 text-center text-sm text-mauve">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-mauve">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o._id} className="flex items-center justify-between rounded-lg bg-cream p-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{o.orderNumber}</p>
                    <p className="text-[11px] text-mauve">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{inr(o.total)}</p>
                    <p className="text-[11px] capitalize text-mauve">{o.orderStatus}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEscapeToClose(!!selected, () => setSelected(null));

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/customer/list', { page: 1, limit: 100, search });
      setCustomers(res.data.data.docs || []);
      setTotal(res.data.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300); // debounce search
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  return (
    <div className="rounded-2xl border border-beige bg-white p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl italic text-ink">Customers</h2>
          <p className="mt-1 text-sm text-mauve-dark">{total} registered {total === 1 ? 'customer' : 'customers'}</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-64 rounded-full border border-beige py-2 pl-9 pr-4 text-sm text-ink outline-none focus:border-ink"
          />
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              <th className="py-2.5 pr-3">Name</th>
              <th className="py-2.5 pr-3">Email</th>
              <th className="py-2.5 pr-3">Orders</th>
              <th className="py-2.5 pr-3">LTV</th>
              <th className="py-2.5 pr-3">Tags</th>
              <th className="py-2.5 pr-3">Status</th>
              <th className="py-2.5 pr-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-mauve">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-mauve">No customers found.</td></tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c._id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-b border-beige/60 transition-colors hover:bg-cream/50"
                >
                  <td className="py-3 pr-3 font-medium text-ink">{c.name}</td>
                  <td className="py-3 pr-3 text-mauve-dark">{c.email}</td>
                  <td className="py-3 pr-3 text-ink">{c.orderCount}</td>
                  <td className="py-3 pr-3 font-semibold text-ink">{inr(c.ltv || 0)}</td>
                  <td className="py-3 pr-3">
                    {(c.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span key={t} className="rounded-full bg-baby-pink px-2 py-0.5 text-[10px] text-ink">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${c.isActive === false ? 'bg-beige text-mauve-dark' : 'bg-pastel-green text-ink'}`}>
                      {c.isActive === false ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-mauve-dark">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <CustomerDetail
          customer={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setSelected(null);
            setCustomers((cs) => cs.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
          }}
        />
      )}
    </div>
  );
}
