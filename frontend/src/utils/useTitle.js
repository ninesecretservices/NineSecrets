import { useEffect } from 'react';

const BASE = 'Nine Secrets';
const DEFAULT_DESCRIPTION = 'Premium nightwear and loungewear for women. Crafted with care, priced with honesty.';

// Upserts a <meta> tag identified by attr="key" (property for OG, name for
// Twitter/description), or removes it when value is falsy.
function setMeta(attr, key, value) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!value) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

/**
 * Per-route document title, meta description, Open Graph + Twitter Card tags,
 * and canonical URL — so shared links (WhatsApp/Instagram/search) get a real
 * preview instead of a blank card, and each page has a self-referencing
 * canonical to avoid duplicate-content SEO issues.
 *
 * @param {string} title - page title (blank for the homepage's default)
 * @param {string} [description]
 * @param {{ image?: string, type?: string }} [options] - image: absolute URL for OG/Twitter preview; type: 'product' for PDPs, defaults to 'website'
 */
export default function useTitle(title, description, options = {}) {
  const { image, type = 'website' } = options;

  useEffect(() => {
    const fullTitle = title ? `${title} — ${BASE}` : `${BASE} — we love your style`;
    const fullDescription = description || DEFAULT_DESCRIPTION;
    const url = window.location.href;

    document.title = fullTitle;
    setMeta('name', 'description', fullDescription);

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', fullDescription);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:site_name', BASE);
    setMeta('property', 'og:image', image || null);

    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', fullDescription);
    setMeta('name', 'twitter:image', image || null);

    setCanonical(url);
  }, [title, description, image, type]);
}
