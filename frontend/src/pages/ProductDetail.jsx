import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, Minus, Plus, ChevronDown, ChevronUp, BadgeCheck, X } from 'lucide-react';
import api, { resolveImageUrl } from '../utils/api';
import useStore from '../store/useStore';
import ProductCard, { ColorDot } from '../components/ProductCard';
import { toCardProduct } from '../utils/designData';
import { inr } from '../utils/format';
import useTitle from '../utils/useTitle';
import { getCommerceSettings } from '../utils/settings';
import { SIZE_CHART, NotFound } from './StaticPages';

// The shared SIZE_CHART carries band measurements, which are meaningless
// outside bra/innerwear styles — shown/worded only when the product's own
// category actually is one, so a T-shirt or pyjama set doesn't get told to
// "find your band and cup measurements".
const BRA_CATEGORY_RE = /bra|lingerie|innerwear|panty|panties|brief/i;

// Quick-reference size chart in a modal, so switching sizes doesn't mean
// navigating away and losing the colour/size selection already made.
function SizeGuideModal({ onClose, categoryName }) {
  const isBra = BRA_CATEGORY_RE.test(categoryName || '');
  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-cream p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl italic text-ink">Size Guide</h2>
          <button type="button" onClick={onClose} className="text-mauve hover:text-ink" aria-label="Close size guide">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="mb-6 overflow-x-auto border border-beige bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
                <th className="p-3">Size</th>
                {isBra && <th className="p-3">Band (in)</th>}
                <th className="p-3">{isBra ? 'Bust (in)' : 'Bust/Chest (in)'}</th>
                <th className="p-3">Waist (in)</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map(([s, band, bust, waist]) => (
                <tr key={s} className="border-b border-beige/60">
                  <td className="p-3 font-semibold text-ink">{s}</td>
                  {isBra && <td className="p-3 text-mauve-dark">{band}</td>}
                  <td className="p-3 text-mauve-dark">{bust}</td>
                  <td className="p-3 text-mauve-dark">{waist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-mauve-dark">
          {isBra
            ? 'Between sizes? For bras, take the smaller band and larger cup. Still unsure? We exchange free within 7 days.'
            : 'Between sizes? Size up for a relaxed, comfortable fit. Still unsure? We exchange free within 7 days.'}
        </p>
      </div>
    </div>
  );
}

// Built per-product from real data — no fabricated specifics (e.g. a model's
// measurements) and shipping numbers always match the actual store settings.
const buildAccordions = (product, commerce) => {
  const isBra = BRA_CATEGORY_RE.test(product.item?.name || '');
  const sizesAvailable = [...new Set((product.variants || []).map((v) => v.size?.name).filter(Boolean))].join(', ') || 'see options above';
  return [
  {
    title: 'Product Details',
    body: product.description?.trim() || 'See the photos above for a closer look at this style. Full material details coming soon.',
  },
  {
    title: 'Size & Fit',
    body: isBra
      ? `This style runs true to size. Use the Size Guide above to find your band and cup measurements — sizes available: ${sizesAvailable}.`
      : `This style runs true to size. Use the Size Guide above for general measurements — sizes available: ${sizesAvailable}.`,
  },
  {
    title: 'Care Instructions',
    body: 'Hand wash cold or machine wash on delicate cycle. Do not tumble dry. Lay flat to dry. Do not bleach. Iron on low heat if needed.',
  },
  {
    title: 'Shipping Policy',
    body: `Ships in 24 hours. Free shipping on orders above ₹${commerce.freeShippingThreshold}. Standard delivery: 3–5 business days.`,
  },
  ];
};

function ReviewForm({ productId, user, onSaved }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="bg-beige/50 p-6 text-center">
        <p className="text-sm text-mauve-dark">
          <Link to="/login" className="font-semibold text-ink underline underline-offset-4">Sign in</Link> to review this product.
        </p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setMsg({ ok: false, text: 'Please choose a star rating' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      await api.post('/review/create', { productId, rating, comment });
      setMsg({ ok: true, text: 'Thank you! Your review has been saved.' });
      setComment('');
      onSaved?.();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Could not save review' });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="bg-beige/50 p-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink">Write a review</p>
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star size={22} strokeWidth={1.5} className={n <= rating ? 'fill-ink text-ink' : 'text-mauve'} />
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was the fit, fabric, comfort?"
        className="mb-4 w-full border border-beige bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink"
      />
      {msg && (
        <p className={`mb-3 px-4 py-2.5 text-sm text-ink ${msg.ok ? 'bg-pastel-green' : 'bg-blush'}`}>{msg.text}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="bg-ink px-7 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Submit Review'}
      </button>
      <p className="mt-3 text-[11px] text-mauve">Reviews are limited to products you've purchased.</p>
    </form>
  );
}

function SizePill({ label, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border px-3.5 py-1.5 text-xs font-semibold transition-all ${
        disabled
          ? 'cursor-not-allowed border-beige text-mauve-soft line-through'
          : active
            ? 'border-ink bg-ink text-cream'
            : 'border-ink bg-transparent text-ink'
      }`}
    >
      {label}
    </button>
  );
}

// Hover zoom: magnifies around the cursor position.
function ZoomImage({ src, alt }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const ref = useRef(null);

  const onMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  if (!src) {
    return <div className="flex aspect-[4/5] items-center justify-center bg-surface text-xs text-mauve">No image yet</div>;
  }

  return (
    <div
      ref={ref}
      className="aspect-[4/5] cursor-zoom-in overflow-hidden bg-surface"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={onMove}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-200"
        style={{ transform: zoom ? 'scale(1.8)' : 'scale(1)', transformOrigin: origin }}
      />
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const addToCart = useStore((s) => s.addToCart);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [related, setRelated] = useState([]);
  const [commerce, setCommerce] = useState({ freeShippingThreshold: 599 });
  useEffect(() => { getCommerceSettings().then(setCommerce); }, []);

  const [imgIdx, setImgIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [openAcc, setOpenAcc] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [reviews, setReviews] = useState({ docs: [], average: 0, count: 0 });
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const wishlist = useStore((s) => s.wishlist);
  const user = useStore((s) => s.user);
  const toast = useStore((s) => s.toast);
  const wishlisted = product && wishlist.some((p) => p.id === product._id);

  useTitle(product?.name, product?.description, {
    image: product?.thumbnail ? resolveImageUrl(product.thumbnail) : undefined,
    type: 'product',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.post('/product/public-detail', { slug });
        const p = res.data.data;
        setProduct(p);
        setImgIdx(0);
        setQty(1);
        if (p.variants?.length > 0) {
          setSelectedColor(p.variants[0].colour?._id ?? null);
          setSelectedSize(p.variants[0].size?._id ?? null);
        }
        try {
          const rres = await api.post('/review/list', { productId: p._id, limit: 20 });
          setReviews(rres.data.data);
        } catch {
          // reviews are non-critical
        }
      } catch {
        setError('Product not found');
      }
      try {
        const res = await api.post('/product/public-list', { page: 1, limit: 4 });
        const docs = res.data.data.docs || res.data.data;
        if (Array.isArray(docs) && docs.length > 0) {
          setRelated(docs.filter((d) => d.slug !== slug).map(toCardProduct));
        }
      } catch {
        // keep related empty — the "You may also like" row just won't render
      }
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-beige border-t-ink" />
      </div>
    );
  }
  if (error || !product) {
    return <NotFound />;
  }

  const gallery = product.images?.length > 0
    ? product.images
    : product.thumbnail ? [product.thumbnail] : [];

  const accordions = buildAccordions(product, commerce);

  const colours = [...new Map((product.variants || []).map((v) => [v.colour?._id, v.colour])).values()].filter(Boolean);
  const sizes = [...new Map((product.variants || []).map((v) => [v.size?._id, v.size])).values()].filter(Boolean);
  const selectedColourName = colours.find((c) => c._id === selectedColor)?.name;
  const selectedSizeName = sizes.find((s) => s._id === selectedSize)?.name;

  // A size is offered only when it exists in stock for the chosen colour.
  const sizeInStock = (sizeId) =>
    (product.variants || []).some(
      (v) => (!selectedColor || v.colour?._id === selectedColor) && v.size?._id === sizeId && v.stock > 0
    );
  const colourInStock = (colourId) =>
    (product.variants || []).some((v) => v.colour?._id === colourId && v.stock > 0);

  const activeVariant = (product.variants || []).find(
    (v) =>
      (!selectedColor || v.colour?._id === selectedColor) &&
      (!selectedSize || v.size?._id === selectedSize)
  );
  const displayVariant = activeVariant || product.variants?.[0];

  const price = displayVariant?.sellingPrice ?? displayVariant?.mrp ?? product.price ?? 0;
  const mrp = displayVariant?.mrp ?? price;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stock = activeVariant?.stock ?? 0;
  const canBuy = product.variants?.length > 0 ? !!activeVariant && stock >= qty : true;

  const selectColour = (colourId) => {
    setSelectedColor(colourId);
    // If the current size isn't available in this colour, jump to one that is.
    const stillOk = (product.variants || []).some(
      (v) => v.colour?._id === colourId && v.size?._id === selectedSize && v.stock > 0
    );
    if (!stillOk) {
      const firstOk = (product.variants || []).find((v) => v.colour?._id === colourId && v.stock > 0);
      setSelectedSize(firstOk?.size?._id ?? null);
    }
  };

  const handleAddToCart = () => {
    if (!product.variants || product.variants.length === 0) {
      addToCart(product, { sku: product.slug }, qty, price);
      return;
    }
    if (!activeVariant) {
      toast('This combination is unavailable — try another size or colour', 'error');
      return;
    }
    if (activeVariant.stock < qty) {
      toast(`Only ${activeVariant.stock} left in stock`, 'error');
      return;
    }
    addToCart(product, activeVariant, qty, activeVariant.sellingPrice || activeVariant.mrp);
  };

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: product.thumbnail ? [resolveImageUrl(product.thumbnail)] : undefined,
    sku: displayVariant?.sku || product.slug,
    offers: {
      '@type': 'Offer',
      url: window.location.href,
      priceCurrency: 'INR',
      price,
      availability: canBuy && stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(reviews.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviews.average,
        reviewCount: reviews.count,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-cream pb-20 font-body text-ink md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      {/* Sticky mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-beige bg-surface px-5 py-3 md:hidden">
        <div>
          <p className="text-sm font-bold text-ink">{inr(price)}</p>
          {mrp > price && <p className="text-[11px] text-mauve-soft line-through">{inr(mrp)}</p>}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!canBuy}
          className="h-11 flex-grow bg-ink text-xs font-semibold uppercase tracking-[0.1em] text-cream disabled:opacity-40"
        >
          {canBuy ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-[11px] uppercase tracking-[0.1em]">
          <Link to="/" className="text-mauve">Home</Link>
          <span className="text-mauve">&gt;</span>
          <Link to="/collection" className="text-mauve">Collection</Link>
          <span className="text-mauve">&gt;</span>
          <span className="text-ink">{product.name}</span>
        </div>

        <div className="flex flex-col gap-12 md:flex-row">
          {/* Gallery */}
          <div className="md:w-[55%]">
            <ZoomImage src={gallery[imgIdx]} alt={product.name} />
            {gallery.length > 1 && (
              <div className="mt-4 flex gap-3">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`h-[90px] w-[72px] flex-shrink-0 overflow-hidden bg-surface p-0 ${
                      imgIdx === i ? 'border-2 border-ink' : 'border border-beige'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col md:w-[45%]">
            <h1 className="mb-1.5 font-heading not-italic text-ink" style={{ fontSize: 'clamp(22px, 2.8vw, 30px)' }}>
              {product.name}
            </h1>
            {product.description && (
              <p className="mb-3.5 font-heading text-base italic text-mauve">{product.description}</p>
            )}

            {/* Rating */}
            <div className="mb-8 flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    strokeWidth={1.5}
                    className={n <= Math.round(reviews.average) ? 'fill-ink text-ink' : 'text-beige'}
                  />
                ))}
              </div>
              <span className="text-xs text-mauve">
                {reviews.count > 0 ? `${reviews.average} (${reviews.count} review${reviews.count === 1 ? '' : 's'})` : 'No reviews yet'}
              </span>
            </div>

            {/* Price */}
            <div className="mb-3 flex items-center gap-3">
              <span className="text-[22px] font-bold text-ink">{inr(price)}</span>
              {mrp > price && (
                <span className="text-base text-mauve-soft line-through">{inr(mrp)}</span>
              )}
              {discount > 0 && (
                <span className="bg-blush px-2.5 py-0.5 text-xs text-ink">{discount}% off</span>
              )}
            </div>

            {/* Stock hint */}
            {product.variants?.length > 0 && (
              <p className="mb-6 text-xs font-medium">
                {!activeVariant || stock === 0 ? (
                  <span className="text-red-700">Out of stock in this combination</span>
                ) : stock < 5 ? (
                  <span className="text-red-700">Only {stock} left — order soon</span>
                ) : (
                  <span className="text-mauve-dark">In stock · ships in 24 hrs</span>
                )}
              </p>
            )}

            {/* Colours */}
            {colours.length > 0 && (
              <div className="mb-6">
                <p className="mb-2.5 text-xs font-semibold text-ink">
                  Colour: <span className="font-normal">{selectedColourName}</span>
                </p>
                <div className="flex gap-2">
                  {colours.map((c) => (
                    <span key={c._id} className={colourInStock(c._id) ? '' : 'opacity-35'}>
                      <ColorDot
                        c={c.hexCode || '#E8CDD3'}
                        selected={selectedColor === c._id}
                        onClick={() => selectColour(c._id)}
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div className="mb-6">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink">
                    Size: <span className="font-normal">{selectedSizeName}</span>
                  </p>
                  <button type="button" onClick={() => setSizeGuideOpen(true)} className="text-xs text-ink underline underline-offset-2">Size Guide →</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <SizePill
                      key={s._id}
                      label={s.name}
                      active={selectedSize === s._id}
                      disabled={!sizeInStock(s._id)}
                      onClick={() => setSelectedSize(s._id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6 flex items-center gap-4">
              <p className="text-xs font-semibold text-ink">Qty</p>
              <div className="flex items-center gap-3 border border-beige px-4 py-1.5">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex text-ink" aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span className="min-w-[20px] text-center text-sm font-semibold text-ink">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="flex text-ink" aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={!canBuy}
              className="mb-3 h-[52px] w-full bg-ink text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {canBuy ? 'Add to Cart' : 'Out of Stock'}
            </button>

            {/* Wishlist */}
            <button
              onClick={() =>
                toggleWishlist({
                  id: product._id,
                  slug: product.slug,
                  name: product.name,
                  tag: product.isFeatured ? 'BEST SELLER' : 'NEW IN',
                  price,
                  mrp,
                  img: gallery[0],
                })
              }
              className="mb-5 flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink"
            >
              <Heart size={15} className={wishlisted ? 'fill-baby-pink text-baby-pink' : 'text-ink'} />
              {wishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
            </button>

            {/* Chips */}
            <div className="mb-6 flex flex-wrap gap-2">
              {['Premium Cotton', 'Easy Exchange', 'Ships in 24hrs'].map((chip) => (
                <span key={chip} className="bg-baby-pink px-3.5 py-1 text-[11px] font-medium text-ink">
                  {chip}
                </span>
              ))}
            </div>

            {/* Meta */}
            <div className="mb-8 space-y-1 text-xs text-mauve">
              {(activeVariant?.sku || displayVariant?.sku) && (
                <p><span className="font-semibold text-mauve-dark">SKU:</span> {activeVariant?.sku || displayVariant?.sku}</p>
              )}
              {product.item?.name && <p><span className="font-semibold text-mauve-dark">Type:</span> {product.item.name}</p>}
              <p><span className="font-semibold text-mauve-dark">Vendor:</span> Nine Secrets</p>
            </div>

            {/* Accordions */}
            <div className="border-t border-beige">
              {accordions.map((acc, i) => (
                <div key={acc.title} className="border-b border-beige">
                  <button
                    onClick={() => setOpenAcc(openAcc === i ? null : i)}
                    className="flex w-full items-center justify-between py-4 text-left text-[13px] font-semibold text-ink"
                  >
                    {acc.title}
                    {openAcc === i ? (
                      <ChevronUp size={16} strokeWidth={1.5} />
                    ) : (
                      <ChevronDown size={16} strokeWidth={1.5} />
                    )}
                  </button>
                  {openAcc === i && (
                    <p className="pb-4 text-[13px] font-medium leading-[1.75] text-mauve-dark">{acc.body}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-20 border-t border-beige pt-14">
          <h2 className="mb-8 font-heading italic text-ink" style={{ fontSize: 'clamp(24px, 2.6vw, 32px)' }}>
            Reviews {reviews.count > 0 && <span className="text-mauve">({reviews.count})</span>}
          </h2>
          <div className="flex flex-col gap-10 md:flex-row">
            <div className="md:w-1/2">
              {reviews.docs.length === 0 ? (
                <p className="text-sm text-mauve">No reviews yet — be the first to share your experience.</p>
              ) : (
                <div className="space-y-6">
                  {reviews.docs.map((r) => (
                    <div key={r._id} className="border-b border-beige/60 pb-5">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} size={12} strokeWidth={1.5} className={n <= r.rating ? 'fill-ink text-ink' : 'text-beige'} />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-ink">{r.user?.name || 'Customer'}</span>
                        <span className="flex items-center gap-0.5 bg-pastel-green px-2 py-0.5 text-[10px] text-ink">
                          <BadgeCheck size={11} strokeWidth={1.5} /> Verified Purchase
                        </span>
                        <span className="text-[11px] text-mauve">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.comment && <p className="text-sm leading-relaxed text-mauve-dark">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:w-1/2">
              <ReviewForm
                productId={product._id}
                user={user}
                onSaved={async () => {
                  const rres = await api.post('/review/list', { productId: product._id, limit: 20 });
                  setReviews(rres.data.data);
                }}
              />
            </div>
          </div>
        </div>

        {/* You may also like */}
        {related.length > 0 && (
        <div className="mt-20 border-t border-beige pt-14">
          <h2 className="mb-10 font-heading italic text-ink" style={{ fontSize: 'clamp(26px, 3vw, 36px)' }}>
            You may also like
          </h2>
          <div className="no-scrollbar flex gap-7 overflow-x-auto pb-4">
            {related.slice(0, 4).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={() => (p.slug ? navigate(`/product/${p.slug}`) : navigate('/collection'))}
              />
            ))}
          </div>
        </div>
        )}
      </div>
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} categoryName={product.item?.name} />}
    </div>
  );
}
