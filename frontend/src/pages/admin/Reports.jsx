import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import api from '../../utils/api';
import { inr } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import DatePicker from '../../components/admin/DatePicker';

function Panel({ title, action, children }) {
  return (
    <div className="rounded-2xl border border-beige bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-xl italic text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sales, setSales] = useState(null);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [salesRes, returnsRes] = await Promise.all([
        api.post('/report/sales', { ...(from && { from }), ...(to && { to }) }),
        api.post('/report/returns', {}),
      ]);
      setSales(salesRes.data.data);
      setReturns(returnsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) return <p className="py-10 text-center text-mauve">Loading reports...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-beige bg-white p-6">
        <div>
          <h1 className="font-heading text-2xl italic text-ink">Reports</h1>
          <p className="mt-1 text-sm text-mauve-dark">Sales and returns, broken down by product and category</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker value={from} onChange={setFrom} placeholder="From" />
          <span className="text-sm text-mauve">to</span>
          <DatePicker value={to} onChange={setTo} placeholder="To" />
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-mauve-dark underline">Clear</button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>}

      <Panel
        title="Sales by Category"
        action={sales?.byCategory?.length > 0 && (
          <button
            onClick={() => downloadCsv('sales-by-category.csv', sales.byCategory, [
              { key: 'department', label: 'Category' },
              { key: 'quantity', label: 'Units Sold' },
              { key: 'revenue', label: 'Revenue' },
            ])}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve-dark hover:text-ink"
          >
            <Download size={13} /> Export CSV
          </button>
        )}
      >
        {!sales?.byCategory?.length ? (
          <p className="py-6 text-center text-sm text-mauve">No sales data for this range.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Units Sold</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sales.byCategory.map((row) => (
                <tr key={row.department} className="border-b border-beige/60">
                  <td className="py-2.5 pr-3 text-ink">{row.department}</td>
                  <td className="py-2.5 pr-3 text-mauve-dark">{row.quantity}</td>
                  <td className="py-2.5 text-right font-semibold text-ink">{inr(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title="Sales by Product"
        action={sales?.byProduct?.length > 0 && (
          <button
            onClick={() => downloadCsv('sales-by-product.csv', sales.byProduct, [
              { key: 'name', label: 'Product' },
              { key: 'department', label: 'Category' },
              { key: 'quantity', label: 'Units Sold' },
              { key: 'revenue', label: 'Revenue' },
            ])}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve-dark hover:text-ink"
          >
            <Download size={13} /> Export CSV
          </button>
        )}
      >
        {!sales?.byProduct?.length ? (
          <p className="py-6 text-center text-sm text-mauve">No sales data for this range.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Units Sold</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sales.byProduct.map((row) => (
                <tr key={row._id || row.name} className="border-b border-beige/60">
                  <td className="py-2.5 pr-3 text-ink">{row.name}</td>
                  <td className="py-2.5 pr-3 text-mauve-dark">{row.department}</td>
                  <td className="py-2.5 pr-3 text-mauve-dark">{row.quantity}</td>
                  <td className="py-2.5 text-right font-semibold text-ink">{inr(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title="Return Rate by Product"
        action={returns.length > 0 && (
          <button
            onClick={() => downloadCsv('return-rate-by-product.csv', returns, [
              { key: 'name', label: 'Product' },
              { key: 'orderCount', label: 'Orders' },
              { key: 'returnCount', label: 'Returns' },
              { key: 'returnRate', label: 'Return Rate (%)' },
            ])}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve-dark hover:text-ink"
          >
            <Download size={13} /> Export CSV
          </button>
        )}
      >
        {returns.length === 0 ? (
          <p className="py-6 text-center text-sm text-mauve">No returns recorded yet.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Orders</th>
                <th className="py-2 pr-3">Returns</th>
                <th className="py-2 text-right">Return Rate</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((row) => (
                <tr key={row._id} className="border-b border-beige/60">
                  <td className="py-2.5 pr-3 text-ink">{row.name}</td>
                  <td className="py-2.5 pr-3 text-mauve-dark">{row.orderCount}</td>
                  <td className="py-2.5 pr-3 text-mauve-dark">{row.returnCount}</td>
                  <td className="py-2.5 text-right font-semibold text-ink">{row.returnRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
