import { useEffect } from 'react';

const BASE = 'Nine Secrets';

// Per-route document titles (and optional meta description) for SEO/share.
export default function useTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE}` : `${BASE} — we love your style`;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);
}
