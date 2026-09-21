import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import api, { resolveImageUrl } from '../utils/api';
import { inr } from '../utils/format';
import useStore from '../store/useStore';
import useEscapeToClose from '../utils/useEscapeToClose';

// Same-page product preview from the PLP — a scaled-down PDP so a shopper
// doesn't have to leave the grid just to check size/colour and stock.
export default function QuickViewModal({ productId, onClose }) {
  const addToCart = useStore((s) => s.addToCart);
  const toast = useStore((s) => s.toast);
  const [product, setProduct] = useState(null);
  const [selectedColour, setSelectedColour] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);

  useEscapeToClose(true, onClose);

  useEffect(() => {
    api.post('/product/public-detail', { id: productId })
      .then((res) => {
        const p = res.data.data;
        setProduct(p);
        const firstInStock = (p.variants || []).find((v) => v.stock > 0) || p.variants?.[0];
        setSelectedColour(firstInStock?.colour?._id || null);
        setSelectedSize(firstInStock?.size?._id || null);
      })
      .catch(() => toast('Could not load product', 'error'));
  }, [productId]);

  if (!product) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
        <div className="rounded-2xl bg-white px-8 py-6 text-sm text-mauve">Loading...</div>
      </div>
    );
  }

  const colours = [...new Map((product.variants || []).map((v) => [v.colour?._id, v.colour])).values()].filter(Boolean);
  const sizes = [...new Map((product.variants || []).map((v) => [v.size?._id, v.size])).values()].filter(Boolean);
  const activeVariant = (product.variants || []).find(
    (v) => (v.colour?._id || null) === selectedColour && (v.size?._id || null) === selectedSize
  );
  const stock = activeVariant?.stock ?? 0;
  const price = activeVariant?.sellingPrice ?? activeVariant?.mrp ?? product.variants?.[0]?.sellingPrice ?? 0;
  const mrp = activeVariant?.mrp ?? product.variants?.[0]?.mrp ?? 0;

  const handleAdd = () => {
    if (!activeVariant || stock < qty) {
      toast(activeVariant ? `Only ${stock} left in stock` : 'Please pick a size/colour', 'error');
      return;
    }
    addToCart(product, activeVariant, qty, price);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
      <div
        className="grid w-full max-w-2xl grid-cols-1 overflow-hidden bg-white shadow-2xl sm:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square bg-beige/40 sm:aspect-auto">
          {product.thumbnail && (
            <img src={resolveImageUrl(product.thumbnail)} alt={product.name} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col p-6">
          <button onClick={onClose} className="ml-auto mb-2 text-mauve hover:text-ink" aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
          <p className="font-heading text-xl italic text-ink">{product.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-base font-semibold text-ink">{inr(price)}</span>
            {mrp > price && <span className="text-sm text-mauve-soft line-through">{inr(mrp)}</span>}
          </div>

          {colours.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve">Colour</p>
              <div className="flex flex-wrap gap-2">
                {colours.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => setSelectedColour(c._id)}
                    title={c.name}
                    className={`h-7 w-7 rounded-full border-2 ${selectedColour === c._id ? 'border-ink' : 'border-transparent'}`}
                    style={{ backgroundColor: c.hexCode || '#ccc' }}
                  />
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const inStock = (product.variants || []).some((v) => (v.colour?._id || null) === selectedColour && v.size?._id === s._id && v.stock > 0);
                  return (
                    <button
                      key={s._id}
                      disabled={!inStock}
                      onClick={() => setSelectedSize(s._id)}
                      className={`border px-3 py-1.5 text-xs font-semibold ${selectedSize === s._id ? 'border-ink bg-ink text-cream' : 'border-beige text-ink'} disabled:cursor-not-allowed disabled:opacity-30`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center border border-beige">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1.5 text-ink">−</button>
              <span className="px-2 text-sm text-ink">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="px-3 py-1.5 text-ink">+</button>
            </div>
            {activeVariant && stock > 0 && stock < 5 && (
              <span className="text-xs font-medium text-red-700">Only {stock} left</span>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!activeVariant || stock === 0}
            className="mt-5 bg-ink py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream disabled:opacity-40"
          >
            {!activeVariant || stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <Link
            to={`/product/${product.slug}`}
            onClick={onClose}
            className="mt-3 text-center text-xs font-medium text-mauve-dark underline underline-offset-4"
          >
            View Full Details
          </Link>
        </div>
      </div>
    </div>
  );
}
