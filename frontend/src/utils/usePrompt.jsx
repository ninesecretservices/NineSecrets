import { useCallback, useRef, useState } from 'react';
import useEscapeToClose from './useEscapeToClose';

// Promise-based replacement for window.prompt() that renders the app's own
// styled modal instead of the browser's native dialog. Usage:
//   const { prompt, PromptDialog } = usePrompt();
//   const value = await prompt('Paste an image URL:');
//   if (!value) return; // cancelled or left blank
//   ...render {PromptDialog} once, anywhere in the component's JSX.
export default function usePrompt() {
  const [state, setState] = useState(null);
  const [value, setValue] = useState('');
  const resolver = useRef(null);

  const prompt = useCallback((message, opts = {}) => {
    setState({
      message,
      placeholder: opts.placeholder || '',
      confirmLabel: opts.confirmLabel || 'OK',
      cancelLabel: opts.cancelLabel || 'Cancel',
    });
    setValue(opts.defaultValue || '');
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  useEscapeToClose(!!state, () => close(null));

  const submit = (e) => {
    e.preventDefault();
    close(value.trim() || null);
  };

  const PromptDialog = state ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-beige bg-white p-6 shadow-xl">
        <p className="mb-4 text-sm leading-relaxed text-ink">{state.message}</p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={state.placeholder}
          className="mb-6 w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => close(null)}
            className="rounded-full border border-beige px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream"
          >
            {state.cancelLabel}
          </button>
          <button
            type="submit"
            className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
          >
            {state.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return { prompt, PromptDialog };
}
