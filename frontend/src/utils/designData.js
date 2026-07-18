// Shared design content extracted from the Figma design.
// Demo products act as a visual fallback until the catalogue has real data.

export const unsplash = (id, w, h) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

export const heroImage = unsplash('photo-1547200224-48ff2b7fcedf', 900, 1100);
export const promiseImage = unsplash('photo-1770294758967-6ed2b93ce42c', 900, 700);

export const demoProducts = [
  { id: 'demo-1', name: 'Isla Padded Everyday Bra', tag: 'BEST SELLER', desc: 'Cotton Padded · 3 Colours', price: 799, mrp: 1099, img: unsplash('photo-1610241519159-8a62634bac9a', 480, 640), colors: ['#E8CDD3', '#201820', '#F3ECE3'] },
  { id: 'demo-2', name: 'Mira Lace Balconette', tag: 'NEW IN', desc: 'Lace Detail · 4 Colours', price: 899, mrp: 1299, img: unsplash('photo-1599836641623-a596a2c44abc', 480, 640), colors: ['#201820', '#E8CDD3', '#F6DDE3'] },
  { id: 'demo-3', name: 'Aria Silk Nightset', tag: 'BEST SELLER', desc: 'Satin Finish · 2 Colours', price: 1299, mrp: 1799, img: unsplash('photo-1770294760762-1cd821ecc567', 480, 640), colors: ['#F6DDE3', '#CFE0CB'] },
  { id: 'demo-4', name: 'Dew Strappy Sleep Set', tag: 'NEW IN', desc: 'Modal Blend · 5 Colours', price: 999, mrp: 1399, img: unsplash('photo-1766056278967-c0646b1bfd67', 480, 640), colors: ['#E4D8C8', '#201820', '#E8CDD3', '#CFE0CB', '#F6DDE3'] },
  { id: 'demo-5', name: 'Lila Cotton Lounge Set', tag: 'NEW IN', desc: '100% Cotton · 3 Colours', price: 1149, mrp: 1549, img: unsplash('photo-1766056278986-af4b8a4fdae7', 480, 640), colors: ['#F3ECE3', '#E8CDD3', '#201820'] },
  { id: 'demo-6', name: 'Luna Oversized Night Shirt', tag: 'BEST SELLER', desc: 'Breathable Weave · 2 Colours', price: 849, mrp: 1199, img: unsplash('photo-1766056278842-b754f1e093c0', 480, 640), colors: ['#F3ECE3', '#E4D8C8'] },
];

export const categories = [
  { name: 'Bras', count: '32 styles', img: unsplash('photo-1599836641623-a596a2c44abc', 600, 700) },
  { name: 'Innerwear Sets', count: '18 styles', img: unsplash('photo-1612194528832-e5336ec3ff9d', 600, 700) },
  { name: 'Nightwear', count: '24 styles', img: unsplash('photo-1770294758942-7ce9ca052986', 600, 700) },
  { name: 'Loungewear', count: '14 styles', img: unsplash('photo-1766056278798-39cabf7ca628', 600, 700) },
];

export const instaImages = [
  unsplash('photo-1770294758967-6ed2b93ce42c', 400, 400),
  unsplash('photo-1766056278967-c0646b1bfd67', 400, 400),
  unsplash('photo-1770294760762-1cd821ecc567', 400, 400),
  unsplash('photo-1766056278798-39cabf7ca628', 400, 400),
  unsplash('photo-1612194528832-e5336ec3ff9d', 400, 400),
  unsplash('photo-1771286148916-a5389beaf8b3', 400, 400),
];

export const announcements = [
  'Free Shipping on orders above ₹599',
  'Easy 7-Day Exchange Policy',
  'Premium innerwear, made in India',
];

export const uspItems = [
  { icon: '✦', label: 'Premium Fabric' },
  { icon: '✦', label: 'No-Outsourcing Quality' },
  { icon: '✦', label: '7-Day Easy Exchange' },
  { icon: '✦', label: 'Sizes S – 3XL' },
];

// Normalize an API product into the card shape used across the storefront.
export const toCardProduct = (p) => {
  const v = p.variants?.[0] || {};
  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    tag: p.isFeatured ? 'BEST SELLER' : 'NEW IN',
    desc: p.description ? p.description.slice(0, 60) : `${p.variants?.length || 0} variants`,
    price: v.sellingPrice ?? v.mrp ?? 0,
    mrp: v.mrp ?? v.sellingPrice ?? 0,
    img: p.thumbnail || p.images?.[0] || unsplash('photo-1610241519159-8a62634bac9a', 480, 640),
    colors: [...new Set((p.variants || []).map((x) => x.colour?.hexCode).filter(Boolean))],
    variants: p.variants || [],
    raw: p, // full product doc - needed for quick add-to-cart from cards
  };
};
