import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import api from '../../utils/api';

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/${endpoint}/list`, { page: 1, limit: 100 });
      setData(res.data.data.docs || res.data.data);
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
    setSaving(true);
    setFormError('');
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
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      await api.post(`/${endpoint}/delete`, { id });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink';

  return (
    <div className="rounded-2xl border border-beige bg-white p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl italic text-ink">{title}</h2>
          {description && <p className="mt-1 max-w-xl text-[13px] text-mauve-dark">{description}</p>}
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex flex-shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
        >
          <Plus size={15} /> Add New
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              {columns.map((col, idx) => (
                <th key={idx} className="py-2.5 pr-3">{col.label}</th>
              ))}
              <th className="py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="py-8 text-center text-mauve">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="py-8 text-center text-mauve">{emptyHint || 'Nothing here yet — click "Add New" to create the first one.'}</td></tr>
            ) : (
              data.map((row) => (
                <tr key={row._id} className="border-b border-beige/60 transition-colors hover:bg-cream/50">
                  {columns.map((col, idx) => (
                    <td key={idx} className="py-3 pr-3 text-ink">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  <td className="py-3">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
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
                {formSchema.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className={inputClass}
                        required={field.required}
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'color' ? (
                      <input
                        type="color"
                        value={formData[field.key] || field.default || '#E8CDD3'}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="h-11 w-20 cursor-pointer rounded-xl border border-beige bg-white p-1"
                      />
                    ) : (
                      <input
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
    </div>
  );
}
