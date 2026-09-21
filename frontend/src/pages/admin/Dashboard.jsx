import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Building2, Palette, Plus, ArrowRight, CircleCheck, Circle } from 'lucide-react';
import api from '../../utils/api';
import useStore from '../../store/useStore';

// Guided setup for first-time (non-technical) users. Each step checks live data.
const SETUP_STEPS = [
  { key: 'department', endpoint: 'department', label: 'Create a Department', desc: 'The top section of your shop — usually just "Women".', to: '/admin/departments' },
  { key: 'item', endpoint: 'item', label: 'Add your Categories', desc: 'The product types you sell — Night Suit, Pyjama Set, T-shirt Set...', to: '/admin/items' },
  { key: 'colour', endpoint: 'colour', label: 'Add your Colours', desc: 'The colour swatches customers pick from.', to: '/admin/colours' },
  { key: 'size', endpoint: 'size', label: 'Add your Sizes', desc: 'S, M, L, XL — whatever you stock.', to: '/admin/sizes' },
  { key: 'fit', endpoint: 'fit', label: 'Add a Fit', desc: 'Just add "Regular" if you don\'t differentiate fits.', to: '/admin/fits' },
  { key: 'product', endpoint: 'product', label: 'Create your first Product', desc: 'Photos, price and stock — then set it to "Visible in store".', to: '/admin/products' },
];

// A lightweight in-house bar chart — the store's whole sales-reporting need
// today is "revenue over the last couple weeks", which doesn't justify
// pulling in a full charting library.
const CHART_HEIGHT = 160; // px — matches the bars' own scale below (not a Tailwind h-* class)

function SalesChart({ data }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="rounded-2xl border border-beige bg-white p-6">
      <h2 className="mb-4 font-heading text-xl italic text-ink">Sales — Last 14 Days</h2>
      <div className="flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
        {data.map((d) => (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
            <div className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] text-cream group-hover:block">
              ₹{d.revenue.toLocaleString('en-IN')}
            </div>
            {/* Percentage heights need a parent with a resolved (non-auto)
                height, which a flex child sized by content never has — using
                an explicit pixel height sidesteps that entirely. */}
            <div
              className="w-full rounded-t-md bg-blush transition-colors group-hover:bg-baby-pink"
              style={{ height: Math.max((d.revenue / max) * CHART_HEIGHT, 4) }}
            />
            <span className="mt-1.5 whitespace-nowrap text-[9px] text-mauve">
              {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopProducts({ products }) {
  return (
    <div className="rounded-2xl border border-beige bg-white p-6">
      <h2 className="mb-4 font-heading text-xl italic text-ink">Top Products</h2>
      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-mauve">Not enough sales data yet.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p, i) => (
            <div key={p._id || i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cream text-[11px] font-semibold text-ink">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{p.name}</p>
                  <p className="text-[11px] text-mauve">{p.quantity} sold</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-ink">₹{p.revenue.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GettingStarted() {
  const [done, setDone] = useState(null);
  const [dismissed, setDismissed] = useState(localStorage.getItem('setupDismissed') === '1');

  useEffect(() => {
    (async () => {
      const results = {};
      await Promise.all(
        SETUP_STEPS.map(async (s) => {
          try {
            const res = await api.post(`/${s.endpoint}/list`, { page: 1, limit: 1 });
            results[s.key] = (res.data.data.total ?? (res.data.data.docs || []).length) > 0;
          } catch {
            results[s.key] = false;
          }
        })
      );
      setDone(results);
    })();
  }, []);

  if (dismissed || !done) return null;
  const doneCount = SETUP_STEPS.filter((s) => done[s.key]).length;
  if (doneCount === SETUP_STEPS.length) return null;

  return (
    <div className="mb-8 rounded-2xl border border-beige bg-white p-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-heading text-xl italic text-ink">Set up your shop</h2>
        <button onClick={() => { localStorage.setItem('setupDismissed', '1'); setDismissed(true); }} className="text-xs text-mauve underline">
          Hide this
        </button>
      </div>
      <p className="mb-4 text-sm text-mauve-dark">
        Follow these steps in order — {doneCount} of {SETUP_STEPS.length} done.
      </p>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-cream">
        <div className="h-full rounded-full bg-pastel-green transition-all" style={{ width: `${(doneCount / SETUP_STEPS.length) * 100}%` }} />
      </div>
      <div className="space-y-2.5">
        {SETUP_STEPS.map((s, i) => (
          <Link key={s.key} to={s.to} className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${done[s.key] ? 'bg-cream/60' : 'bg-cream hover:bg-beige/50'}`}>
            {done[s.key] ? (
              <CircleCheck size={20} strokeWidth={1.5} className="flex-shrink-0 text-pastel-green" style={{ color: '#7fae78' }} />
            ) : (
              <Circle size={20} strokeWidth={1.5} className="flex-shrink-0 text-mauve" />
            )}
            <div className="flex-grow">
              <p className={`text-sm font-semibold ${done[s.key] ? 'text-mauve line-through' : 'text-ink'}`}>
                {i + 1}. {s.label}
              </p>
              {!done[s.key] && <p className="text-xs text-mauve-dark">{s.desc}</p>}
            </div>
            {!done[s.key] && <ArrowRight size={15} className="flex-shrink-0 text-mauve" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

const STAT_CARDS = [
  { key: 'products', label: 'Products', endpoint: 'product', icon: Package, to: '/admin/products', accent: 'bg-blush' },
  { key: 'orders', label: 'Orders', endpoint: 'order', icon: ShoppingCart, to: '/admin/orders', accent: 'bg-pastel-green' },
  { key: 'departments', label: 'Departments', endpoint: 'department', icon: Building2, to: '/admin/departments', accent: 'bg-baby-pink' },
  { key: 'colours', label: 'Colours', endpoint: 'colour', icon: Palette, to: '/admin/colours', accent: 'bg-beige' },
];

export default function Dashboard() {
  const user = useStore((s) => s.user);
  const isFulfillmentOnly = user?.role === 'fulfillment';
  const statCards = isFulfillmentOnly ? STAT_CARDS.filter((c) => c.key === 'orders') : STAT_CARDS;
  const [stats, setStats] = useState({});
  const [salesStats, setSalesStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    statCards.forEach(async ({ key, endpoint }) => {
      try {
        const res = await api.post(`/${endpoint}/list`, { page: 1, limit: 1 });
        setStats((s) => ({ ...s, [key]: res.data.data.total ?? (res.data.data.docs || res.data.data).length }));
      } catch {
        setStats((s) => ({ ...s, [key]: '—' }));
      }
    });
    (async () => {
      try {
        const res = await api.post('/order/list', { page: 1, limit: 5 });
        setRecentOrders(res.data.data.docs || []);
      } catch {
        // No orders yet or backend unavailable.
      }
      try {
        const res = await api.post('/order/stats', {});
        setSalesStats(res.data.data);
      } catch {
        // stats endpoint unavailable
      }
    })();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl italic text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-mauve-dark">Overview of your store</p>
        </div>
        {!isFulfillmentOnly && (
          <Link
            to="/admin/products"
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
          >
            <Plus size={15} /> Add Product
          </Link>
        )}
      </div>

      {!isFulfillmentOnly && <GettingStarted />}

      {/* Sales overview */}
      {salesStats && (
        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl bg-ink p-5 text-cream">
            <p className="text-[11px] uppercase tracking-[0.14em] text-cream/60">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold">₹{salesStats.revenue.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-cream/60">{salesStats.orders} orders (excl. cancelled)</p>
          </div>
          <div className="rounded-2xl border border-beige bg-white p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mauve">To Fulfil</p>
            <p className="mt-2 text-3xl font-bold text-ink">{salesStats.processing}</p>
            <p className="mt-1 text-xs text-mauve">orders in processing</p>
          </div>
          <div className="rounded-2xl border border-beige bg-white p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mauve">Pending Returns</p>
            <p className="mt-2 text-3xl font-bold text-ink">{salesStats.pendingReturns}</p>
            <p className="mt-1 text-xs text-mauve">awaiting your decision</p>
          </div>
        </div>
      )}

      {/* Low stock alert */}
      {salesStats?.lowStock?.length > 0 && (
        <div className="mb-10 rounded-2xl border border-blush bg-blush/30 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink">⚠ Low Stock (under 5 left)</p>
          <div className="flex flex-wrap gap-2">
            {salesStats.lowStock.map((v, i) => (
              <Link key={i} to="/admin/products" className="rounded-full bg-white px-3.5 py-1.5 text-xs text-ink">
                {v.name} · {v.sku} — <b>{v.stock} left</b>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sales chart + top products */}
      {!isFulfillmentOnly && salesStats && (
        <div className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
          <SalesChart data={salesStats.salesByDay || []} />
          <TopProducts products={salesStats.topProducts || []} />
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, to, accent }) => (
          <Link key={key} to={to} className="group rounded-2xl border border-beige bg-white p-5 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${accent}`}>
                <Icon size={18} strokeWidth={1.5} className="text-ink" />
              </div>
              <ArrowRight size={16} className="text-mauve opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-4 text-3xl font-bold text-ink">{stats[key] ?? '…'}</p>
            <p className="mt-1 text-[13px] font-medium text-mauve-dark">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-beige bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl italic text-ink">Recent Orders</h2>
          <Link to="/admin/orders" className="text-[13px] font-medium text-ink underline underline-offset-4">
            View all →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-mauve">No orders yet.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
                <th className="py-2 pr-3">Order #</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o._id} className="border-b border-beige/60">
                  <td className="py-3 pr-3 font-medium text-ink">{o.orderNumber}</td>
                  <td className="py-3 pr-3 text-mauve-dark">{o.user?.name || '—'}</td>
                  <td className="py-3 pr-3 font-semibold text-ink">₹{o.total}</td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-baby-pink px-2.5 py-0.5 text-[11px] capitalize text-ink">{o.orderStatus}</span>
                  </td>
                  <td className="py-3 text-mauve-dark">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
