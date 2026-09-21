// Single source of truth for the homepage content structure. The admin editor
// edits this shape; the storefront renders it. Anything unset falls back here.

// 'categories' isn't listed here — like the hero, the category-circle row is a
// fixed structural block (always shown before the hero when there's data),
// not a reorderable section. Its content is still edited via the standalone
// "Categories" admin tab and lives in content.categories.
export const SECTION_LABELS = {
  usp: 'USP Strip',
  catrows: 'Category Carousels (one per category)',
  bestsellers: 'Best Sellers Row',
  promise: 'Promise Section',
  justarrived: 'Just Arrived Row',
  testimonials: 'Customer Testimonials',
  instagram: 'Customer Diaries / Instagram',
};

export const HOME_DEFAULTS = {
  sectionsOrder: ['usp', 'catrows', 'bestsellers', 'promise', 'justarrived', 'testimonials', 'instagram'],
  sectionsVisible: { usp: true, catrows: true, bestsellers: true, promise: true, justarrived: true, testimonials: true, instagram: true },
  hero: {
    image: '',
    eyebrow: 'New Collection',
    heading: 'soft as a whisper,\nmade to\nlast all night',
    subtext: 'Premium innerwear for the woman who deserves both comfort and style.',
    // Small trust line under the subtext, e.g. "Free Shipping · COD Available · Easy Return".
    // Empty by default — nothing forced on the storefront until the admin sets it.
    features: '',
    ctaLabel: 'Shop Now',
    link: '/collection',
    // Extra carousel slides (slide 1 comes from the fields above); up to 2 more.
    slides: [],
    campaign: { enabled: false, start: '', end: '', image: '', eyebrow: '', heading: '', subtext: '', features: '', ctaLabel: '' },
  },
  announcementsEnabled: true,
  announcements: [
    { text: 'Free Shipping on orders above ₹599', link: '/collection', start: '', end: '' },
    { text: 'Easy 7-Day Exchange Policy', link: '/policies#exchange', start: '', end: '' },
    { text: 'Premium innerwear, made in India', link: '/about', start: '', end: '' },
  ],
  usp: [
    { icon: '✦', label: 'Premium Fabric' },
    { icon: '✦', label: 'No-Outsourcing Quality' },
    { icon: '✦', label: '7-Day Easy Exchange' },
    { icon: '✦', label: 'Sizes S – 3XL' },
  ],
  // No placeholder tiles — the admin adds real category images/titles from
  // Admin → Homepage → Categories. The circle row simply doesn't render
  // until at least one tile exists (see CategoryCircles in Home.jsx).
  categories: [],
  bestsellers: { eyebrow: 'Best Sellers', heading: 'Your kind of cosy', mode: 'featured', productIds: [], count: 4 },
  justarrived: { eyebrow: 'Just Arrived', heading: 'fresh every night', mode: 'newest', productIds: [], count: 4 },
  promise: {
    eyebrow: 'Our Promise',
    heading: "Looks premium.\nPriced like it isn't.\nLasts like you'd hope.",
    body: 'Every piece is crafted in-house using breathable, long-lasting fabrics — no middlemen, no compromises. Built to outlast 50 washes and still feel like new.',
    image: '',
    ctaLabel: 'Explore the Collection',
  },
  instagram: { profileUrl: 'https://instagram.com/ninesecrets', beholdUrl: '', images: [] },
};

// Merge saved content over defaults; migrate legacy shapes (plain-string announcements).
export const normalizeHomepage = (saved = {}) => {
  const merged = {
    ...HOME_DEFAULTS,
    ...saved,
    sectionsVisible: { ...HOME_DEFAULTS.sectionsVisible, ...saved.sectionsVisible },
    hero: {
      ...HOME_DEFAULTS.hero,
      ...saved.hero,
      campaign: { ...HOME_DEFAULTS.hero.campaign, ...saved.hero?.campaign },
    },
    bestsellers: { ...HOME_DEFAULTS.bestsellers, ...saved.bestsellers },
    justarrived: { ...HOME_DEFAULTS.justarrived, ...saved.justarrived },
    promise: { ...HOME_DEFAULTS.promise, ...saved.promise },
    instagram: { ...HOME_DEFAULTS.instagram, ...saved.instagram },
  };
  if (Array.isArray(saved.announcements) && saved.announcements.length > 0) {
    merged.announcements = saved.announcements.map((a) =>
      typeof a === 'string' ? { text: a, link: '/collection', start: '', end: '' } : { link: '', start: '', end: '', ...a }
    );
  }
  if (!Array.isArray(merged.sectionsOrder) || merged.sectionsOrder.length === 0) {
    merged.sectionsOrder = HOME_DEFAULTS.sectionsOrder;
  }
  // Any section missing from a saved order (e.g. added later) goes to the end.
  for (const key of HOME_DEFAULTS.sectionsOrder) {
    if (!merged.sectionsOrder.includes(key)) merged.sectionsOrder.push(key);
  }
  if (Array.isArray(saved.usp) && saved.usp.length > 0) merged.usp = saved.usp;
  if (Array.isArray(saved.categories) && saved.categories.length > 0) merged.categories = saved.categories;
  return merged;
};

export const isWithinSchedule = ({ start, end } = {}) => {
  const now = Date.now();
  if (start && now < new Date(start).getTime()) return false;
  if (end && now > new Date(end).getTime()) return false;
  return true;
};

// The hero to render right now: campaign override when enabled and in window.
export const activeHero = (content) => {
  const { hero } = content;
  const c = hero.campaign;
  if (c?.enabled && isWithinSchedule(c)) {
    return {
      image: c.image || hero.image,
      eyebrow: c.eyebrow || hero.eyebrow,
      heading: c.heading || hero.heading,
      subtext: c.subtext || hero.subtext,
      features: c.features || hero.features,
      ctaLabel: c.ctaLabel || hero.ctaLabel,
      link: hero.link || '/collection',
    };
  }
  return hero;
};

// All hero slides for the carousel: the main hero first, then extra slides.
export const heroSlides = (content) => {
  const first = activeHero(content);
  const extras = (content.hero.slides || []).filter((s) => s.heading?.trim() || s.image);
  return [
    { link: '/collection', ...first },
    ...extras.map((s) => ({ link: '/collection', ctaLabel: 'Shop Now', eyebrow: '', subtext: '', features: '', ...s })),
  ];
};

export const activeAnnouncements = (content) => {
  if (content.announcementsEnabled === false) return [];
  return (content.announcements || []).filter((a) => a.text?.trim() && isWithinSchedule(a));
};
