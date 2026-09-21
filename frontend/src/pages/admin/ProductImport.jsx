import { useState } from 'react';
import { FileSpreadsheet, Upload, CircleCheck, CircleAlert, RotateCcw, Download } from 'lucide-react';
import api from '../../utils/api';

// Maps a normalized header (lowercased, spaces/underscores stripped) to the
// field name the backend expects. Several common spellings per field so a
// real-world export doesn't have to match one exact string.
const HEADER_MAP = {
  productname: 'productName', product: 'productName', name: 'productName',
  department: 'department',
  category: 'category', item: 'category',
  design: 'design',
  fabric: 'fabric',
  description: 'description',
  colour: 'colour', color: 'colour',
  size: 'size',
  fit: 'fit',
  sku: 'sku',
  barcode: 'barcode',
  mrp: 'mrp',
  sellingprice: 'sellingPrice', price: 'sellingPrice',
  stock: 'stock', quantity: 'stock', qty: 'stock',
  status: 'status',
  featured: 'featured',
  tax: 'taxPercentage', taxpercentage: 'taxPercentage', taxpercent: 'taxPercentage',
};

const normalize = (h) => String(h || '').trim().toLowerCase().replace(/[\s_%]+/g, '');

const parseCsv = (text) =>
  text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => line.split(',').map((c) => c.replace(/^"|"$/g, '').trim()));

const SAMPLE_CSV = `Product Name,Department,Category,Design,Fabric,Description,Colour,Size,Fit,SKU,Barcode,MRP,Selling Price,Stock,Status,Featured,Tax%
Navy Blue T-shirt Set,Women,Everyday Night Suit,,,Navy blue crew-neck T-shirt with matching pyjama bottoms,Navy Blue,S,Skin,NS-SAMPLE-NVY-S,,699,499,10,active,no,0
Navy Blue T-shirt Set,Women,Everyday Night Suit,,,Navy blue crew-neck T-shirt with matching pyjama bottoms,Navy Blue,M,Skin,NS-SAMPLE-NVY-M,,699,499,25,active,no,0
`;

export default function ProductImport() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState(null);
  const [unmappedHeaders, setUnmappedHeaders] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  const reset = () => {
    setFileName(''); setRows(null); setUnmappedHeaders([]); setPreview(null); setDone(null); setError('');
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-sample.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      let grid;
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      } else {
        grid = parseCsv(await file.text());
      }
      grid = grid.filter((r) => r.some((c) => String(c).trim()));
      if (grid.length < 2) throw new Error('The file needs a header row plus at least one data row.');

      const headerRow = grid[0];
      const fieldByCol = headerRow.map((h) => HEADER_MAP[normalize(h)] || null);
      const missingRequired = ['productName', 'department', 'category', 'colour', 'size', 'fit', 'sku', 'mrp', 'sellingPrice']
        .filter((f) => !fieldByCol.includes(f));
      if (missingRequired.length > 0) {
        throw new Error(`Missing required column(s): ${missingRequired.join(', ')}`);
      }
      setUnmappedHeaders(headerRow.filter((_, i) => !fieldByCol[i]));

      const parsedRows = grid.slice(1).map((r) => {
        const row = {};
        fieldByCol.forEach((field, i) => {
          if (field) row[field] = r[i] ?? '';
        });
        return row;
      }).filter((r) => r.productName);

      if (parsedRows.length === 0) throw new Error('No data rows found.');
      setRows(parsedRows);

      const res = await api.post('/product/bulk-import', { rows: parsedRows, apply: false });
      setPreview(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not read the file');
    }
    setBusy(false);
  };

  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/product/bulk-import', { rows, apply: true });
      setDone(res.data);
      setPreview(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    }
    setBusy(false);
  };

  const actionable = preview?.results.filter((r) => r.action !== 'skipped') || [];
  const skipped = preview?.results.filter((r) => r.action === 'skipped') || [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-3xl italic text-ink">Product Import</h1>
      <p className="mb-6 mt-1 max-w-2xl text-sm text-mauve-dark">
        Create or update products in bulk — one row per size/colour option. Department, Category, Design, Fabric,
        Colour, Size, and Fit must already exist (matched by name); this never creates master data automatically.
        Rows sharing the same Product Name become variants of one product.
      </p>

      {error && <div className="mb-5 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>}
      {done && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-pastel-green px-4 py-3 text-sm text-ink">
          <CircleCheck size={16} /> {done.message}
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-beige bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink">1. Choose the file</p>
          <button onClick={downloadSample} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve-dark hover:text-ink">
            <Download size={13} /> Download Sample CSV
          </button>
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85">
          <Upload size={14} />
          {busy && !preview ? 'Reading...' : 'Upload Excel / CSV'}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
            onClick={(e) => { e.target.value = null; }}
          />
        </label>
        {fileName && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-mauve-dark">
            <FileSpreadsheet size={14} /> {fileName} — {rows?.length || 0} row(s)
          </p>
        )}
        {unmappedHeaders.length > 0 && (
          <p className="mt-2 text-xs text-mauve">Ignored unrecognised column(s): {unmappedHeaders.join(', ')}</p>
        )}
      </div>

      {preview && (
        <div className="mb-5 rounded-2xl border border-beige bg-white p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink">2. Check what will happen</p>

          {actionable.length === 0 ? (
            <p className="mb-3 text-sm text-mauve">No products could be matched or created from this file.</p>
          ) : (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2">Variants</th>
                  </tr>
                </thead>
                <tbody>
                  {actionable.map((r, i) => (
                    <tr key={i} className="border-b border-beige/60">
                      <td className="py-2.5 pr-3 text-ink">{r.productName}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${r.action === 'create' ? 'bg-pastel-green' : 'bg-baby-pink'} text-ink`}>
                          {r.action === 'create' ? 'New Product' : 'Update Existing'}
                        </span>
                      </td>
                      <td className="py-2.5 text-mauve-dark">{r.variantCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {actionable.some((r) => r.rowErrors.length > 0) && (
            <div className="mb-3 rounded-xl bg-baby-pink/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink">Some rows within otherwise-valid products were skipped:</p>
              <div className="max-h-28 space-y-1 overflow-y-auto text-xs text-mauve-dark">
                {actionable.flatMap((r) => r.rowErrors.map((e, i) => <p key={r.productName + i}><b>{e.sku}</b> — {e.reason}</p>))}
              </div>
            </div>
          )}

          {skipped.length > 0 && (
            <div className="mb-2 rounded-xl bg-blush/60 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink">
                <CircleAlert size={13} /> {skipped.length} product(s) could not be imported
              </p>
              <div className="max-h-32 space-y-1.5 overflow-y-auto text-xs text-mauve-dark">
                {skipped.map((r, i) => (
                  <p key={i}><b>{r.productName}</b> — {r.errors.join('; ') || 'no valid variant rows'}</p>
                ))}
              </div>
            </div>
          )}

          {!done && actionable.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={apply}
                disabled={busy}
                className="rounded-full bg-ink px-8 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {busy ? 'Applying...' : `Import ${actionable.length} Product${actionable.length === 1 ? '' : 's'}`}
              </button>
              <button onClick={reset} className="flex items-center gap-1.5 text-xs font-semibold text-mauve-dark underline underline-offset-2">
                <RotateCcw size={12} /> Start over
              </button>
            </div>
          )}
          {done && (
            <button onClick={reset} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-mauve-dark underline underline-offset-2">
              <RotateCcw size={12} /> Import another file
            </button>
          )}
        </div>
      )}
    </div>
  );
}
