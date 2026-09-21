import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, setConsent } from '../utils/consent';

// Shown once until the shopper picks an option. "Reject" still lets the site
// function fully — only analytics (Google Analytics / Meta Pixel) is gated by
// this choice, nothing functional (cart, login, etc.) depends on it.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!getConsent());
  }, []);

  const choose = (value) => {
    setConsent(value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[95] border-t border-beige bg-surface px-5 py-4 shadow-[0_-4px_20px_rgba(32,24,32,0.06)]">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 md:flex-row">
        <p className="text-center text-xs text-mauve-dark md:text-left">
          We use cookies to understand site traffic and improve your experience. See our{' '}
          <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-ink">Privacy Policy</Link> for details.
        </p>
        <div className="flex flex-shrink-0 gap-2.5">
          <button
            type="button"
            onClick={() => choose('rejected')}
            className="rounded-full border border-beige px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="rounded-full bg-ink px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
