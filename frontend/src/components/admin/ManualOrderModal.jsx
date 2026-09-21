import { useEffect, useState } from 'react';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import api, { resolveImageUrl } from '../../utils/api';
import { inr } from '../../utils/format';
import Select from './Select';
import useStore from '../../store/useStore';

const EMPTY_ADDRESS = { fullName: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', phone: '' };

function CustomerPicker({ customer, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.post('/customer/list', { page: 1, limit: 8, search: query.trim() });
        setResults(res.data.data.docs || []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (customer) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-cream p-3">
        <div>
          <p className="text-sm font-medium text-ink">{customer.name}</p>
          <p className="text-xs text-mauve">{customer.email}</p>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-xs font-semibold uppercase text-mauve-dark underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search customer by name or email..."
        className="w-full rounded-lg border border-beige py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-ink"
      />
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-beige bg-white shadow-lg">
          {results.map((c) => (
            <button
              type="button"
              key={c._id}
              onClick={() => onSelect(c)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-cream"
            >
              <span className="font-medium text-ink">{c.name}</span>{' '}
              <span className="text-mauve">{c.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductPicker({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.post('/product/list', { page: 1, limit: 8, search: query.trim() });
        setResults(res.data.data.docs || []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const pickProduct = async (row) => {
    try {
      const res = await api.post('/product/detail', { id: row._id });
      setSelectedProduct(res.data.data);
      setSku('');
      setQuery('');
      setResults([]);
    } catch {
      // ignore
    }
  };

  const add = () => {
    const variant = selectedProduct.variants.find((v) => v.sku === sku);
    if (!variant) return;
    onAdd({
      product: selectedProduct._id,
      name: selectedProduct.name,
      variant: { colour: variant.colour?._id, size: variant.size?._id, fit: variant.fit?._id, sku: variant.sku },
      variantLabel: `${variant.colour?.name || ''} / ${variant.size?.name || ''}`,
      quantity: Number(quantity) || 1,
      price: variant.sellingPrice ?? variant.mrp,
      stock: variant.stock,
    });
    setSelectedProduct(null);
    setSku('');
    setQuantity(1);
  };

  if (selectedProduct) {
    const variant = selectedProduct.variants.find((v) => v.sku === sku);
    return (
      <div className="rounded-lg border border-beige p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">{selectedProduct.name}</p>
          <button type="button" onClick={() => setSelectedProduct(null)} className="text-xs text-mauve-dark underline">Change</button>
        </div>
        <div className="flex gap-2">
          <Select
            value={sku}
            onChange={setSku}
            options={selectedProduct.variants.map((v) => ({
              value: v.sku,
              label: `${v.colour?.name || ''} / ${v.size?.name || ''} — ${v.stock} in stock`,
              disabled: v.stock <= 0,
            }))}
            placeholder="Choose option..."
            className="flex-grow"
          />
          <input
            type="number"
            min={1}
            max={variant?.stock || 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 rounded-lg border border-beige px-2 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          <button
            type="button"
            disabled={!sku}
            onClick={add}
            className="flex items-center gap-1 rounded-lg bg-ink px-3 py-2 text-xs font-semibold uppercase text-cream disabled:opacity-40"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products to add..."
        className="w-full rounded-lg border border-beige py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-ink"
      />
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-beige bg-white shadow-lg">
          {results.map((p) => (
            <button
              type="button"
              key={p._id}
              onClick={() => pickProduct(p)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-cream"
            >
              {p.thumbnail && <img src={resolveImageUrl(p.thumbnail)} alt="" className="h-8 w-6 rounded object-cover" />}
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManualOrderModal({ onClose, onCreated }) {
  const toast = useStore((s) => s.toast);
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const removeItem = (idx) => setItems((it) => it.filter((_, i) => i !== idx));
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!customer) return setError('Select a customer');
    if (items.length === 0) return setError('Add at least one item');
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/order/create-manual', {
        userId: customer._id,
        items: items.map(({ product, variant, quantity, price }) => ({ product, variant, quantity, price })),
        shippingAddress: address,
        paymentMethod,
        markAsPaid,
        ...(couponCode.trim() && { couponCode: couponCode.trim() }),
      });
      toast(`Order ${res.data.data.orderNumber} created`);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create order');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-heading text-xl italic text-ink">New Order (Phone / In-Person)</h3>
          <button type="button" onClick={onClose} className="text-mauve hover:text-ink" aria-label="Close">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        {error && <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>}

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Customer</label>
          <CustomerPicker customer={customer} onSelect={setCustomer} />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Items</label>
          {items.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-cream p-2.5 text-sm">
                  <div>
                    <span className="font-medium text-ink">{it.name}</span>{' '}
                    <span className="text-mauve">{it.variantLabel} × {it.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{inr(it.price * it.quantity)}</span>
                    <button type="button" onClick={() => removeItem(i)} aria-label="Remove">
                      <Trash2 size={14} className="text-red-700" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <ProductPicker onAdd={(item) => setItems((it) => [...it, item])} />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <input required placeholder="Full Name" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} className="rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
          <input required placeholder="Phone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} className="rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
          <input required placeholder="Address Line 1" value={address.addressLine1} onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} className="col-span-2 rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
          <input placeholder="Address Line 2 (optional)" value={address.addressLine2} onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} className="col-span-2 rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
          <input required placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
          <input placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className="rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
          <input required placeholder="Postal Code" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} className="rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Payment Method</label>
            <Select value={paymentMethod} onChange={setPaymentMethod} options={[{ value: 'cod', label: 'Cash on Delivery' }, { value: 'card', label: 'Already Paid (Card/UPI)' }]} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Coupon (optional)</label>
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="w-full rounded-lg border border-beige px-3 py-2 text-sm uppercase text-ink outline-none focus:border-ink" />
          </div>
        </div>

        <label className="mb-5 flex items-center gap-2 text-sm text-mauve-dark">
          <input type="checkbox" checked={markAsPaid} onChange={(e) => setMarkAsPaid(e.target.checked)} className="h-4 w-4 accent-ink" />
          Payment already collected (marks order as paid)
        </label>

        <div className="mb-5 flex justify-between border-t border-beige pt-3 text-sm font-bold text-ink">
          <span>Subtotal</span>
          <span>{inr(subtotal)}</span>
        </div>
        <p className="mb-4 text-xs text-mauve">Tax, shipping, and coupon discount are calculated by the server on submit.</p>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-ink px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}
