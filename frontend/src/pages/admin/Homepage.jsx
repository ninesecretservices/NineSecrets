import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Upload, ImageOff, ExternalLink, Plus, Trash2, X, ChevronUp, ChevronDown,
  Eye, EyeOff, Rocket, History, Save, Monitor, Smartphone, PanelRightClose, PanelRight, CircleCheck, Video,
} from 'lucide-react';
import api, { resolveImageUrl } from '../../utils/api';
import { uploadFile, uploadMedia, deleteImage } from '../../utils/upload';
import { HOME_DEFAULTS, SECTION_LABELS, normalizeHomepage } from '../../utils/homeContent';

const inputClass =
  'w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink';
const pillBtn =
  'flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all';

function Card({ title, hint, children }) {
  return (
    <div className="mb-5 rounded-2xl border border-beige bg-white p-6">
      <h2 className="font-heading text-lg italic text-ink">{title}</h2>
      {hint && <p className="mb-4 mt-0.5 text-xs text-mauve">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </div>
  );
}

function ImagePicker({ value, onChange, defaultLabel = 'Using default image', className = 'h-32 w-24', folder = 'site' }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-4">
      {value ? (
        <img src={resolveImageUrl(value)} alt="" className={`${className} rounded-xl border border-beige object-cover object-top`} />
      ) : (
        <div className={`${className} flex flex-col items-center justify-center gap-1.5 rounded-xl bg-cream text-mauve`}>
          <ImageOff size={16} />
          <span className="px-2 text-center text-[9px]">{defaultLabel}</span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-beige px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream">
          <Upload size={13} />
          {busy ? 'Uploading...' : 'Upload'}
          <input
            type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              const f = e.target.files[0];
              if (!f) return;
              setBusy(true);
              const previous = value;
              try {
                onChange(await uploadFile(f, folder));
                if (previous) deleteImage(previous);
              } catch { /* surfaced elsewhere */ }
              setBusy(false);
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => { deleteImage(value); onChange(''); }}
            className="w-fit text-xs text-mauve underline"
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}

function ScheduleFields({ value, onChange }) {
  return (
    <div className="grid max-w-md grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>Starts (optional)</label>
        <input type="datetime-local" className={inputClass} value={value.start || ''} onChange={(e) => onChange({ start: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>Ends (optional)</label>
        <input type="datetime-local" className={inputClass} value={value.end || ''} onChange={(e) => onChange({ end: e.target.value })} />
      </div>
    </div>
  );
}

function ProductRowEditor({ title, config, onChange, allProducts }) {
  return (
    <div className="rounded-xl border border-beige p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink">{title}</p>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Eyebrow</label>
          <input className={inputClass} value={config.eyebrow} onChange={(e) => onChange({ eyebrow: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Heading</label>
          <input className={inputClass} value={config.heading} onChange={(e) => onChange({ heading: e.target.value })} />
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Products shown</label>
          <select className={inputClass} value={config.mode} onChange={(e) => onChange({ mode: e.target.value })}>
            <option value="featured">Auto — Featured products</option>
            <option value="newest">Auto — Newest products</option>
            <option value="custom">Hand-picked</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Max count</label>
          <input type="number" min="1" max="12" className={inputClass} value={config.count} onChange={(e) => onChange({ count: Number(e.target.value) || 4 })} />
        </div>
      </div>
      {config.mode === 'custom' && (
        <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl bg-cream p-3">
          {allProducts.length === 0 ? (
            <p className="text-xs text-mauve">No products in the catalogue yet.</p>
          ) : (
            allProducts.map((p) => (
              <label key={p._id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#201820]"
                  checked={config.productIds?.includes(p._id) || false}
                  onChange={(e) =>
                    onChange({
                      productIds: e.target.checked
                        ? [...(config.productIds || []), p._id]
                        : (config.productIds || []).filter((id) => id !== p._id),
                    })
                  }
                />
                {p.name}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Friendly destination picker — builds the URL so nobody types links by hand.
const PAGE_OPTIONS = [
  { value: '/fit-guide', label: 'Fit Guide' },
  { value: '/about', label: 'About Us' },
  { value: '/policies', label: 'Help & Policies' },
  { value: '/policies#exchange', label: 'Exchange Policy' },
  { value: '/policies#contact', label: 'Contact Us' },
];

const parseLink = (link) => {
  if (!link || link === '/collection') return { type: 'all' };
  if (link === '/collection?sort=newest') return { type: 'newest' };
  const item = link.match(/^\/collection\?item=([^&]+)/);
  if (item) return { type: 'category', id: decodeURIComponent(item[1]) };
  const prod = link.match(/^\/product\/(.+)$/);
  if (prod) return { type: 'product', slug: decodeURIComponent(prod[1]) };
  if (PAGE_OPTIONS.some((p) => p.value === link)) return { type: 'page', page: link };
  return { type: 'custom', value: link };
};

function LinkPicker({ value, onChange, categories, products }) {
  // "Custom" must stick even while its value is empty or parseable as
  // something else — an empty custom link would otherwise snap back to "All products".
  const [forceCustom, setForceCustom] = useState(false);
  const parsed = forceCustom ? { type: 'custom', value } : parseLink(value);
  const secondary = 'flex-grow rounded-xl border border-beige bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink';

  const setType = (type) => {
    setForceCustom(type === 'custom');
    if (type === 'all') onChange('/collection');
    else if (type === 'newest') onChange('/collection?sort=newest');
    else if (type === 'category') {
      const c = categories[0];
      onChange(c ? `/collection?item=${c._id}&cat=${encodeURIComponent(c.name)}` : '/collection');
    } else if (type === 'product') {
      const p = products[0];
      onChange(p ? `/product/${p.slug}` : '/collection');
    } else if (type === 'page') onChange(PAGE_OPTIONS[0].value);
    // 'custom': keep the current URL as the editable starting point
  };

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Where should it go?</label>
      <div className="flex flex-wrap gap-2">
        <select value={parsed.type} onChange={(e) => setType(e.target.value)} className={secondary} style={{ flexGrow: 0, minWidth: 170 }}>
          <option value="all">All products</option>
          <option value="newest">New arrivals</option>
          <option value="category">A category</option>
          <option value="product">A specific product</option>
          <option value="page">A page</option>
          <option value="custom">Custom link (advanced)</option>
        </select>
        {parsed.type === 'category' && (
          <select
            value={parsed.id || ''}
            onChange={(e) => {
              const c = categories.find((x) => x._id === e.target.value);
              if (c) onChange(`/collection?item=${c._id}&cat=${encodeURIComponent(c.name)}`);
            }}
            className={secondary}
          >
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}
        {parsed.type === 'product' && (
          <select
            value={parsed.slug || ''}
            onChange={(e) => onChange(`/product/${e.target.value}`)}
            className={secondary}
          >
            {products.length === 0 && <option value="">No products yet</option>}
            {products.map((p) => <option key={p._id} value={p.slug}>{p.name}</option>)}
          </select>
        )}
        {parsed.type === 'page' && (
          <select value={parsed.page || PAGE_OPTIONS[0].value} onChange={(e) => onChange(e.target.value)} className={secondary}>
            {PAGE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        )}
        {parsed.type === 'custom' && (
          <input value={parsed.value || ''} onChange={(e) => onChange(e.target.value)} placeholder="/collection?search=..." className={secondary} />
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'layout', label: 'Layout' },
  { id: 'hero', label: 'Hero' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'usp', label: 'USP Strip' },
  { id: 'categories', label: 'Categories' },
  { id: 'rows', label: 'Product Rows' },
  { id: 'promise', label: 'Promise' },
  { id: 'instagram', label: 'Instagram' },
];

export default function Homepage() {
  const [content, setContent] = useState(normalizeHomepage(HOME_DEFAULTS));
  const [meta, setMeta] = useState({ hasDraft: false, versions: [], updatedByName: null, updatedAt: null });
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState(() => {
    const h = window.location.hash.replace('#', '');
    return TABS.some((t) => t.id === h) ? h : 'layout';
  });
  const [livePreview, setLivePreview] = useState(() => window.innerWidth >= 1280);
  const [device, setDevice] = useState('mobile');
  const iframeRef = useRef(null);

  const postToPreview = useCallback((msg) => {
    iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  // Always-current content for the ready-handshake below (avoids stale closures).
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  // When the preview app finishes booting it announces itself — reply with the
  // current draft. Pushes sent before its listener existed would be lost.
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'ns-preview-ready') {
        postToPreview({ type: 'ns-preview-content', content: contentRef.current });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postToPreview]);

  // Push draft content into the live preview as it is edited (debounced).
  useEffect(() => {
    if (!livePreview) return;
    const t = setTimeout(() => postToPreview({ type: 'ns-preview-content', content }), 150);
    return () => clearTimeout(t);
  }, [content, livePreview, postToPreview]);

  // Scroll the preview to the section being edited.
  useEffect(() => {
    if (!livePreview) return;
    const section = {
      layout: 'top', hero: 'hero', announcements: 'top', usp: 'usp',
      categories: 'categories', rows: 'bestsellers', promise: 'promise', instagram: 'instagram',
    }[tab];
    postToPreview({ type: 'ns-scroll', section });
  }, [tab, livePreview, postToPreview]);
  const [allCategories, setAllCategories] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await api.post('/setting/detail', { key: 'homepage' });
      const d = res.data.data;
      setContent(normalizeHomepage(d.draft ?? d.published));
      setMeta({ hasDraft: d.hasDraft, versions: d.versions, updatedByName: d.updatedByName, updatedAt: d.updatedAt });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Only a superadmin can edit storefront content.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    api.post('/product/list', { page: 1, limit: 100 })
      .then((res) => setAllProducts(res.data.data.docs || []))
      .catch(() => {});
    api.post('/item/list', { page: 1, limit: 100 })
      .then((res) => setAllCategories(res.data.data.docs || []))
      .catch(() => {});
  }, [load]);

  // Any edit marks the page "dirty" until the next save/publish.
  const [dirty, setDirty] = useState(false);

  const patch = (path, value) => {
    setDirty(true);
    setContent((c) => {
      const next = { ...c };
      if (typeof path === 'string') next[path] = value;
      else next[path[0]] = { ...c[path[0]], ...value };
      return next;
    });
  };

  const act = async (fn, okText) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ ok: true, text: okText });
      await load();
      setDirty(false);
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Action failed' });
    }
    setBusy(false);
  };

  const saveDraft = () => act(() => api.post('/setting/save-draft', { key: 'homepage', value: content }), 'Draft saved — the live site is unchanged.');
  const publish = () => {
    if (!window.confirm('Publish these changes? Shoppers will see them immediately.')) return;
    act(() => api.post('/setting/publish', { key: 'homepage', value: content }), 'Published! The storefront is updated.');
  };
  const revert = (i) => {
    if (!window.confirm('Restore this version? It goes live immediately (the current version is kept in history).')) return;
    setShowHistory(false);
    act(() => api.post('/setting/revert', { key: 'homepage', versionIndex: i }), 'Version restored — it is now live.');
  };
  const openFullPreview = async () => {
    await act(() => api.post('/setting/save-draft', { key: 'homepage', value: content }));
    window.open('/?preview=1', '_blank');
  };
  // One Preview control: toggles the side pane; on screens too small for it,
  // falls back to opening the draft in a new tab.
  const togglePreview = () => {
    if (window.innerWidth < 1280) {
      openFullPreview();
      return;
    }
    setLivePreview((v) => !v);
  };

  const moveSection = (idx, dir) => {
    setDirty(true);
    return setContent((c) => {
      const order = [...c.sectionsOrder];
      const j = idx + dir;
      if (j < 0 || j >= order.length) return c;
      [order[idx], order[j]] = [order[j], order[idx]];
      return { ...c, sectionsOrder: order };
    });
  };

  if (loading) return <p className="py-10 text-center text-mauve">Loading...</p>;

  return (
    // Fixed-chrome layout (like Shopify): header never scrolls; only the tab
    // content column scrolls. -m-8 escapes AdminLayout's padding; the height
    // fills the viewport below the 64px admin top bar.
    <div className="-m-8 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Fixed header: title, actions, tabs, notices */}
      <div className="relative z-10 flex-shrink-0 bg-cream px-8 pb-3 pt-6 shadow-[0_14px_18px_-16px_rgba(32,24,32,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl italic text-ink">Homepage</h1>
            {meta.updatedByName && (
              <p className="text-xs text-mauve">Last edited by {meta.updatedByName}{meta.updatedAt ? ` · ${new Date(meta.updatedAt).toLocaleString()}` : ''}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Save: primary (dark) only while there are unsaved changes */}
            <button
              onClick={saveDraft}
              disabled={busy || !dirty}
              className={`${pillBtn} ${dirty ? 'bg-ink text-cream hover:opacity-85' : 'border border-beige bg-white text-mauve'} disabled:opacity-60`}
              title={dirty ? 'Save your changes as a draft (site unchanged)' : 'All changes saved'}
            >
              {dirty ? <><Save size={13} /> Save Draft</> : <><CircleCheck size={13} /> Saved</>}
            </button>

            {/* One Preview control: toggles the live pane (new tab on small screens) */}
            <button
              onClick={togglePreview}
              disabled={busy}
              className={`${pillBtn} ${livePreview ? 'bg-ink text-cream' : 'border border-ink bg-white text-ink hover:bg-ink hover:text-cream'} disabled:opacity-50`}
              title="See the store with your changes, updating live as you type"
            >
              <PanelRight size={13} /> Preview
            </button>

            {/* Publish: friendly green "go live", with confirmation */}
            <button
              onClick={publish}
              disabled={busy || (!dirty && !meta.hasDraft)}
              className={`${pillBtn} bg-pastel-green text-ink hover:brightness-95 disabled:opacity-50`}
              title="Make these changes live for shoppers"
            >
              <Rocket size={13} /> Publish
            </button>

            {/* History: anchored dropdown so it opens right under the button */}
            <div className="relative">
              <button
                onClick={() => setShowHistory((s) => !s)}
                className={`${pillBtn} ${showHistory ? 'bg-ink text-cream' : 'border border-beige bg-white text-ink hover:bg-cream'}`}
              >
                <History size={13} /> History ({meta.versions.length})
              </button>
              {showHistory && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[400px] rounded-2xl border border-beige bg-white p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink">Previously published versions</p>
                    <button onClick={() => setShowHistory(false)} className="text-mauve hover:text-ink" aria-label="Close history">
                      <X size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                  {meta.versions.length === 0 ? (
                    <p className="py-3 text-sm text-mauve">No history yet — a version is saved each time you publish.</p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto">
                      {meta.versions.map((v) => (
                        <div key={v.index} className="flex items-center justify-between gap-3 rounded-xl bg-cream px-4 py-2.5 text-sm">
                          <span className="min-w-0 text-ink">
                            {new Date(v.publishedAt).toLocaleString()}
                            <span className="block text-xs text-mauve">by {v.publishedBy || 'unknown'}</span>
                          </span>
                          <button
                            onClick={() => revert(v.index)}
                            className="flex-shrink-0 rounded-full border border-ink px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink transition-all hover:bg-ink hover:text-cream"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-mauve">Restoring makes that version live immediately — the current one is kept here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); window.history.replaceState(null, '', `#${t.id}`); }}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                tab === t.id ? 'border-ink bg-ink text-cream' : 'border-beige bg-white text-ink hover:bg-cream'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {meta.hasDraft && (
          <p className="mt-3 rounded-xl bg-baby-pink px-4 py-2 text-xs text-ink">
            You have unpublished draft changes — shoppers still see the last published version.
          </p>
        )}
        {msg && (
          <p className={`mt-3 rounded-xl px-4 py-2 text-sm text-ink ${msg.ok ? 'bg-pastel-green' : 'bg-blush'}`}>{msg.text}</p>
        )}
      </div>

      {/* Below the fixed header: scrollable editor column + fixed preview pane */}
      <div className="flex min-h-0 flex-grow justify-center gap-8 overflow-hidden px-8 pb-6 pt-5">
      <div className={`min-w-0 flex-grow overflow-y-auto pr-1 ${livePreview ? 'max-w-2xl' : 'mx-auto max-w-4xl'}`}>


      {/* Sections order & visibility */}
      {tab === 'layout' && (
      <Card title="Page Layout" hint="This is your home page from top to bottom (the big hero banner is always first). Use the arrows to reorder, and Show/Hide to turn a section off without losing its content.">
        <div className="space-y-2">
          {content.sectionsOrder.map((key, i) => {
            const hidden = content.sectionsVisible[key] === false;
            // Describe each section with ITS OWN current content so it's recognisable.
            const preview = {
              usp: (content.usp || []).map((u) => u.label).filter(Boolean).join(' · '),
              categories: `Cards: ${(content.categories || []).map((c) => c.title).filter(Boolean).join(', ')}`,
              bestsellers: `Product slider — "${content.bestsellers.heading}"`,
              justarrived: `Product slider — "${content.justarrived.heading}"`,
              promise: `"${(content.promise.heading || '').split('\n')[0]}" with photo`,
              instagram: 'Photo grid + "Follow us on Instagram" button',
            }[key];
            const editTab = { usp: 'usp', categories: 'categories', bestsellers: 'rows', justarrived: 'rows', promise: 'promise', instagram: 'instagram' }[key];
            return (
              <div key={key} className={`rounded-xl px-4 py-3 ${hidden ? 'bg-cream/50' : 'bg-cream'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${hidden ? 'text-mauve' : 'text-ink'}`}>
                        {i + 1}. {SECTION_LABELS[key] || key}
                      </span>
                      {hidden && (
                        <span className="rounded-full bg-beige px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-mauve-dark">
                          Hidden from shoppers
                        </span>
                      )}
                    </div>
                    {preview && (
                      <p className={`mt-0.5 truncate text-xs ${hidden ? 'text-mauve/60' : 'text-mauve-dark'}`}>{preview}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    {editTab && (
                      <button
                        onClick={() => { setTab(editTab); window.history.replaceState(null, '', `#${editTab}`); }}
                        className="rounded-full border border-beige bg-white px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:bg-beige/60"
                      >
                        Edit content
                      </button>
                    )}
                    <button
                      onClick={() => patch(['sectionsVisible'], { [key]: hidden })}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        hidden ? 'bg-beige text-mauve-dark hover:bg-pastel-green hover:text-ink' : 'bg-pastel-green text-ink hover:bg-beige'
                      }`}
                      aria-label="Toggle visibility"
                    >
                      {hidden ? <><EyeOff size={13} strokeWidth={1.5} /> Show</> : <><Eye size={13} strokeWidth={1.5} /> Shown</>}
                    </button>
                    <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-ink hover:bg-beige/70 disabled:opacity-25" aria-label="Move up">
                      <ChevronUp size={15} strokeWidth={1.5} />
                    </button>
                    <button onClick={() => moveSection(i, 1)} disabled={i === content.sectionsOrder.length - 1} className="rounded-lg p-1.5 text-ink hover:bg-beige/70 disabled:opacity-25" aria-label="Move down">
                      <ChevronDown size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-mauve">
          Not sure what a section looks like? Click <b>Preview</b> above — it opens the store showing your current draft.
        </p>
      </Card>
      )}

      {/* Hero */}
      {tab === 'hero' && (
      <Card title="Hero" hint="The big banner at the top of the home page.">
        <div className="mb-5">
          <label className={labelClass}>Image (portrait, ~900×1100)</label>
          <ImagePicker value={content.hero.image} onChange={(v) => patch(['hero'], { image: v })} folder="site/hero" />
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input className={inputClass} value={content.hero.eyebrow} onChange={(e) => patch(['hero'], { eyebrow: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Heading (line breaks kept)</label>
            <textarea rows={3} className="w-full rounded-xl border border-beige bg-white px-4 py-2.5 font-heading text-lg italic text-ink outline-none focus:border-ink" value={content.hero.heading} onChange={(e) => patch(['hero'], { heading: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Subtext</label>
            <textarea rows={2} className={inputClass} value={content.hero.subtext} onChange={(e) => patch(['hero'], { subtext: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Trust line (optional — e.g. "Free Shipping · COD Available · Easy Return")</label>
            <input className={inputClass} placeholder="Leave blank to hide" value={content.hero.features || ''} onChange={(e) => patch(['hero'], { features: e.target.value })} />
          </div>
          <div className="max-w-xs">
            <label className={labelClass}>Button Label</label>
            <input className={inputClass} value={content.hero.ctaLabel} onChange={(e) => patch(['hero'], { ctaLabel: e.target.value })} />
          </div>
          <div className="max-w-md">
            <LinkPicker
              value={content.hero.link || '/collection'}
              onChange={(link) => patch(['hero'], { link })}
              categories={allCategories}
              products={allProducts}
            />
          </div>
        </div>

        {/* Carousel slides */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <label className={labelClass + ' !mb-0'}>Carousel Slides (optional — rotate every 5s)</label>
            {(content.hero.slides || []).length < 2 && (
              <button
                type="button"
                onClick={() => patch(['hero'], { slides: [...(content.hero.slides || []), { image: '', eyebrow: '', heading: '', subtext: '', ctaLabel: 'Shop Now', link: '/collection' }] })}
                className="flex items-center gap-1 rounded-full border border-beige px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink hover:bg-cream"
              >
                <Plus size={12} /> Add Slide
              </button>
            )}
          </div>
          <p className="mb-3 text-xs text-mauve">The main hero above is slide 1. Add up to 2 more promotional slides, each clickable to its own destination.</p>
          <div className="space-y-4">
            {(content.hero.slides || []).map((sl, i) => (
              <div key={i} className="rounded-xl border border-beige p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink">Slide {i + 2}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (sl.image) deleteImage(sl.image);
                      patch(['hero'], { slides: content.hero.slides.filter((_, j) => j !== i) });
                    }}
                    className="rounded-lg p-1.5 text-red-700 hover:bg-blush/60"
                    aria-label="Remove slide"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="mb-3">
                  <ImagePicker
                    value={sl.image}
                    onChange={(v) => patch(['hero'], { slides: content.hero.slides.map((x, j) => (j === i ? { ...x, image: v } : x)) })}
                    className="h-24 w-20"
                    defaultLabel="No image"
                    folder="site/hero"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputClass} placeholder="Eyebrow (e.g. Sale)" value={sl.eyebrow || ''} onChange={(e) => patch(['hero'], { slides: content.hero.slides.map((x, j) => (j === i ? { ...x, eyebrow: e.target.value } : x)) })} />
                  <input className={inputClass} placeholder="Button label" value={sl.ctaLabel || ''} onChange={(e) => patch(['hero'], { slides: content.hero.slides.map((x, j) => (j === i ? { ...x, ctaLabel: e.target.value } : x)) })} />
                </div>
                <textarea rows={2} className={`${inputClass} mt-3 font-heading italic`} placeholder="Slide heading (line breaks kept)" value={sl.heading || ''} onChange={(e) => patch(['hero'], { slides: content.hero.slides.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)) })} />
                <textarea rows={2} className={`${inputClass} mt-3`} placeholder="Subtext" value={sl.subtext || ''} onChange={(e) => patch(['hero'], { slides: content.hero.slides.map((x, j) => (j === i ? { ...x, subtext: e.target.value } : x)) })} />
                <input className={`${inputClass} mt-3`} placeholder="Trust line (optional)" value={sl.features || ''} onChange={(e) => patch(['hero'], { slides: content.hero.slides.map((x, j) => (j === i ? { ...x, features: e.target.value } : x)) })} />
                <div className="mt-3 max-w-md">
                  <LinkPicker
                    value={sl.link || '/collection'}
                    onChange={(link) => patch(['hero'], { slides: content.hero.slides.map((x, j) => (j === i ? { ...x, link } : x)) })}
                    categories={allCategories}
                    products={allProducts}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign override */}
        <div className="mt-6 rounded-xl bg-cream p-4">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox" className="h-4 w-4 accent-[#201820]"
              checked={content.hero.campaign.enabled}
              onChange={(e) => patch(['hero'], { campaign: { ...content.hero.campaign, enabled: e.target.checked } })}
            />
            Scheduled campaign hero (e.g. a sale banner that switches on and off automatically)
          </label>
          {content.hero.campaign.enabled && (
            <div className="space-y-3">
              <ScheduleFields value={content.hero.campaign} onChange={(p) => patch(['hero'], { campaign: { ...content.hero.campaign, ...p } })} />
              <div>
                <label className={labelClass}>Campaign Image (optional — falls back to the main hero image)</label>
                <ImagePicker value={content.hero.campaign.image} onChange={(v) => patch(['hero'], { campaign: { ...content.hero.campaign, image: v } })} className="h-24 w-20" defaultLabel="Main hero image" folder="site/hero" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} placeholder="Campaign eyebrow" value={content.hero.campaign.eyebrow} onChange={(e) => patch(['hero'], { campaign: { ...content.hero.campaign, eyebrow: e.target.value } })} />
                <input className={inputClass} placeholder="Campaign button label" value={content.hero.campaign.ctaLabel} onChange={(e) => patch(['hero'], { campaign: { ...content.hero.campaign, ctaLabel: e.target.value } })} />
              </div>
              <textarea rows={2} className={inputClass} placeholder="Campaign heading (line breaks kept)" value={content.hero.campaign.heading} onChange={(e) => patch(['hero'], { campaign: { ...content.hero.campaign, heading: e.target.value } })} />
              <textarea rows={2} className={inputClass} placeholder="Campaign subtext" value={content.hero.campaign.subtext} onChange={(e) => patch(['hero'], { campaign: { ...content.hero.campaign, subtext: e.target.value } })} />
              <input className={inputClass} placeholder="Campaign trust line (optional)" value={content.hero.campaign.features || ''} onChange={(e) => patch(['hero'], { campaign: { ...content.hero.campaign, features: e.target.value } })} />
            </div>
          )}
        </div>
      </Card>
      )}

      {/* Announcements */}
      {tab === 'announcements' && (
      <Card title="Announcement Bar" hint="Rotating messages at the very top of every page. Each can have its own link and schedule.">
        <label className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" className="h-4 w-4 accent-[#201820]" checked={content.announcementsEnabled !== false} onChange={(e) => patch('announcementsEnabled', e.target.checked)} />
          Show the announcement bar
        </label>
        <div className="space-y-3">
          {content.announcements.map((a, i) => (
            <div key={i} className="rounded-xl border border-beige p-3">
              <div className="mb-2 flex items-center gap-2">
                <input className={inputClass} placeholder="Message" value={a.text} onChange={(e) => patch('announcements', content.announcements.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                <button onClick={() => patch('announcements', content.announcements.filter((_, j) => j !== i))} disabled={content.announcements.length <= 1} className="rounded-lg p-2 text-red-700 hover:bg-blush/60 disabled:opacity-30" aria-label="Remove">
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
              <div className="space-y-2">
                <LinkPicker
                  value={a.link || ''}
                  onChange={(link) => patch('announcements', content.announcements.map((x, j) => (j === i ? { ...x, link } : x)))}
                  categories={allCategories}
                  products={allProducts}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Shows from (optional)</label>
                    <input type="datetime-local" className={inputClass} value={a.start || ''} onChange={(e) => patch('announcements', content.announcements.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Until (optional)</label>
                    <input type="datetime-local" className={inputClass} value={a.end || ''} onChange={(e) => patch('announcements', content.announcements.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {content.announcements.length < 5 && (
            <button onClick={() => patch('announcements', [...content.announcements, { text: '', link: '', start: '', end: '' }])} className={`${pillBtn} border border-beige text-ink hover:bg-cream`}>
              <Plus size={12} /> Add Message
            </button>
          )}
        </div>
      </Card>
      )}

      {/* USP */}
      {tab === 'usp' && (
      <Card title="USP Strip" hint="The four small badges under the hero.">
        <div className="grid grid-cols-2 gap-3">
          {content.usp.map((u, i) => (
            <div key={i} className="flex gap-2">
              <input className="w-14 rounded-xl border border-beige bg-white px-3 py-2.5 text-center text-sm text-ink outline-none focus:border-ink" value={u.icon} onChange={(e) => patch('usp', content.usp.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))} />
              <input className={inputClass} value={u.label} onChange={(e) => patch('usp', content.usp.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            </div>
          ))}
        </div>
      </Card>
      )}

      {/* Categories */}
      {tab === 'categories' && (
      <Card title="Category Tiles" hint="The 'Shop by Category' cards — image, title, subtitle, and where each links.">
        <div className="space-y-4">
          {content.categories.map((cat, i) => (
            <div key={i} className="flex flex-wrap items-start gap-4 rounded-xl border border-beige p-3">
              <ImagePicker value={cat.image} onChange={(v) => patch('categories', content.categories.map((x, j) => (j === i ? { ...x, image: v } : x)))} className="h-24 w-20" defaultLabel="No image" folder="site/categories" />
              <div className="min-w-[220px] flex-grow space-y-2">
                <input className={inputClass} placeholder="Title" value={cat.title} onChange={(e) => patch('categories', content.categories.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <input className={inputClass} placeholder="Subtitle (e.g. 32 styles)" value={cat.count} onChange={(e) => patch('categories', content.categories.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))} />
                <LinkPicker
                  value={cat.link}
                  onChange={(link) => patch('categories', content.categories.map((x, j) => (j === i ? { ...x, link } : x)))}
                  categories={allCategories}
                  products={allProducts}
                />
              </div>
              <button
                onClick={() => {
                  if (cat.image) deleteImage(cat.image);
                  patch('categories', content.categories.filter((_, j) => j !== i));
                }}
                disabled={content.categories.length <= 1}
                className="rounded-lg p-2 text-red-700 hover:bg-blush/60 disabled:opacity-30"
                aria-label="Remove tile"
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </div>
          ))}
          {content.categories.length < 8 && (
            <button onClick={() => patch('categories', [...content.categories, { image: '', title: '', count: '', link: '/collection' }])} className={`${pillBtn} border border-beige text-ink hover:bg-cream`}>
              <Plus size={12} /> Add Tile
            </button>
          )}
        </div>
      </Card>
      )}

      {/* Product rows */}
      {tab === 'rows' && (
      <Card title="Product Rows" hint="What appears in the two product scrollers — automatic or hand-picked.">
        <div className="space-y-4">
          <ProductRowEditor title="Best Sellers row" config={content.bestsellers} onChange={(p) => patch(['bestsellers'], p)} allProducts={allProducts} />
          <ProductRowEditor title="Just Arrived row" config={content.justarrived} onChange={(p) => patch(['justarrived'], p)} allProducts={allProducts} />
        </div>
      </Card>
      )}

      {/* Promise */}
      {tab === 'promise' && (
      <Card title="Promise Section" hint="The beige brand-story split section.">
        <div className="mb-5">
          <label className={labelClass}>Image</label>
          <ImagePicker value={content.promise.image} onChange={(v) => patch(['promise'], { image: v })} folder="site/promise" />
        </div>
        <div className="space-y-4">
          <input className={inputClass} placeholder="Eyebrow" value={content.promise.eyebrow} onChange={(e) => patch(['promise'], { eyebrow: e.target.value })} />
          <textarea rows={3} className="w-full rounded-xl border border-beige bg-white px-4 py-2.5 font-heading text-lg italic text-ink outline-none focus:border-ink" placeholder="Heading" value={content.promise.heading} onChange={(e) => patch(['promise'], { heading: e.target.value })} />
          <textarea rows={3} className={inputClass} placeholder="Body copy" value={content.promise.body} onChange={(e) => patch(['promise'], { body: e.target.value })} />
          <div className="max-w-xs">
            <input className={inputClass} placeholder="Button label" value={content.promise.ctaLabel} onChange={(e) => patch(['promise'], { ctaLabel: e.target.value })} />
          </div>
        </div>
      </Card>
      )}

      {/* Instagram */}
      {tab === 'instagram' && (
      <Card title="Instagram Grid" hint="Behold feed (auto), or uploaded photos, or the default set.">
        <div className="mb-4 max-w-md">
          <label className={labelClass}>Instagram Profile URL</label>
          <input className={inputClass} value={content.instagram.profileUrl} onChange={(e) => patch(['instagram'], { profileUrl: e.target.value })} />
        </div>
        <div className="mb-5 max-w-md">
          <label className={labelClass}>Behold Feed URL (optional — auto-syncs the grid)</label>
          <input className={inputClass} placeholder="https://feeds.behold.so/XXXXXXXXXX" value={content.instagram.beholdUrl || ''} onChange={(e) => patch(['instagram'], { beholdUrl: e.target.value.trim() })} />
        </div>
        <label className={labelClass}>Manual photos & videos (used when no Behold feed)</label>
        <p className="mb-3 text-xs text-mauve">Short video clips work here too — a mute icon shows on the tile automatically, matching Instagram Reels-style previews.</p>
        <div className="flex flex-wrap items-center gap-3">
          {(content.instagram.images || []).map((item, i) => {
            const media = typeof item === 'string' ? { url: item, type: 'image' } : item;
            return (
              <div key={i} className="relative">
                {media.type === 'video' ? (
                  <video src={resolveImageUrl(media.url)} className="h-20 w-20 rounded-xl border border-beige object-cover" muted playsInline />
                ) : (
                  <img src={resolveImageUrl(media.url)} alt="" className="h-20 w-20 rounded-xl border border-beige object-cover" />
                )}
                {media.type === 'video' && (
                  <span className="absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink/70 text-cream">
                    <Video size={9} />
                  </span>
                )}
                <button
                  onClick={() => {
                    deleteImage(media.url);
                    patch(['instagram'], { images: content.instagram.images.filter((_, j) => j !== i) });
                  }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-cream"
                  aria-label="Remove"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
          {(content.instagram.images || []).length < 6 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-beige text-mauve transition-colors hover:border-ink hover:text-ink">
              <Plus size={16} />
              <span className="text-[9px] uppercase">Add</span>
              <input
                type="file" accept="image/*,video/*" multiple className="hidden"
                onChange={async (e) => {
                  const files = [...e.target.files];
                  const uploaded = [];
                  for (const f of files) {
                    try { uploaded.push(await uploadMedia(f, 'site/instagram')); } catch { /* skip failed */ }
                  }
                  patch(['instagram'], { images: [...(content.instagram.images || []), ...uploaded].slice(0, 6) });
                }}
              />
            </label>
          )}
        </div>
      </Card>
      )}

      </div>

      {/* Shopify-style live preview: the real storefront, fed the draft as you type */}
      {livePreview && (
        <div className="hidden flex-shrink-0 xl:block">
          <div
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-beige bg-white shadow-xl"
            style={{ width: device === 'mobile' ? 383 : 528 }}
          >
            {/* Pane header */}
            <div className="flex items-center justify-between border-b border-beige bg-cream px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve-dark">
                Live Preview <span className="hidden font-normal normal-case text-mauve 2xl:inline">— updates as you type</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDevice('mobile')}
                  className={`rounded-lg p-1.5 ${device === 'mobile' ? 'bg-ink text-cream' : 'text-mauve hover:bg-beige/60'}`}
                  aria-label="Phone preview" title="Phone view"
                >
                  <Smartphone size={14} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setDevice('desktop')}
                  className={`rounded-lg p-1.5 ${device === 'desktop' ? 'bg-ink text-cream' : 'text-mauve hover:bg-beige/60'}`}
                  aria-label="Desktop preview" title="Desktop view"
                >
                  <Monitor size={14} strokeWidth={1.5} />
                </button>
                <div className="mx-1 h-4 w-px bg-beige" />
                <button
                  onClick={openFullPreview}
                  className="rounded-lg p-1.5 text-mauve hover:bg-beige/60 hover:text-ink"
                  aria-label="Open in new tab" title="Open full preview in a new tab"
                >
                  <ExternalLink size={14} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setLivePreview(false)}
                  className="flex items-center gap-1 rounded-lg p-1.5 text-mauve hover:bg-beige/60 hover:text-ink"
                  aria-label="Hide preview" title="Hide preview"
                >
                  <PanelRightClose size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Frame */}
            <div style={{ width: device === 'mobile' ? 375 : 520, margin: '0 auto' }} className="min-h-0 flex-grow overflow-hidden">
              {device === 'mobile' ? (
                <iframe
                  ref={iframeRef}
                  title="Storefront preview"
                  src={`${window.location.origin}/?preview=1`}
                  className="h-full w-full"
                  onLoad={() => postToPreview({ type: 'ns-preview-content', content })}
                />
              ) : (
                <iframe
                  ref={iframeRef}
                  title="Storefront preview"
                  src={`${window.location.origin}/?preview=1`}
                  style={{ width: 1280, height: '246.2%', transform: 'scale(0.40625)', transformOrigin: 'top left' }}
                  onLoad={() => postToPreview({ type: 'ns-preview-content', content })}
                />
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
