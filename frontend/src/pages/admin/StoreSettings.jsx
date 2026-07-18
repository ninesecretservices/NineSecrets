import { useEffect, useState } from 'react';
import api from '../../utils/api';

const inputClass =
  'w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink';

const DEFAULTS = {
  freeShippingThreshold: 599,
  shippingFee: 50,
  codEnabled: true,
  lowStockThreshold: 5,
  maxOrderQty: 10,
  contactPhone: '',
  contactEmail: '',
  contactAddress: '',
  facebookUrl: '',
};

export default function StoreSettings() {
  const [cfg, setCfg] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.post('/setting/detail', { key: 'commerce' });
        setCfg({ ...DEFAULTS, ...res.data.data.published });
      } catch (err) {
        setMsg({ ok: false, text: err.response?.data?.message || 'Only a superadmin can edit store settings.' });
      }
      setLoading(false);
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      // Config changes go live immediately (still versioned for revert via API).
      await api.post('/setting/publish', { key: 'commerce', value: cfg });
      setMsg({ ok: true, text: 'Saved — checkout and cart use the new values immediately.' });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Save failed' });
    }
    setSaving(false);
  };

  if (loading) return <p className="py-10 text-center text-mauve">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-3xl italic text-ink">Store Settings</h1>
      <p className="mb-6 mt-1 text-sm text-mauve-dark">Business rules that apply across the whole store.</p>

      {msg && (
        <p className={`mb-5 rounded-xl px-4 py-3 text-sm text-ink ${msg.ok ? 'bg-pastel-green' : 'bg-blush'}`}>{msg.text}</p>
      )}

      <form onSubmit={save} className="rounded-2xl border border-beige bg-white p-6">
        <h2 className="mb-4 font-heading text-lg italic text-ink">Shipping</h2>
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Free Shipping Above (₹)</label>
            <input type="number" min="0" className={inputClass} value={cfg.freeShippingThreshold}
              onChange={(e) => setCfg({ ...cfg, freeShippingThreshold: Number(e.target.value) || 0 })} />
            <p className="mt-1 text-[11px] text-mauve">Also shown in the cart's free-shipping progress bar.</p>
          </div>
          <div>
            <label className={labelClass}>Shipping Fee Below That (₹)</label>
            <input type="number" min="0" className={inputClass} value={cfg.shippingFee}
              onChange={(e) => setCfg({ ...cfg, shippingFee: Number(e.target.value) || 0 })} />
          </div>
        </div>

        <h2 className="mb-4 font-heading text-lg italic text-ink">Payments</h2>
        <label className="mb-6 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 accent-[#201820]" checked={cfg.codEnabled}
            onChange={(e) => setCfg({ ...cfg, codEnabled: e.target.checked })} />
          Cash on Delivery enabled
        </label>

        <h2 className="mb-4 font-heading text-lg italic text-ink">Inventory & Orders</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Low-Stock Alert Below</label>
            <input type="number" min="1" className={inputClass} value={cfg.lowStockThreshold}
              onChange={(e) => setCfg({ ...cfg, lowStockThreshold: Number(e.target.value) || 1 })} />
            <p className="mt-1 text-[11px] text-mauve">Drives the dashboard low-stock alerts.</p>
          </div>
          <div>
            <label className={labelClass}>Max Quantity Per Item</label>
            <input type="number" min="1" className={inputClass} value={cfg.maxOrderQty}
              onChange={(e) => setCfg({ ...cfg, maxOrderQty: Number(e.target.value) || 1 })} />
          </div>
        </div>

        <h2 className="mb-4 font-heading text-lg italic text-ink">Contact Details</h2>
        <p className="mb-4 text-[11px] text-mauve">Shown in the site footer, legal pages, and policy text — one place to keep it accurate everywhere.</p>
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Support Phone</label>
            <input type="text" className={inputClass} placeholder="e.g. +91 98765 43210"
              value={cfg.contactPhone || ''}
              onChange={(e) => setCfg({ ...cfg, contactPhone: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Support Email</label>
            <input type="email" className={inputClass} placeholder="e.g. care@ninesecrets.com"
              value={cfg.contactEmail || ''}
              onChange={(e) => setCfg({ ...cfg, contactEmail: e.target.value })} />
          </div>
        </div>
        <div className="mb-6">
          <label className={labelClass}>Business Address</label>
          <input type="text" className={inputClass} placeholder="e.g. Nine Secrets, Surat, Gujarat, India"
            value={cfg.contactAddress || ''}
            onChange={(e) => setCfg({ ...cfg, contactAddress: e.target.value })} />
        </div>

        <h2 className="mb-4 font-heading text-lg italic text-ink">Social Links</h2>
        <p className="mb-4 text-[11px] text-mauve">These appear as floating icons on the storefront. Leave blank to hide an icon.</p>
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>WhatsApp Number</label>
            <input type="text" className={inputClass} placeholder="e.g. 919876543210"
              value={cfg.whatsappNumber || ''}
              onChange={(e) => setCfg({ ...cfg, whatsappNumber: e.target.value })} />
            <p className="mt-1 text-[11px] text-mauve">Full number with country code, no + or spaces.</p>
          </div>
          <div>
            <label className={labelClass}>Instagram Profile URL</label>
            <input type="url" className={inputClass} placeholder="e.g. https://instagram.com/ninesecrets"
              value={cfg.instagramUrl || ''}
              onChange={(e) => setCfg({ ...cfg, instagramUrl: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Facebook Page URL</label>
            <input type="url" className={inputClass} placeholder="e.g. https://facebook.com/ninesecrets"
              value={cfg.facebookUrl || ''}
              onChange={(e) => setCfg({ ...cfg, facebookUrl: e.target.value })} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="mt-6 rounded-full bg-ink px-8 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
