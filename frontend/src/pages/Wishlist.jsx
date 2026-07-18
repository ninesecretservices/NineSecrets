import { Link, useNavigate } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import useStore from '../store/useStore';
import { TagBadge } from '../components/ProductCard';

export default function Wishlist() {
  const wishlist = useStore((s) => s.wishlist);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] bg-cream font-body text-ink">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <h1
          className="mb-2 font-heading italic text-ink"
          style={{ fontSize: 'clamp(30px, 3.5vw, 44px)' }}
        >
          Your Wishlist
        </h1>
        <p className="mb-10 text-sm text-mauve-dark">
          {wishlist.length === 0
            ? 'Nothing saved yet.'
            : `${wishlist.length} saved ${wishlist.length === 1 ? 'piece' : 'pieces'}.`}
        </p>

        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <Heart size={40} strokeWidth={1} className="text-blush" />
            <p className="text-mauve">
              Tap the heart on any product to save it here.
            </p>
            <Link
              to="/collection"
              className="bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream"
            >
              Explore the Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {wishlist.map((p) => (
              <div key={p.id} className="group relative">
                <button
                  onClick={() => toggleWishlist(p)}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center bg-cream/90 text-ink transition-colors hover:bg-blush"
                  aria-label="Remove from wishlist"
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
                <div
                  className="cursor-pointer overflow-hidden"
                  onClick={() => p.slug && navigate(`/product/${p.slug}`)}
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute left-3 top-3">
                      <TagBadge label={p.tag} green={p.tag === 'NEW IN'} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 px-1">
                  <p className="font-heading not-italic text-[15px] text-ink">
                    {p.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      ₹{p.price}
                    </span>
                    {p.mrp > p.price && (
                      <span className="text-xs text-mauve-soft line-through">
                        ₹{p.mrp}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
