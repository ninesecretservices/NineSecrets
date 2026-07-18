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
    img: p.thumbnail || p.images?.[0] || '',
    colors: [...new Set((p.variants || []).map((x) => x.colour?.hexCode).filter(Boolean))],
    variants: p.variants || [],
    raw: p, // full product doc - needed for quick add-to-cart from cards
  };
};
