import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad2 = (n) => String(n).padStart(2, '0');

// "2026-08-06" -> { y, m (0-based), d } — parsed manually (not `new Date(iso)`)
// so a UTC/local timezone mismatch can't shift the day by one.
const parseISO = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
};
const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const sameDay = (a, b) => a && b && a.y === b.y && a.m === b.m && a.d === b.d;

const formatDisplay = (parsed) => {
  if (!parsed) return '';
  return `${MONTHS[parsed.m].slice(0, 3)} ${parsed.d}, ${parsed.y}`;
};

// Custom-styled replacement for native <input type="date"> — same reasoning
// as components/admin/Select: the native calendar popup is OS-rendered and
// can't be restyled to match the app. Value/onChange stay ISO "YYYY-MM-DD"
// strings so it's a drop-in swap wherever a date field is used.
export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select a date...',
  required = false,
  className = '',
  triggerClassName,
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const today = (() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  })();
  const [viewYear, setViewYear] = useState((selected || today).y);
  const [viewMonth, setViewMonth] = useState((selected || today).m);

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const justFocusedRef = useRef(false);
  // Set right before a programmatic .focus() call (after commit/clear) so the
  // resulting focus event doesn't re-open the panel it just closed — the
  // calendar's day buttons are real focusable elements, so moving focus back
  // to the trigger after picking a day is a genuine focus change, not a no-op.
  const suppressOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const openAt = (parsed) => {
    setViewYear(parsed.y);
    setViewMonth(parsed.m);
    setOpen(true);
  };

  const shiftMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const commit = (y, m, d) => {
    onChange(toISO(y, m, d));
    setOpen(false);
    suppressOpenRef.current = true;
    triggerRef.current?.focus();
  };

  // Sunday-first 6-week grid, including greyed-out padding days from the
  // adjacent months so the layout never jumps between 4/5/6 row months.
  const firstOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstOfMonth; i++) {
    cells.push({ y: viewMonth === 0 ? viewYear - 1 : viewYear, m: viewMonth === 0 ? 11 : viewMonth - 1, d: daysInPrevMonth - firstOfMonth + 1 + i, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ y: viewYear, m: viewMonth, d, outside: false });
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const next = last.d + 1;
    const overflowsMonth = new Date(last.y, last.m + 1, 0).getDate() < next;
    cells.push(
      overflowsMonth
        ? { y: viewMonth === 11 ? viewYear + 1 : viewYear, m: viewMonth === 11 ? 0 : viewMonth + 1, d: 1, outside: true }
        : { y: last.y, m: last.m, d: next, outside: true }
    );
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) openAt(selected || today);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      const base = selected || today;
      const next = new Date(base.y, base.m, base.d + delta);
      commit(next.getFullYear(), next.getMonth(), next.getDate());
      openAt({ y: next.getFullYear(), m: next.getMonth(), d: next.getDate() });
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required}
        onFocus={() => {
          if (suppressOpenRef.current) {
            suppressOpenRef.current = false;
            return;
          }
          openAt(selected || today);
          justFocusedRef.current = true;
          setTimeout(() => { justFocusedRef.current = false; }, 0);
        }}
        onClick={() => {
          if (justFocusedRef.current) return;
          if (open) setOpen(false);
          else openAt(selected || today);
        }}
        onKeyDown={onKeyDown}
        className={
          triggerClassName ||
          `flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5 text-left text-sm outline-none transition-colors cursor-pointer border-beige hover:border-ink/40 ${open ? 'border-ink' : ''}`
        }
      >
        <span className={selected ? 'truncate text-ink' : 'truncate text-mauve'}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <Calendar size={15} strokeWidth={1.5} className="flex-shrink-0 text-mauve" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 top-full z-50 mt-1.5 w-[280px] rounded-xl border border-beige bg-white p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded-lg p-1.5 text-mauve-dark transition-colors hover:bg-cream hover:text-ink">
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <span className="text-sm font-semibold text-ink">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-lg p-1.5 text-mauve-dark transition-colors hover:bg-cream hover:text-ink">
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-mauve">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
            {cells.map((c, i) => {
              const isSelected = sameDay(c, selected);
              const isToday = sameDay(c, today);
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => commit(c.y, c.m, c.d)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    c.outside ? 'text-mauve/50' : 'text-ink'
                  } ${isSelected ? 'bg-ink text-cream' : isToday ? 'border border-ink/40' : 'hover:bg-cream'}`}
                >
                  {c.d}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-beige pt-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
                suppressOpenRef.current = true;
                triggerRef.current?.focus();
              }}
              className="text-mauve-dark hover:text-ink"
            >
              Clear
            </button>
            <button type="button" onClick={() => commit(today.y, today.m, today.d)} className="text-ink underline underline-offset-2 hover:opacity-70">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
