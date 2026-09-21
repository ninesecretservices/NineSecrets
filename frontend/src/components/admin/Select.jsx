import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const triggerBase =
  'flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5 text-left text-sm outline-none transition-colors';

// Custom-styled dropdown replacing native <select> everywhere in the admin —
// native selects are OS-rendered and can't be styled to match the app (the
// popup list, highlight colour, font are all outside our CSS). This looks
// like the rest of the admin, opens automatically on focus, and supports
// number-key selection (1-9) matching the visible numbered options.
export default function Select({
  value,
  onChange,
  options, // [{ value, label }]
  placeholder = 'Choose...',
  required = false,
  disabled = false,
  className = '',
  triggerClassName,
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  // A click on the (not-yet-focused) trigger fires focus then click as part
  // of the same gesture — without this, onFocus opens it and the immediately
  // following onClick toggles it straight back shut. This flag makes onClick
  // a no-op for that one paired click, then clears itself on the next tick
  // so a later, separate click still toggles normally.
  const justFocusedRef = useRef(false);
  // Set right before a programmatic .focus() call after commit, so the
  // resulting focus event doesn't immediately reopen the list it just
  // closed (only matters if an option ever becomes independently focusable;
  // harmless no-op today since option <li>s aren't, but keeps this component
  // consistent with DatePicker where it's a real, verified bug).
  const suppressOpenRef = useRef(false);

  useEffect(() => {
    if (autoFocus) triggerRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && highlight >= 0) {
      listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, highlight]);

  const commit = (opt) => {
    onChange(opt.value);
    setOpen(false);
    suppressOpenRef.current = true;
    triggerRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (options[idx]) {
        e.preventDefault();
        commit(options[idx]);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else setHighlight((h) => Math.min(h + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) setOpen(true);
        else setHighlight((h) => Math.max(h - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open && options[highlight]) commit(options[highlight]);
        else setOpen(true);
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        onFocus={() => {
          if (disabled) return;
          if (suppressOpenRef.current) {
            suppressOpenRef.current = false;
            return;
          }
          setOpen(true);
          justFocusedRef.current = true;
          setTimeout(() => { justFocusedRef.current = false; }, 0);
        }}
        onClick={() => {
          if (disabled || justFocusedRef.current) return;
          setOpen((o) => !o);
        }}
        onKeyDown={onKeyDown}
        className={
          triggerClassName ||
          `${triggerBase} ${disabled ? 'cursor-not-allowed opacity-50 border-beige' : 'cursor-pointer border-beige hover:border-ink/40'} ${open ? 'border-ink' : ''}`
        }
      >
        <span className={selected ? 'truncate text-ink' : 'truncate text-mauve'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} strokeWidth={1.5} className={`flex-shrink-0 text-mauve transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 max-h-64 w-full min-w-max overflow-y-auto rounded-xl border border-beige bg-white p-1.5 shadow-xl"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-mauve">Nothing to choose from yet</li>
          )}
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => commit(opt)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                i === highlight ? 'bg-cream' : ''
              } ${opt.value === value ? 'text-ink font-semibold' : 'text-ink'}`}
            >
              {i < 9 && (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-beige text-[10px] font-semibold text-mauve-dark">
                  {i + 1}
                </span>
              )}
              <span className="flex-grow truncate">{opt.label}</span>
              {opt.value === value && <Check size={14} strokeWidth={2} className="flex-shrink-0 text-ink" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
