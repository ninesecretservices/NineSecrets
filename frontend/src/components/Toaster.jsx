import useStore from '../store/useStore';

export default function Toaster() {
  const toasts = useStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-[toast-in_.25s_ease-out] rounded-full px-5 py-2.5 text-[13px] font-medium text-ink shadow-lg ${
            t.type === 'error' ? 'bg-blush' : 'bg-pastel-green'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
