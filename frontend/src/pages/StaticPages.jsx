import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useTitle from '../utils/useTitle';
import { getCommerceSettings } from '../utils/settings';

function PageShell({ title, subtitle, children }) {
  return (
    <div className="min-h-[60vh] bg-cream font-body text-ink">
      <div className="bg-beige py-12">
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          <h1
            className="font-heading italic text-ink"
            style={{ fontSize: 'clamp(30px, 3.5vw, 44px)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-mauve-dark">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">{children}</div>
    </div>
  );
}

export const SIZE_CHART = [
  ['XS', '28-30', '32-34', '24-26'],
  ['S', '30-32', '34-36', '26-28'],
  ['M', '32-34', '36-38', '28-30'],
  ['L', '34-36', '38-40', '30-33'],
  ['XL', '36-38', '40-42', '33-36'],
  ['2XL', '38-40', '42-44', '36-39'],
  ['3XL', '40-42', '44-46', '39-42'],
];

export function FitGuide() {
  useTitle('Fit Guide');
  return (
    <PageShell
      title="Fit Guide"
      subtitle="Find your perfect size — measure snug, not tight."
    >
      <div className="mb-10 overflow-x-auto border border-beige bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              <th className="p-4">Size</th>
              <th className="p-4">Band (in)</th>
              <th className="p-4">Bust (in)</th>
              <th className="p-4">Waist (in)</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map(([s, band, bust, waist]) => (
              <tr key={s} className="border-b border-beige/60">
                <td className="p-4 font-semibold text-ink">{s}</td>
                <td className="p-4 text-mauve-dark">{band}</td>
                <td className="p-4 text-mauve-dark">{bust}</td>
                <td className="p-4 text-mauve-dark">{waist}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-5 text-sm leading-relaxed text-mauve-dark">
        <div>
          <h2 className="mb-1 font-heading text-lg italic text-ink">
            How to measure your band
          </h2>
          <p>
            Wrap a measuring tape directly under your bust, keeping it level and
            snug. Round to the nearest whole number.
          </p>
        </div>
        <div>
          <h2 className="mb-1 font-heading text-lg italic text-ink">
            How to measure your bust
          </h2>
          <p>
            Measure around the fullest part of your bust while wearing a
            non-padded bra. The tape should rest lightly, not compress.
          </p>
        </div>
        <div>
          <h2 className="mb-1 font-heading text-lg italic text-ink">
            Between sizes?
          </h2>
          <p>
            For bras, take the smaller band and larger cup. For nightwear and
            lounge sets, size up for a relaxed fit. Still unsure? We exchange
            free within 7 days — no stress.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

export function About() {
  useTitle('About Us');
  return (
    <PageShell title="About Nine Secrets" subtitle="we love your style">
      <div className="space-y-6 text-[15px] leading-[1.8] text-mauve-dark">
        <p className="font-heading text-xl italic leading-relaxed text-ink">
          Looks premium. Priced like it isn't. Lasts like you'd hope.
        </p>
        <p>
          Nine Secrets began with a simple frustration: innerwear that looked
          beautiful either cost a fortune or fell apart after ten washes. We
          decided to make our own — designed in-house, crafted with breathable,
          long-lasting fabrics, and sold directly to you with no middlemen
          marking things up along the way.
        </p>
        <p>
          Every piece is built to outlast 50 washes and still feel like new.
          Sizes run from XS to 3XL because comfort shouldn't have a size limit,
          and every order ships with our 7-day easy exchange promise.
        </p>
        <p>Made with love in India. 🇮🇳</p>
      </div>
      <Link
        to="/collection"
        className="mt-10 inline-block bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream"
      >
        Explore the Collection
      </Link>
    </PageShell>
  );
}

// Builds the policy text from real store settings so it can never go stale
// against what Store Settings / Contact Details actually say.
const buildPolicies = (commerce) => [
  {
    id: 'exchange',
    title: 'Exchange & Return Policy',
    body: `We accept return and exchange requests within 7 days of delivery. Items must be unworn, unwashed, and in original packaging with tags attached. For hygiene reasons, briefs and panties can only be exchanged if unopened. To start a request, go to My Account → Your Orders → Return / Exchange, or contact us. Approved returns are refunded to the original payment method within 5–7 business days after the item reaches us.`,
  },
  {
    id: 'shipping',
    title: 'Shipping Policy',
    body: `Orders ship within 24 hours on business days. Standard delivery takes 3–5 business days across India. Shipping is free on orders of ₹${commerce.freeShippingThreshold} and above; a flat ₹${commerce.shippingFee} applies below that. You'll receive an order confirmation by email as soon as your order is placed.`,
  },
  {
    id: 'track',
    title: 'Track Your Order',
    body: `Sign in and open My Account → Your Orders to see the live status of every order — processing, shipped, delivered — along with your full order history and return requests. No account? Use Track Order in the footer with your order number and phone number.`,
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: (() => {
      const channels = [
        commerce.instagramUrl && 'on Instagram',
        commerce.whatsappNumber && 'on WhatsApp',
        commerce.contactEmail && `by email at ${commerce.contactEmail}`,
      ].filter(Boolean);
      const reachUs = channels.length ? `Reach us ${channels.join(', ')}.` : '';
      return `We're here to help! ${reachUs} Our team replies within 24 hours on business days.`;
    })(),
  },
];

export function Policies() {
  useTitle('Help & Policies');
  const { hash } = useLocation();
  const [commerce, setCommerce] = useState({ freeShippingThreshold: 599, shippingFee: 50, instagramUrl: '', whatsappNumber: '', contactEmail: '' });
  useEffect(() => { getCommerceSettings().then(setCommerce); }, []);
  const POLICIES = buildPolicies(commerce);
  useEffect(() => {
    if (hash)
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <PageShell
      title="Help & Policies"
      subtitle="Everything you need to know before and after you order."
    >
      <div className="space-y-8">
        {POLICIES.map((p) => (
          <div
            key={p.id}
            id={p.id}
            className="scroll-mt-24 border border-beige bg-white p-6"
          >
            <h2 className="mb-2 font-heading text-lg italic text-ink">
              {p.title}
            </h2>
            <p className="text-sm leading-[1.8] text-mauve-dark">{p.body}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function NotFound() {
  useTitle('Page Not Found');
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 bg-cream px-6 text-center font-body">
      <p className="font-heading text-[80px] italic leading-none text-blush">
        404
      </p>
      <h1 className="font-heading text-2xl italic text-ink">
        This page slipped away
      </h1>
      <p className="max-w-sm text-sm text-mauve-dark">
        The page you're looking for doesn't exist or has moved. Let's get you
        back to something soft.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          to="/"
          className="border border-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-all hover:bg-ink hover:text-cream"
        >
          Home
        </Link>
        <Link
          to="/collection"
          className="bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream"
        >
          Shop the Collection
        </Link>
      </div>
    </div>
  );
}
