import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, X, Upload, ImageOff, Sparkles, Copy, Percent } from 'lucide-react';
import api, { resolveImageUrl } from '../../utils/api';
import { uploadFile, deleteImage, slugifyFolder } from '../../utils/upload';
import { inr } from '../../utils/format';
import useEscapeToClose from '../../utils/useEscapeToClose';
import useSpaceToAdd from '../../utils/useSpaceToAdd';
import useConfirm from '../../utils/useConfirm';
import usePrompt from '../../utils/usePrompt';
import Select from '../../components/admin/Select';
import useStore from '../../store/useStore';

const EMPTY_VARIANT = { colour: '', size: '', fit: '', sku: '', barcode: '', stock: 0, mrp: '', sellingPrice: '' };

const inputClass =
  'w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink';

const STATUS_OPTIONS = [
  { value: 'active', label: '✓ Visible in store' },
  { value: 'draft', label: 'Hidden (still working on it)' },
  { value: 'out-of-stock', label: 'Out of stock' },
];

// Suggest a stock code like NS-ISLA-PNK-M so users never have to invent one.
const suggestSku = (productName, colourName, sizeName) =>
  ['NS',
    (productName || '').replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase(),
    (colourName || '').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase(),
    (sizeName || '').replace(/\s/g, '').toUpperCase(),
  ].filter(Boolean).join('-');

function SectionTitle({ n, title, hint }) {
  return (
    <div className="mb-3 mt-6 first:mt-0">
      <p className="text-sm font-bold text-ink">
        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blush text-xs">{n}</span>
        {title}
      </p>
      {hint && <p className="ml-8 mt-0.5 text-xs text-mauve">{hint}</p>}
    </div>
  );
}

// Inline "+ New" creator so users never leave the product form to add an option.
function QuickAdd({ label, endpoint, extraFields = [], departments = [], onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#E8CDD3');
  const [dept, setDept] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const body = { name: name.trim() };
      if (extraFields.includes('hexCode')) body.hexCode = hex;
      if (extraFields.includes('department')) {
        if (!dept) { setErr('Pick a department'); setBusy(false); return; }
        body.department = dept;
      }
      const res = await api.post(`/${endpoint}/create`, body);
      onCreated(res.data.data);
      setName('');
      setOpen(false);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not create');
    }
    setBusy(false);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 text-[11px] font-semibold text-ink underline underline-offset-2">
        + New {label}
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-xl bg-cream p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          className="w-40 rounded-lg border border-beige bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          placeholder={`${label} name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); create(); }
            if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
          }}
        />
        {extraFields.includes('hexCode') && (
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-beige bg-white p-0.5" />
        )}
        {extraFields.includes('department') && (
          <Select
            value={dept}
            onChange={setDept}
            options={departments.map((d) => ({ value: d._id, label: d.name }))}
            placeholder="Department..."
            className="w-44"
            triggerClassName="flex w-full items-center justify-between gap-2 rounded-lg border border-beige bg-white px-3 py-2 text-left text-sm text-ink outline-none"
          />
        )}
        <button type="button" onClick={create} disabled={busy} className="rounded-full bg-ink px-4 py-2 text-[11px] font-semibold uppercase text-cream disabled:opacity-50">
          {busy ? '...' : 'Add'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-mauve hover:text-ink" aria-label="Cancel">
          <X size={15} />
        </button>
      </div>
      {err && <p className="mt-1.5 text-xs text-red-700">{err}</p>}
    </div>
  );
}

export default function Products() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [variants, setVariants] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkPriceMode, setBulkPriceMode] = useState('percent');
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [bulkPriceSaving, setBulkPriceSaving] = useState(false);
  const toast = useStore((s) => s.toast);
  const { confirm, ConfirmDialog } = useConfirm();
  const { prompt, PromptDialog } = usePrompt();

  useEscapeToClose(isModalOpen, () => setIsModalOpen(false));

  const [master, setMaster] = useState({ departments: [], items: [], designs: [], fabrics: [], colours: [], sizes: [], fits: [], descriptionTemplates: [] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/product/list', { page: 1, limit: 100 });
      setData(res.data.data.docs || res.data.data);
      setSelected(new Set());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    }
    setLoading(false);
  }, []);

  const fetchMasterData = useCallback(async () => {
    const endpoints = {
      departments: 'department', items: 'item', designs: 'design', fabrics: 'fabric',
      colours: 'colour', sizes: 'size', fits: 'fit', descriptionTemplates: 'description-template',
    };
    const entries = await Promise.all(
      Object.entries(endpoints).map(async ([key, ep]) => {
        try {
          const res = await api.post(`/${ep}/list`, { page: 1, limit: 100 });
          return [key, res.data.data.docs || res.data.data];
        } catch {
          return [key, []];
        }
      })
    );
    setMaster(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    fetchData();
    fetchMasterData();
  }, [fetchData, fetchMasterData]);

  const handleOpenModal = (row = null) => {
    setFormError('');
    setShowAdvanced(false);
    if (row) {
      setEditingId(row._id);
      setFormData({
        name: row.name,
        description: row.description || '',
        department: row.department?._id || row.department || '',
        item: row.item?._id || row.item || '',
        design: row.design?._id || row.design || '',
        fabric: row.fabric?._id || row.fabric || '',
        thumbnail: row.thumbnail || '',
        images: row.images || [],
        status: row.status,
        isFeatured: !!row.isFeatured,
        taxPercentage: row.taxPercentage ?? 0,
      });
      setVariants(
        (row.variants || []).map((v) => ({
          colour: v.colour?._id || v.colour || '',
          size: v.size?._id || v.size || '',
          fit: v.fit?._id || v.fit || '',
          sku: v.sku || '',
          barcode: v.barcode || '',
          stock: v.stock ?? 0,
          mrp: v.mrp ?? '',
          sellingPrice: v.sellingPrice ?? '',
        }))
      );
    } else {
      setEditingId(null);
      setFormData({ status: 'active', isFeatured: false, taxPercentage: 0, images: [] });
      setVariants([{ ...EMPTY_VARIANT }]);
    }
    setIsModalOpen(true);
  };

  // Auto-fill the stock code once colour + size are chosen (still editable).
  const setVariant = (idx, key, value) => {
    setVariants((vs) =>
      vs.map((v, i) => {
        if (i !== idx) return v;
        const next = { ...v, [key]: value };
        if (['colour', 'size'].includes(key) && !next.sku && next.colour && next.size) {
          const colourName = master.colours.find((c) => c._id === next.colour)?.name;
          const sizeName = master.sizes.find((s) => s._id === next.size)?.name;
          next.sku = suggestSku(formData.name, colourName, sizeName);
        }
        return next;
      })
    );
  };

  // Groups product photos by department in Cloudinary, e.g. products/lounge-sets.
  // Falls back to the flat default folder if no department is picked yet.
  const productImageFolder = () => {
    const dept = master.departments.find((d) => d._id === formData.department);
    return dept ? `products/${slugifyFolder(dept.name)}` : undefined;
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setFormError('');
    const previous = formData.thumbnail;
    try {
      const url = await uploadFile(file, productImageFolder());
      setFormData((f) => ({ ...f, thumbnail: url }));
      if (previous) deleteImage(previous);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Image upload failed');
    }
    setUploading(false);
  };

  const handleGalleryUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setFormError('');
    try {
      const folder = productImageFolder();
      const urls = [];
      for (const file of files) {
        urls.push(await uploadFile(file, folder));
      }
      setFormData((f) => ({ ...f, images: [...(f.images || []), ...urls] }));
    } catch (err) {
      setFormError(err.response?.data?.message || 'Image upload failed');
    }
    setUploading(false);
  };

  // Shared by "Insert template" and "Generate with AI" — never silently
  // discards text the user already typed.
  const applyDescriptionText = async (newText) => {
    const existing = (formData.description || '').trim();
    if (!existing) {
      setFormData((f) => ({ ...f, description: newText }));
      return;
    }
    const replace = await confirm('Replace the current description with the new text?', {
      confirmLabel: 'Replace',
      cancelLabel: 'Append Instead',
    });
    setFormData((f) => ({
      ...f,
      description: replace ? newText : `${(f.description || '').trim()}\n\n${newText}`,
    }));
  };

  const handleAiDescription = async () => {
    let imageUrl = formData.thumbnail;
    if (!imageUrl) {
      imageUrl = await prompt('No photo uploaded yet — paste an image URL to generate a description from:', {
        placeholder: 'https://...',
        confirmLabel: 'Use This Image',
      });
      if (!imageUrl) return;
    }
    setAiGenerating(true);
    setFormError('');
    try {
      const context = {
        name: formData.name,
        department: master.departments.find((d) => d._id === formData.department)?.name,
        item: master.items.find((i) => i._id === formData.item)?.name,
        fabric: master.fabrics.find((f) => f._id === formData.fabric)?.name,
      };
      const res = await api.post('/product/ai-description', { imageUrl: resolveImageUrl(imageUrl), context });
      applyDescriptionText(res.data.data.description);
    } catch (err) {
      setFormError(err.response?.data?.message || 'AI description generation failed');
    }
    setAiGenerating(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.department || !formData.item) {
      setFormError('Department and Category are both required.');
      return;
    }

    const cleanVariants = variants
      .filter((v) => v.colour && v.size && v.fit)
      .map((v) => ({
        ...v,
        stock: Number(v.stock) || 0,
        mrp: Number(v.mrp) || 0,
        sellingPrice: Number(v.sellingPrice) || 0,
      }));

    if (variants.length > 0 && cleanVariants.length !== variants.length) {
      setFormError('Every option row needs a colour, size and fit — or remove the incomplete row.');
      return;
    }
    if (cleanVariants.some((v) => !v.sku)) {
      setFormError('Every option row needs a stock code (it fills in automatically when you pick colour and size).');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData, variants: cleanVariants };
      ['design', 'fabric'].forEach((k) => { if (!payload[k]) delete payload[k]; });
      if (editingId) {
        await api.post('/product/update', { id: editingId, ...payload });
      } else {
        await api.post('/product/create', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  // Custom modal instead of window.confirm — matches the rest of this admin's
  // styled dialogs, and avoids the native confirm's blocking/jarring popup.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEscapeToClose(!!deleteTarget, () => setDeleteTarget(null));
  useSpaceToAdd(() => handleOpenModal(), isModalOpen || !!deleteTarget);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.post('/product/delete', { id: deleteTarget._id });
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Delete failed');
    }
    setDeleting(false);
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
      `Remove ${count} selected product${count === 1 ? '' : 's'} from the store? Past orders that include them keep their records.`,
      { confirmLabel: `Remove ${count}`, danger: true }
    ))) return;
    const ids = [...selected];
    const results = await Promise.allSettled(ids.map((id) => api.post('/product/delete', { id })));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      toast(`Removed ${ids.length - failed} of ${ids.length} — ${failed} failed`, 'error');
    } else {
      toast(`Removed ${ids.length} product${ids.length === 1 ? '' : 's'}`);
    }
    fetchData();
  };

  const handleBulkPriceUpdate = async () => {
    const value = Number(bulkPriceValue);
    if (!bulkPriceValue || Number.isNaN(value)) {
      toast('Enter a number', 'error');
      return;
    }
    setBulkPriceSaving(true);
    try {
      const res = await api.post('/product/bulk-price-update', { ids: [...selected], mode: bulkPriceMode, value });
      toast(res.data.message);
      setBulkPriceOpen(false);
      setBulkPriceValue('');
      setSelected(new Set());
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Bulk price update failed', 'error');
    }
    setBulkPriceSaving(false);
  };

  const handleDuplicate = async (row) => {
    try {
      await api.post('/product/duplicate', { id: row._id });
      toast(`Duplicated "${row.name}" as a draft`);
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not duplicate product', 'error');
    }
  };

  const priceRange = (row) => {
    const prices = (row.variants || []).map((v) => v.sellingPrice).filter((p) => p != null);
    if (prices.length === 0) return '—';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? inr(min) : `${inr(min)} – ${inr(max)}`;
  };

  const totalStock = (row) => (row.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);

  return (
    <div className="rounded-2xl border border-beige bg-white p-6 font-body">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl italic text-ink">Products</h2>
          <p className="mt-1 max-w-xl text-[13px] text-mauve-dark">
            Everything you sell. A product needs at least one option row (colour + size) with a price and stock before customers can buy it.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                onClick={() => setBulkPriceOpen(true)}
                className="flex items-center gap-2 rounded-full border border-beige px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream"
              >
                <Percent size={15} /> Adjust Prices ({selected.size})
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 rounded-full border border-red-700 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-red-700 transition-colors hover:bg-blush/60"
              >
                <Trash2 size={15} /> Delete Selected ({selected.size})
              </button>
            </>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
          >
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              <th className="w-9 py-2.5 pr-2">
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
              <th className="py-2.5 pr-3">Product</th>
              <th className="py-2.5 pr-3">Department</th>
              <th className="py-2.5 pr-3">Options</th>
              <th className="py-2.5 pr-3">In Stock</th>
              <th className="py-2.5 pr-3">Price</th>
              <th className="py-2.5 pr-3">Status</th>
              <th className="py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-mauve">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-mauve">No products yet — click "Add Product" and follow the steps.</td></tr>
            ) : (
              data.map((row) => (
                <tr key={row._id} className={`border-b border-beige/60 transition-colors hover:bg-cream/50 ${selected.has(row._id) ? 'bg-cream/70' : ''}`}>
                  <td className="py-3 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row._id)}
                      onChange={() => toggleSelect(row._id)}
                      aria-label="Select row"
                      className="h-4 w-4 cursor-pointer accent-ink"
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      {row.thumbnail ? (
                        <img src={resolveImageUrl(row.thumbnail)} alt="" className="h-11 w-9 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-11 w-9 items-center justify-center rounded-lg bg-cream">
                          <ImageOff size={14} className="text-mauve" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-ink">{row.name}</p>
                        <p className="text-[11px] text-mauve">{row.item?.name || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-mauve-dark">{row.department?.name || '—'}</td>
                  <td className="py-3 pr-3 text-mauve-dark">{row.variants?.length || 0}</td>
                  <td className="py-3 pr-3 text-mauve-dark">{totalStock(row)}</td>
                  <td className="py-3 pr-3 font-semibold text-ink">{priceRange(row)}</td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                      row.status === 'active' ? 'bg-pastel-green' : row.status === 'draft' ? 'bg-beige' : 'bg-blush'
                    } text-ink`}>
                      {row.status === 'active' ? 'Visible' : row.status === 'draft' ? 'Hidden' : 'Out of stock'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenModal(row)} className="rounded-lg p-2 text-ink transition-colors hover:bg-beige/60" aria-label="Edit">
                        <Pencil size={16} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleDuplicate(row)} className="rounded-lg p-2 text-ink transition-colors hover:bg-beige/60" aria-label="Duplicate">
                        <Copy size={16} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => { setDeleteError(''); setDeleteTarget(row); }} className="rounded-lg p-2 text-red-700 transition-colors hover:bg-blush/60" aria-label="Delete">
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
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-xl italic text-ink">{editingId ? 'Edit' : 'New'} Product</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-mauve hover:text-ink" aria-label="Close">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {formError && <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{formError}</div>}

            <form onSubmit={handleSave}>
              {/* 1. Basics */}
              <SectionTitle n="1" title="The basics" hint="What is it and where does it belong?" />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Product Name</label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="e.g. Isla Padded Everyday Bra"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className={`${labelClass} mb-0`}>Short Description</label>
                    <div className="flex items-center gap-2">
                      {master.descriptionTemplates.length > 0 && (
                        <Select
                          value=""
                          onChange={(val) => {
                            const tpl = master.descriptionTemplates.find((t) => t._id === val);
                            if (tpl) applyDescriptionText(tpl.body);
                          }}
                          options={master.descriptionTemplates.map((t) => ({ value: t._id, label: t.name }))}
                          placeholder="Insert template..."
                          className="w-48"
                          triggerClassName="flex w-full items-center justify-between gap-2 rounded-full border border-beige bg-white px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-ink outline-none transition-colors hover:bg-cream"
                        />
                      )}
                      <button
                        type="button"
                        onClick={handleAiDescription}
                        disabled={aiGenerating}
                        className="flex items-center gap-1.5 rounded-full border border-beige px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream disabled:opacity-50"
                      >
                        <Sparkles size={13} /> {aiGenerating ? 'Writing...' : 'Generate with AI'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="One friendly line shown under the product name, e.g. Breathable cotton, invisible under any top"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-mauve">
                    "Generate with AI" uses the uploaded main photo (or a pasted image URL if none is uploaded yet) to draft a description — always review before saving.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <Select
                    required
                    value={formData.department || ''}
                    onChange={(val) => setFormData({ ...formData, department: val })}
                    options={master.departments.map((o) => ({ value: o._id, label: o.name }))}
                  />
                  <QuickAdd label="Department" endpoint="department" onCreated={(doc) => { fetchMasterData(); setFormData((f) => ({ ...f, department: doc._id })); }} />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <Select
                    required
                    value={formData.item || ''}
                    onChange={(val) => setFormData({ ...formData, item: val })}
                    options={master.items.map((o) => ({ value: o._id, label: o.name }))}
                  />
                  <QuickAdd label="Category" endpoint="item" extraFields={['department']} departments={master.departments} onCreated={(doc) => { fetchMasterData(); setFormData((f) => ({ ...f, item: doc._id })); }} />
                </div>
              </div>

              {/* 2. Photos */}
              <SectionTitle n="2" title="Photos" hint="The main photo shows in lists; extra photos show on the product page." />
              <div className="mb-4">
                <label className={labelClass}>Main Photo</label>
                <div className="flex items-center gap-4">
                  {formData.thumbnail ? (
                    <img src={resolveImageUrl(formData.thumbnail)} alt="thumbnail" className="h-20 w-16 rounded-lg border border-beige object-cover" />
                  ) : (
                    <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-cream">
                      <ImageOff size={16} className="text-mauve" />
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-beige px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream">
                    <Upload size={14} />
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files[0])} />
                  </label>
                  {formData.thumbnail && (
                    <button
                      type="button"
                      onClick={() => { deleteImage(formData.thumbnail); setFormData({ ...formData, thumbnail: '' }); }}
                      className="text-xs text-mauve underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>More Photos (optional)</label>
                <div className="flex flex-wrap items-center gap-3">
                  {(formData.images || []).map((img, i) => (
                    <div key={i} className="relative">
                      <img src={resolveImageUrl(img)} alt="" className="h-20 w-16 rounded-lg border border-beige object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          deleteImage(img);
                          setFormData((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }));
                        }}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-cream"
                        aria-label="Remove image"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-20 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-beige text-mauve transition-colors hover:border-ink hover:text-ink">
                    <Plus size={16} />
                    <span className="text-[9px] uppercase">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleGalleryUpload([...e.target.files])} />
                  </label>
                </div>
              </div>

              {/* 3. Options & stock */}
              <SectionTitle n="3" title="Colours, sizes, price & stock" hint="One row per colour+size combination you sell. The stock code fills in automatically." />
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-mauve">
                <span>Missing an option?</span>
                <QuickAdd label="Colour" endpoint="colour" extraFields={['hexCode']} onCreated={fetchMasterData} />
                <QuickAdd label="Size" endpoint="size" onCreated={fetchMasterData} />
                <QuickAdd label="Fit" endpoint="fit" onCreated={fetchMasterData} />
              </div>

              {variants.length === 0 && (
                <p className="mb-3 rounded-xl bg-cream px-4 py-3 text-sm text-mauve">
                  Add at least one row — without it, customers can't buy this product.
                </p>
              )}

              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div key={idx} className="rounded-xl border border-beige p-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Colour</label>
                        <Select
                          value={v.colour}
                          onChange={(val) => setVariant(idx, 'colour', val)}
                          options={master.colours.map((o) => ({ value: o._id, label: o.name }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Size</label>
                        <Select
                          value={v.size}
                          onChange={(val) => setVariant(idx, 'size', val)}
                          options={master.sizes.map((o) => ({ value: o._id, label: o.name }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Fit</label>
                        <Select
                          value={v.fit}
                          onChange={(val) => setVariant(idx, 'fit', val)}
                          options={master.fits.map((o) => ({ value: o._id, label: o.name }))}
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_1fr_80px_100px_100px_36px] items-end gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Stock code (auto)</label>
                        <input type="text" placeholder="Fills automatically" value={v.sku} onChange={(e) => setVariant(idx, 'sku', e.target.value)} className={inputClass} required />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Barcode (optional)</label>
                        <input type="text" placeholder="e.g. from Alpha-E tag" value={v.barcode} onChange={(e) => setVariant(idx, 'barcode', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">In stock</label>
                        <input type="number" min="0" value={v.stock} onChange={(e) => setVariant(idx, 'stock', e.target.value)} onFocus={(e) => e.target.select()} className={inputClass} required />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Full price ₹</label>
                        <input type="number" min="0" placeholder="e.g. 1099" value={v.mrp} onChange={(e) => setVariant(idx, 'mrp', e.target.value)} className={inputClass} required />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Selling price ₹</label>
                        <input type="number" min="0" placeholder="e.g. 799" value={v.sellingPrice} onChange={(e) => setVariant(idx, 'sellingPrice', e.target.value)} className={inputClass} required />
                      </div>
                      <button
                        type="button"
                        onClick={() => setVariants((vs) => vs.filter((_, i) => i !== idx))}
                        className="flex h-10 w-9 items-center justify-center rounded-lg text-red-700 transition-colors hover:bg-blush/60"
                        aria-label="Remove row"
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setVariants((vs) => [...vs, { ...EMPTY_VARIANT, fit: vs[vs.length - 1]?.fit || '' }])}
                  className="flex items-center gap-1 rounded-full border border-beige px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-cream"
                >
                  <Plus size={12} /> Add another colour/size
                </button>
              </div>

              {/* 4. Visibility */}
              <SectionTitle n="4" title="Visibility" hint="Only 'Visible in store' products appear to customers." />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Status</label>
                  <Select
                    value={formData.status || 'active'}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={STATUS_OPTIONS}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={!!formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="h-4 w-4 accent-[#201820]"
                    />
                    Best Seller badge <span className="text-xs text-mauve">(also shows in the home-page Best Sellers row)</span>
                  </label>
                </div>
              </div>

              {/* Advanced */}
              <button type="button" onClick={() => setShowAdvanced((s) => !s)} className="mt-5 text-xs font-semibold text-mauve-dark underline underline-offset-2">
                {showAdvanced ? 'Hide' : 'Show'} advanced options (design, fabric, tax)
              </button>
              {showAdvanced && (
                <div className="mt-3 grid grid-cols-3 gap-4 rounded-xl bg-cream p-4">
                  <div>
                    <label className={labelClass}>Design</label>
                    <Select
                      value={formData.design || ''}
                      onChange={(val) => setFormData({ ...formData, design: val })}
                      options={master.designs.map((o) => ({ value: o._id, label: o.name }))}
                      placeholder="(None)"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fabric</label>
                    <Select
                      value={formData.fabric || ''}
                      onChange={(val) => setFormData({ ...formData, fabric: val })}
                      options={master.fabrics.map((o) => ({ value: o._id, label: o.name }))}
                      placeholder="(None)"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tax %</label>
                    <input type="number" min="0" value={formData.taxPercentage ?? 0} onChange={(e) => setFormData({ ...formData, taxPercentage: Number(e.target.value) })} className={inputClass} />
                  </div>
                </div>
              )}

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
                  disabled={saving || uploading}
                  className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 font-heading text-lg italic text-ink">Remove this product?</h3>
            <p className="mb-5 text-sm text-mauve-dark">
              "{deleteTarget.name}" will no longer show in the store. Past orders that include it keep their records.
            </p>
            {deleteError && <div className="mb-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{deleteError}</div>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-full border border-beige px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-full bg-red-700 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Remove Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkPriceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 font-heading text-lg italic text-ink">Adjust Prices</h3>
            <p className="mb-5 text-sm text-mauve-dark">
              Applies to every option (colour/size) of the {selected.size} selected product{selected.size === 1 ? '' : 's'} — each keeps its price relative to the others.
            </p>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">Adjustment Type</label>
              <Select
                value={bulkPriceMode}
                onChange={setBulkPriceMode}
                options={[
                  { value: 'percent', label: 'Percentage (%)' },
                  { value: 'fixed', label: 'Flat Amount (₹)' },
                ]}
              />
            </div>
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
                Value {bulkPriceMode === 'percent' ? '(e.g. 10 for +10%, -10 for -10%)' : '(e.g. 50 or -50)'}
              </label>
              <input
                type="number"
                autoFocus
                value={bulkPriceValue}
                onChange={(e) => setBulkPriceValue(e.target.value)}
                className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkPriceOpen(false)}
                disabled={bulkPriceSaving}
                className="rounded-full border border-beige px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkPriceUpdate}
                disabled={bulkPriceSaving}
                className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {bulkPriceSaving ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialog}
      {PromptDialog}
    </div>
  );
}
