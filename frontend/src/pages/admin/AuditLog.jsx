import { useCallback, useEffect, useState } from 'react';
import api from '../../utils/api';
import Select from '../../components/admin/Select';

const ENTITY_TYPES = ['Product', 'Order', 'Coupon', 'Setting', 'User', 'Stock'];
const PAGE_SIZE = 50;

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/audit-log/list', {
        page,
        limit: PAGE_SIZE,
        ...(entityType && { entityType }),
      });
      setLogs(res.data.data.docs || []);
      setTotal(res.data.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity log');
    }
    setLoading(false);
  }, [page, entityType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl italic text-ink">Activity Log</h1>
          <p className="mt-1 text-sm text-mauve-dark">Who changed what, across the whole admin panel</p>
        </div>
        <Select
          value={entityType}
          onChange={(val) => {
            setEntityType(val);
            setPage(1);
          }}
          options={[{ value: '', label: 'All types' }, ...ENTITY_TYPES.map((t) => ({ value: t, label: t }))]}
          className="w-48"
        />
      </div>

      {error && <div className="mb-5 bg-blush px-4 py-3 text-sm text-ink">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-beige bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              <th className="px-5 py-3">When</th>
              <th className="px-5 py-3">Who</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">What happened</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-mauve">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-mauve">No activity recorded yet.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="border-b border-beige/60 align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-mauve-dark">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{log.actor?.name || 'System'}</p>
                    {log.actor?.role && (
                      <p className="text-[11px] capitalize text-mauve">{log.actor.role}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-beige px-2.5 py-0.5 text-[11px] text-ink">{log.entityType}</span>
                  </td>
                  <td className="px-5 py-3 text-ink">{log.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border border-beige px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-mauve-dark">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border border-beige px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
