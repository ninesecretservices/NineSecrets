import { useCallback, useRef, useState } from 'react';
import useEscapeToClose from './useEscapeToClose';

// Promise-based replacement for window.confirm() that renders the app's own
// styled modal instead of the browser's native dialog. Usage:
//   const { confirm, ConfirmDialog } = useConfirm();
//   if (!(await confirm('Delete this?', { danger: true }))) return;
//   ...render {ConfirmDialog} once, anywhere in the component's JSX.
export default function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    setState({
      message,
      confirmLabel: opts.confirmLabel || 'Confirm',
      cancelLabel: opts.cancelLabel || 'Cancel',
      danger: !!opts.danger,
    });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  useEscapeToClose(!!state, () => close(false));

  const ConfirmDialog = state ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-beige bg-white p-6 shadow-xl">
        <p className="mb-6 text-sm leading-relaxed text-ink">{state.message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => close(false)}
            className="rounded-full border border-beige px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream"
          >
            {state.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`rounded-full px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 ${
              state.danger ? 'bg-red-700' : 'bg-ink'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
