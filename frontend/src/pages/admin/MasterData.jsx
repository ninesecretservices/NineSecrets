import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, X, Inbox } from 'lucide-react';
import api from '../../utils/api';
import useEscapeToClose from '../../utils/useEscapeToClose';
import useSpaceToAdd from '../../utils/useSpaceToAdd';
import useConfirm from '../../utils/useConfirm';
import useStore from '../../store/useStore';
import Select from '../../components/admin/Select';
import DatePicker from '../../components/admin/DatePicker';

// Generic CRUD table + modal form for master data entities.
// formSchema fields: { key, label, required, type: 'text'|'password'|'select', options: [{value,label}], placeholder,
//                      omitIfEmpty: true → field is not sent when blank (e.g. password on edit) }
export default function MasterData({ title, endpoint, columns, formSchema, description, emptyHint }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const { confirm, ConfirmDialog } = useConfirm();
  const toast = useStore((s) => s.toast);

  useEscapeToClose(isModalOpen, () => setIsModalOpen(false));
  useSpaceToAdd(() => handleOpenModal(), isModalOpen);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/${endpoint}/list`, { page: 1, limit: 100 });
      setData(res.data.data.docs || res.data.data);
      setSelected(new Set());
    } catch (err) {
      setError(err.response?.data?.message || `Failed to load ${title.toLowerCase()}`);
    }
    setLoading(false);
  }, [endpoint, title]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (row = null) => {
    setFormError('');
    if (row) {
      setEditingId(row._id);
      const initial = {};
      formSchema.forEach((f) => {
        if (f.type === 'password') return;
        let val = row[f.key];
        // Populated refs arrive as objects; selects need the plain id.
        if (val && typeof val === 'object' && val._id) val = val._id;
        // Date inputs need YYYY-MM-DD.
        if (f.type === 'date' && val) val = String(val).slice(0, 10);
        initial[f.key] = val ?? '';
      });
      setFormData(initial);
    } else {
      setEditingId(null);
      const initial = {};
      formSchema.forEach((f) => {
        if (f.default !== undefined) initial[f.key] = f.default;
      });
      setFormData(initial);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    // Custom Select fields aren't real <select required> controls, so the
    // browser's native required-field validation no longer applies here —
    // check it ourselves before submitting.
    const missing = formSchema.find((f) => f.required && !(f.omitIfEmpty && editingId) && !formData[f.key]);
    if (missing) {
      setFormError(`${missing.label} is required`);
      return;
    }

    setSaving(true);
    try {
      const payload = {};
      formSchema.forEach((f) => {
        const val = formData[f.key];
        if (f.omitIfEmpty && !val) return;
        payload[f.key] = val;
      });
      if (editingId) {
        await api.post(`/${endpoint}/update`, { id: editingId, ...payload });
      } else {
        await api.post(`/${endpoint}/create`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Are you sure you want to delete this?', { confirmLabel: 'Delete', danger: true }))) return;
    try {
      await api.post(`/${endpoint}/delete`, { id });
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = data.length > 0 && selected.size === data.length;
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(data.map((r) => r._id)));
  };

  const handleBulkDelete = async () => {
    const count = selected.size;
    if (!(await confirm(
      `Delete ${count} selected item${count === 1 ? '' : 's'}? This can't be undone.`,
      { confirmLabel: `Delete ${count}`, danger: true }
    ))) return;
    const ids = [...selected];
    const results = await Promise.allSettled(ids.map((id) => api.post(`/${endpoint}/delete`, { id })));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      toast(`Deleted ${ids.length - failed} of ${ids.length} — ${failed} failed`, 'error');
    } else {
      toast(`Deleted ${ids.length} item${ids.length === 1 ? '' : 's'}`);
    }
    fetchData();
  };

  const inputClass =
    'w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink';

  return (
    <div className="rounded-2xl border border-beige bg-white p-6 shadow-sm shadow-ink/[0.02]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-beige/70 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-2xl italic text-ink">{title}</h2>
            {!loading && data.length > 0 && (
              <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-semibold text-mauve-dark">
                {data.length}
              </span>
            )}
          </div>
          {description && <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-mauve-dark">{description}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 rounded-full border border-red-700 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-red-700 transition-colors hover:bg-blush/60"
            >
              <Trash2 size={15} /> Delete Selected ({selected.size})
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
          >
            <Plus size={15} /> Add New
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              <th className="w-9 py-3 pr-2">
                {data.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                    className="h-4 w-4 cursor-pointer accent-ink"
                  />
                )}
              </th>
              {columns.map((col, idx) => (
                <th key={idx} className="py-3 pr-3">{col.label}</th>
              ))}
              <th className="py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 2} className="py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-mauve">
                    <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-beige border-t-ink" />
                    <span className="text-xs">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-mauve">
                      <Inbox size={18} strokeWidth={1.5} />
                    </div>
                    <p className="max-w-xs text-sm text-mauve">
                      {emptyHint || 'Nothing here yet — click "Add New" to create the first one.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row._id} className={`border-b border-beige/60 transition-colors hover:bg-cream/50 ${selected.has(row._id) ? 'bg-cream/70' : ''}`}>
                  <td className="py-3.5 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row._id)}
                      onChange={() => toggleSelect(row._id)}
                      aria-label={`Select row`}
                      className="h-4 w-4 cursor-pointer accent-ink"
                    />
                  </td>
                  {columns.map((col, idx) => (
                    <td key={idx} className="py-3.5 pr-3 text-ink">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  <td className="py-3.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenModal(row)} className="rounded-lg p-2 text-ink transition-colors hover:bg-beige/60" aria-label="Edit">
                        <Pencil size={16} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleDelete(row._id)} className="rounded-lg p-2 text-red-700 transition-colors hover:bg-blush/60" aria-label="Delete">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-beige bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-heading text-xl italic text-ink">{editingId ? 'Edit' : 'Create'} {title}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-mauve hover:text-ink" aria-label="Close">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{formError}</div>
            )}

            <form onSubmit={handleSave}>
              <div className="space-y-4">
                {formSchema.map((field, idx) => (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <Select
                        autoFocus={idx === 0}
                        value={formData[field.key] ?? ''}
                        onChange={(val) => setFormData({ ...formData, [field.key]: val })}
                        options={field.options || []}
                        placeholder="Select..."
                        required={field.required}
                      />
                    ) : field.type === 'color' ? (
                      <input
                        autoFocus={idx === 0}
                        type="color"
                        value={formData[field.key] || field.default || '#E8CDD3'}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="h-11 w-20 cursor-pointer rounded-xl border border-beige bg-white p-1"
                      />
                    ) : field.type === 'date' ? (
                      <DatePicker
                        value={formData[field.key] || ''}
                        onChange={(val) => setFormData({ ...formData, [field.key]: val })}
                        required={field.required}
                      />
                    ) : field.type === 'textarea' ? (
                      <textarea
                        autoFocus={idx === 0}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className={`${inputClass} min-h-[120px] resize-y`}
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        autoFocus={idx === 0}
                        type={field.type || 'text'}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className={inputClass}
                        required={field.required && !(field.omitIfEmpty && editingId)}
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.hint && editingId && (
                      <p className="mt-1 text-[11px] text-mauve">{field.hint}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-beige px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}
