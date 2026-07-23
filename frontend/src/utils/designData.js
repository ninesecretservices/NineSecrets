// Truncate on a word boundary and mark it with an ellipsis, instead of
// hard-cutting mid-word with no indication the text was shortened.
const truncate = (text, max) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
};

// Normalize an API product into the card shape used across the storefront.
export const toCardProduct = (p) => {
  const v = p.variants?.[0] || {};
  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    tag: p.isFeatured ? 'BEST SELLER' : 'NEW IN',
    desc: p.description ? truncate(p.description, 60) : `${p.variants?.length || 0} variants`,
    price: v.sellingPrice ?? v.mrp ?? 0,
    mrp: v.mrp ?? v.sellingPrice ?? 0,
    img: p.thumbnail || p.images?.[0] || '',
    colors: [...new Set((p.variants || []).map((x) => x.colour?.hexCode).filter(Boolean))],
    variants: p.variants || [],
    raw: p, // full product doc - needed for quick add-to-cart from cards
  };
};
