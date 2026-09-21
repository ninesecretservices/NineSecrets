import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, X, Search } from 'lucide-react';
import api, { resolveImageUrl } from '../../utils/api';
import { inr } from '../../utils/format';
import useEscapeToClose from '../../utils/useEscapeToClose';
import useConfirm from '../../utils/useConfirm';
import useStore from '../../store/useStore';
import Select from '../../components/admin/Select';
import DatePicker from '../../components/admin/DatePicker';

const EMPTY = {
  code: '',
  type: 'percent',
  value: '',
  minOrderValue: '',
  maxDiscount: '',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  isActive: true,
  scope: { products: [] },
};

function ProductScopePicker({ selected, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.post('/product/list', { page: 1, limit: 8, search: query.trim() });
        setResults(res.data.data.docs || []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const add = (product) => {
    if (selected.some((p) => p._id === product._id)) return;
    onChange([...selected, { _id: product._id, name: product.name, thumbnail: product.thumbnail }]);
    setQuery('');
    setResults([]);
  };

  const remove = (id) => onChange(selected.filter((p) => p._id !== id));

  return (
    <div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products to restrict this coupon to..."
          className="w-full rounded-lg border border-beige py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-ink"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-beige bg-white shadow-lg">
            {results.map((p) => (
              <button
                type="button"
                key={p._id}
                onClick={() => add(p)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-cream"
              >
                {p.thumbnail && <img src={resolveImageUrl(p.thumbnail)} alt="" className="h-8 w-6 rounded object-cover" />}
                {p.name}
              </button>
            ))}
          </div>
        )}
        {searching && <p className="mt-1 text-xs text-mauve">Searching...</p>}
      </div>
      {selected.length === 0 ? (
        <p className="mt-2 text-xs text-mauve">No products added — applies to the whole cart.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span key={p._id} className="flex items-center gap-1.5 rounded-full bg-baby-pink px-2.5 py-1 text-[11px] text-ink">
              {p.name}
              <button type="button" onClick={() => remove(p._id)} aria-label={`Remove ${p.name}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Coupons() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useStore((s) => s.toast);
  const { confirm, ConfirmDialog } = useConfirm();

  useEscapeToClose(isModalOpen, () => setIsModalOpen(false));

  const fetchData_ = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/coupon/list', { page: 1, limit: 100 });
      setData(res.data.data.docs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load coupons');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData_();
  }, [fetchData_]);

  const openModal = (row = null) => {
    setFormError('');
    if (row) {
      setEditingId(row._id);
      setForm({
        code: row.code,
        type: row.type,
        value: row.value,
        minOrderValue: row.minOrderValue || '',
        maxDiscount: row.maxDiscount || '',
        startsAt: row.startsAt ? String(row.startsAt).slice(0, 10) : '',
        expiresAt: row.expiresAt ? String(row.expiresAt).slice(0, 10) : '',
        usageLimit: row.usageLimit || '',
        isActive: row.isActive,
        scope: { products: (row.scope?.products || []).map((p) => (typeof p === 'object' ? p : { _id: p })) },
      });
    } else {
      setEditingId(null);
      setForm(EMPTY);
    }
    setIsModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = {
      ...form,
      value: Number(form.value),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      startsAt: form.startsAt || undefined,
      expiresAt: form.expiresAt || undefined,
      scope: { products: form.scope.products.map((p) => p._id) },
    };
    try {
      if (editingId) {
        await api.post('/coupon/update', { id: editingId, ...payload });
        toast('Coupon updated');
      } else {
        await api.post('/coupon/create', payload);
        toast('Coupon created');
      }
      setIsModalOpen(false);
      fetchData_();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const remove = async (row) => {
    if (!(await confirm(`Delete coupon "${row.code}"?`, { confirmLabel: 'Delete', danger: true }))) return;
    try {
      await api.post('/coupon/delete', { id: row._id });
      toast('Coupon deleted');
      fetchData_();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const scheduleLabel = (row) => {
    const now = new Date();
    if (row.startsAt && new Date(row.startsAt) > now) return `Starts ${new Date(row.startsAt).toLocaleDateString()}`;
    if (row.expiresAt) return `Until ${new Date(row.expiresAt).toLocaleDateString()}`;
    return 'No expiry';
  };

  return (
    <div className="rounded-2xl border border-beige bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl italic text-ink">Coupons</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
        >
          <Plus size={15} /> Add Coupon
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              <th className="py-2.5 pr-3">Code</th>
              <th className="py-2.5 pr-3">Discount</th>
              <th className="py-2.5 pr-3">Scope</th>
              <th className="py-2.5 pr-3">Window</th>
              <th className="py-2.5 pr-3">Used</th>
              <th className="py-2.5 pr-3">Status</th>
              <th className="py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-mauve">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-mauve">No coupons yet.</td></tr>
            ) : (
              data.map((row) => (
                <tr key={row._id} className="border-b border-beige/60">
                  <td className="py-3 pr-3 font-semibold text-ink">{row.code}</td>
                  <td className="py-3 pr-3 text-ink">
                    {row.type === 'percent' ? `${row.value}%${row.maxDiscount ? ` (max ${inr(row.maxDiscount)})` : ''}` : inr(row.value)}
                  </td>
                  <td className="py-3 pr-3 text-mauve-dark">
                    {row.scope?.products?.length > 0 ? `${row.scope.products.length} product(s)` : 'All products'}
                  </td>
                  <td className="py-3 pr-3 text-mauve-dark">{scheduleLabel(row)}</td>
                  <td className="py-3 pr-3 text-mauve-dark">{row.usedCount || 0}{row.usageLimit ? ` / ${row.usageLimit}` : ''}</td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${row.isActive ? 'bg-pastel-green' : 'bg-beige text-mauve-dark'} text-ink`}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(row)} className="rounded-lg p-2 text-ink transition-colors hover:bg-beige/60" aria-label="Edit">
                        <Pencil size={16} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => remove(row)} className="rounded-lg p-2 text-red-700 transition-colors hover:bg-blush/60" aria-label="Delete">
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-heading text-xl italic text-ink">{editingId ? 'Edit Coupon' : 'Add Coupon'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-mauve hover:text-ink" aria-label="Close">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            {formError && <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Code</label>
                <input
                  required
                  autoFocus
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME10"
                  className="w-full rounded-lg border border-beige px-3 py-2 text-sm uppercase text-ink outline-none focus:border-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Type</label>
                  <Select
                    value={form.type}
                    onChange={(v) => setForm({ ...form, type: v })}
                    options={[{ value: 'percent', label: 'Percent (%)' }, { value: 'fixed', label: 'Fixed (₹)' }]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Value</label>
                  <input
                    required
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Min Order (₹)</label>
                  <input
                    type="number"
                    value={form.minOrderValue}
                    onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                    className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Max Discount (₹, percent only)</label>
                  <input
                    type="number"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Starts At (flash sales)</label>
                  <DatePicker value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Expires At</label>
                  <DatePicker value={form.expiresAt} onChange={(v) => setForm({ ...form, expiresAt: v })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Usage Limit</label>
                  <input
                    type="number"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Status</label>
                  <Select
                    value={form.isActive}
                    onChange={(v) => setForm({ ...form, isActive: v })}
                    options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Applies To</label>
                <ProductScopePicker
                  selected={form.scope.products}
                  onChange={(products) => setForm({ ...form, scope: { products } })}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Coupon'}
            </button>
          </form>
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}
