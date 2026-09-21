import { useNavigate } from 'react-router-dom';

export function TagBadge({ label, green }) {
  return (
    <span
      className={`inline-block px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-ink ${green ? 'bg-pastel-green' : 'bg-baby-pink'}`}
    >
      {label}
    </span>
  );
}

export function ColorDot({ c, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="colour swatch"
      className={`h-5 w-5 rounded-full ${selected ? 'border-2 border-ink' : 'border border-beige'}`}
      style={{ background: c }}
    />
  );
}

// Horizontal-scroller product card with the hover "ADD TO CART" reveal panel.
export default function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate();
  const goToProduct = () => product.slug && navigate(`/product/${product.slug}`);
  const pct = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

  return (
    <div className="group w-[280px] flex-shrink-0 cursor-pointer" onClick={goToProduct}>
      <div className="relative overflow-hidden bg-surface">
        <div className="aspect-square overflow-hidden bg-beige/40">
          {product.img && (
            <img
              src={product.img}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.03]"
            />
          )}
        </div>
        <div className="absolute left-0 top-0">
          <TagBadge label={product.tag} green={product.tag === 'NEW IN'} />
        </div>
        {pct > 0 && (
          <span className="absolute right-0 top-0 bg-ink px-2.5 py-1 text-[10px] font-bold text-cream">-{pct}%</span>
        )}
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-surface px-4 py-3.5 transition-transform duration-[450ms] ease-out group-hover:translate-y-0">
          <p className="mb-1.5 font-heading italic text-[15px] text-ink">{product.name}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(product.colors || []).slice(0, 4).map((c, i) => (
                <ColorDot key={i} c={c} />
              ))}
            </div>
            <span className="text-sm font-semibold text-ink">₹{product.price}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAddToCart) onAddToCart(product);
              else goToProduct();
            }}
            className="mt-2.5 w-full bg-ink py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-cream"
          >
            VIEW PRODUCT
          </button>
        </div>
      </div>
      <div className="mt-3 px-1">
        <p className="font-heading not-italic text-base text-ink">{product.name}</p>
        <p className="mt-0.5 text-xs text-mauve">{product.desc}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">₹{product.price}</span>
          {product.mrp > product.price && (
            <span className="text-xs text-mauve-soft line-through">₹{product.mrp}</span>
          )}
        </div>
      </div>
    </div>
  );
}
