import { useState } from 'react';
import { FileSpreadsheet, Upload, CircleCheck, CircleAlert, RotateCcw } from 'lucide-react';
import api from '../../utils/api';

// Detect the barcode/code column and the stock/quantity column from headers.
const CODE_RE = /(bar\s*code|sku|item\s*code|stock\s*code|^code$|product\s*code)/i;
const QTY_RE = /(closing|stock|qty|quantity|balance|on\s*hand)/i;

const detectColumns = (headerRow) => {
  let codeCol = -1;
  let qtyCol = -1;
  headerRow.forEach((h, i) => {
    const t = String(h || '').trim();
    if (codeCol === -1 && CODE_RE.test(t)) codeCol = i;
    if (qtyCol === -1 && QTY_RE.test(t)) qtyCol = i;
  });
  return { codeCol, qtyCol };
};

const parseCsv = (text) =>
  text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => line.split(',').map((c) => c.replace(/^"|"$/g, '').trim()));

export default function StockImport() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState(null); // [{code, stock}]
  const [columns, setColumns] = useState(null);
  const [preview, setPreview] = useState(null); // { matched, unmatched }
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  const reset = () => {
    setFileName(''); setRows(null); setColumns(null); setPreview(null); setDone(null); setError('');
  };

  const handleFile = async (file) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      let grid;
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await import('xlsx'); // lazy: keeps the main bundle small
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      } else {
        grid = parseCsv(await file.text());
      }
      grid = grid.filter((r) => r.some((c) => String(c).trim()));
      if (grid.length < 2) throw new Error('The file needs a header row plus at least one data row.');

      let { codeCol, qtyCol } = detectColumns(grid[0]);
      let dataStart = 1;
      if (codeCol === -1 || qtyCol === -1) {
        // No recognisable headers — assume first column = code, second = stock.
        codeCol = codeCol === -1 ? 0 : codeCol;
        qtyCol = qtyCol === -1 ? (codeCol === 0 ? 1 : 0) : qtyCol;
        dataStart = CODE_RE.test(String(grid[0][codeCol])) || QTY_RE.test(String(grid[0][qtyCol])) ? 1 : 0;
      }

      const parsed = grid
        .slice(dataStart)
        .map((r) => ({ code: String(r[codeCol] ?? '').trim(), stock: String(r[qtyCol] ?? '').trim() }))
        .filter((r) => r.code);
      if (parsed.length === 0) throw new Error('No rows with a barcode/stock code were found.');

      setColumns({ code: grid[0][codeCol] || `column ${codeCol + 1}`, qty: grid[0][qtyCol] || `column ${qtyCol + 1}` });
      setRows(parsed);

      const res = await api.post('/product/stock-import', { rows: parsed, apply: false });
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
      const res = await api.post('/product/stock-import', { rows, apply: true });
      setDone(res.data);
      setPreview(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    }
    setBusy(false);
  };

  const changes = preview?.matched.filter((m) => m.changed) || [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-3xl italic text-ink">Stock Import</h1>
      <p className="mb-6 mt-1 max-w-xl text-sm text-mauve-dark">
        Update website stock from your inventory software (e.g. an Alpha-E export). Export the stock report as
        Excel or CSV, upload it here, check the preview, then apply. Rows are matched by <b>barcode</b> first, then stock code.
      </p>

      {error && <div className="mb-5 rounded-xl bg-blush px-4 py-3 text-sm text-ink">{error}</div>}
      {done && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-pastel-green px-4 py-3 text-sm text-ink">
          <CircleCheck size={16} /> {done.message}
        </div>
      )}

      {/* Step 1: file */}
      <div className="mb-5 rounded-2xl border border-beige bg-white p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink">1. Choose the export file</p>
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
            <FileSpreadsheet size={14} /> {fileName}
            {columns && <span className="text-mauve"> — using "{columns.code}" as the code and "{columns.qty}" as the stock</span>}
          </p>
        )}
      </div>

      {/* Step 2: preview */}
      {preview && (
        <div className="mb-5 rounded-2xl border border-beige bg-white p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink">
            2. Check what will change
          </p>

          {changes.length === 0 ? (
            <p className="mb-3 text-sm text-mauve">
              {preview.matched.length > 0
                ? 'Everything already matches — no stock levels would change.'
                : 'No rows matched any product option.'}
            </p>
          ) : (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Current</th>
                    <th className="py-2">New Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((m, i) => (
                    <tr key={i} className="border-b border-beige/60">
                      <td className="py-2.5 pr-3 text-ink">{m.productName} <span className="text-mauve">({m.sku})</span></td>
                      <td className="py-2.5 pr-3 text-mauve-dark">{m.code}</td>
                      <td className="py-2.5 pr-3 text-mauve-dark">{m.oldStock}</td>
                      <td className="py-2.5 font-semibold text-ink">{m.newStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.matched.length - changes.length > 0 && (
            <p className="mb-2 text-xs text-mauve">
              {preview.matched.length - changes.length} row(s) matched but already have the same stock — they'll be skipped.
            </p>
          )}

          {preview.unmatched.length > 0 && (
            <div className="mb-2 rounded-xl bg-baby-pink/60 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink">
                <CircleAlert size={13} /> {preview.unmatched.length} row(s) couldn't be matched
              </p>
              <div className="max-h-32 space-y-1 overflow-y-auto text-xs text-mauve-dark">
                {preview.unmatched.map((u, i) => (
                  <p key={i}><b>{u.code}</b> — {u.reason}</p>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-mauve">
                Tip: add the barcode to the product option (Products → edit → Barcode field) so it matches next time.
              </p>
            </div>
          )}

          {!done && changes.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={apply}
                disabled={busy}
                className="rounded-full bg-ink px-8 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {busy ? 'Applying...' : `Apply ${changes.length} Change${changes.length === 1 ? '' : 's'}`}
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
