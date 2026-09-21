import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, LayoutGrid, List, Eye } from 'lucide-react';
import api from '../utils/api';
import { TagBadge } from '../components/ProductCard';
import { toCardProduct } from '../utils/designData';
import { inr } from '../utils/format';
import useTitle from '../utils/useTitle';
import QuickViewModal from '../components/QuickViewModal';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];
const PAGE_SIZE = 12;

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square bg-beige/60" />
      <div className="mt-3 h-4 w-3/4 bg-beige/60" />
      <div className="mt-2 h-3 w-1/2 bg-beige/50" />
    </div>
  );
}

function GridCard({ product, onClick, listView, onQuickView }) {
  const addToCart = useStore((st) => st.addToCart);
  const toast = useStore((st) => st.toast);
  const toggleWishlist = useStore((st) => st.toggleWishlist);
  const wishlisted = useStore((st) => st.isWishlisted(product.id));
  const [picking, setPicking] = useState(false);
  const pct = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const sizesInStock = [...new Map(
    (product.variants || []).filter((v) => v.stock > 0 && v.size).map((v) => [v.size._id || v.size, v.size])
  ).values()];
  const totalStock = (product.variants || []).reduce((s, v) => s + (v.stock || 0), 0);

  const quickAdd = (e, sizeId) => {
    e.stopPropagation();
    const inStock = (product.variants || []).filter((v) => v.stock > 0);
    if (inStock.length === 0) { toast('Out of stock', 'error'); return; }
    if (!sizeId && inStock.length > 1 && sizesInStock.length > 1) { setPicking(true); return; }
    const v = sizeId ? inStock.find((x) => (x.size._id || x.size) === sizeId) : inStock[0];
    if (!v) return;
    addToCart(product.raw, v, 1, v.sellingPrice || v.mrp);
    setPicking(false);
  };

  const wishlistButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleWishlist(product);
      }}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
      className="flex h-8 w-8 items-center justify-center bg-cream/90 text-ink transition-colors hover:bg-blush"
    >
      <Heart size={14} className={wishlisted ? 'fill-baby-pink text-baby-pink' : 'text-ink'} />
    </button>
  );

  const stockBadge = totalStock === 0 ? (
    <span className="mt-1 inline-block text-[11px] font-medium text-mauve">Out of stock</span>
  ) : totalStock < 5 ? (
    <span className="mt-1 inline-block text-[11px] font-medium text-red-700">Only {totalStock} left</span>
  ) : null;

  if (listView) {
    return (
      <div className="flex cursor-pointer gap-4 border-b border-beige py-4" onClick={onClick}>
        <div className="relative h-32 w-24 flex-shrink-0 overflow-hidden bg-beige/40">
          {product.img && <img src={product.img} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
          {pct > 0 && (
            <span className="absolute right-0 top-0 bg-ink px-2 py-0.5 text-[9px] font-bold text-cream">-{pct}%</span>
          )}
        </div>
        <div className="flex flex-grow flex-col justify-between py-0.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="font-heading not-italic text-base text-ink">{product.name}</p>
              <div className="flex flex-shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onQuickView(product)}
                  aria-label="Quick view"
                  className="flex h-8 w-8 items-center justify-center bg-cream/90 text-ink transition-colors hover:bg-blush"
                >
                  <Eye size={14} />
                </button>
                {wishlistButton}
              </div>
            </div>
            <p className="mt-0.5 text-[12px] text-mauve">{product.desc}</p>
            {stockBadge}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{inr(product.price)}</span>
              {product.mrp > product.price && (
                <span className="text-xs text-mauve-soft line-through">{inr(product.mrp)}</span>
              )}
            </div>
            <button
              onClick={(e) => (product.variants?.length ? quickAdd(e) : (e.stopPropagation(), onClick()))}
              disabled={totalStock === 0}
              className="bg-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-cream disabled:opacity-40"
            >
              {totalStock === 0 ? 'Out of Stock' : product.variants?.length ? 'Add to Cart' : 'View'}
            </button>
          </div>
          {picking && (
            <div onClick={(e) => e.stopPropagation()} className="mt-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Pick a size</p>
              <div className="flex flex-wrap gap-1.5">
                {sizesInStock.map((sz) => (
                  <button
                    key={sz._id || sz}
                    onClick={(e) => quickAdd(e, sz._id || sz)}
                    className="border border-ink px-3 py-1 text-[11px] font-semibold text-ink hover:bg-ink hover:text-cream"
                  >
                    {sz.name || sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="group relative cursor-pointer overflow-hidden bg-surface" onClick={onClick}>
        <div className="relative aspect-square overflow-hidden bg-beige/40">
          {product.img && (
            <img
              src={product.img}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[550ms] group-hover:scale-[1.03]"
            />
          )}
          <div className="absolute left-0 top-0">
            <TagBadge label={product.tag} green={product.tag === 'NEW IN'} />
          </div>
          <div className="absolute right-0 top-0 flex flex-col items-end gap-1">
            {pct > 0 && (
              <span className="bg-ink px-2.5 py-1 text-[10px] font-bold text-cream">
                -{pct}%
              </span>
            )}
            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onQuickView(product)}
                aria-label="Quick view"
                className="flex h-8 w-8 items-center justify-center bg-cream/90 text-ink transition-colors hover:bg-blush"
              >
                <Eye size={14} />
              </button>
              {wishlistButton}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-surface px-3.5 py-3 transition-transform duration-[400ms] group-hover:translate-y-0 group-focus-within:translate-y-0">
            {picking ? (
              <div onClick={(e) => e.stopPropagation()}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-mauve">Pick a size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizesInStock.map((sz) => (
                    <button
                      key={sz._id || sz}
                      onClick={(e) => quickAdd(e, sz._id || sz)}
                      className="border border-ink px-3 py-1 text-[11px] font-semibold text-ink hover:bg-ink hover:text-cream"
                    >
                      {sz.name || sz}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => (product.variants?.length ? quickAdd(e) : (e.stopPropagation(), onClick()))}
                className="w-full bg-ink py-[9px] text-[10px] font-semibold uppercase tracking-[0.1em] text-cream"
              >
                {product.variants?.length ? 'ADD TO CART' : 'VIEW PRODUCT'}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 px-1">
        <p className="font-heading not-italic text-[15px] text-ink">{product.name}</p>
        <p className="mt-0.5 text-[11px] text-mauve">{product.desc}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{inr(product.price)}</span>
          {product.mrp > product.price && (
            <span className="text-xs text-mauve-soft line-through">{inr(product.mrp)}</span>
          )}
        </div>
        {stockBadge}
      </div>
    </div>
  );
}

export default function Collection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlSearch = params.get('search') || '';
  const urlItem = params.get('item') || ''; // category filter (item id)
  const urlCat = params.get('cat') || ''; // category display name
  const bestsellers = useLocation().pathname === '/bestsellers';

  useTitle(bestsellers ? 'Bestsellers' : urlCat || (urlSearch ? `Search: ${urlSearch}` : 'Collection'));
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [listView, setListView] = useState(false);
  const [quickViewId, setQuickViewId] = useState(null);
  const [activeFit, setActiveFit] = useState(''); // Fit _id, empty = "All"
  const [fits, setFits] = useState([]);
  const [sizesFacet, setSizesFacet] = useState([]); // available Size docs
  const [coloursFacet, setColoursFacet] = useState([]); // available Colour docs
  const [activeSizes, setActiveSizes] = useState(new Set());
  const [activeColours, setActiveColours] = useState(new Set());
  const [priceInput, setPriceInput] = useState({ min: '', max: '' });
  const [priceRange, setPriceRange] = useState({ min: '', max: '' }); // debounced — this is what actually triggers a fetch
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPriceRange(priceInput), 500);
    return () => clearTimeout(t);
  }, [priceInput]);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter pills/checkboxes come from real master data, not a hardcoded guess.
  useEffect(() => {
    api.post('/fit/public-list', { page: 1, limit: 50 })
      .then((res) => setFits(res.data.data.docs || []))
      .catch(() => {});
    api.post('/size/public-list', { page: 1, limit: 50 })
      .then((res) => setSizesFacet(res.data.data.docs || []))
      .catch(() => {});
    api.post('/colour/public-list', { page: 1, limit: 50 })
      .then((res) => setColoursFacet(res.data.data.docs || []))
      .catch(() => {});
  }, []);

  const toggleInSet = (set, id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };
  const activeFacetCount = activeSizes.size + activeColours.size + (priceRange.min ? 1 : 0) + (priceRange.max ? 1 : 0);
  const clearFacets = () => {
    setActiveSizes(new Set());
    setActiveColours(new Set());
    setPriceInput({ min: '', max: '' });
    setPriceRange({ min: '', max: '' });
  };

  const fetchPage = useCallback(async (pageNum, append) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await api.post('/product/public-list', {
        page: pageNum,
        limit: PAGE_SIZE,
        sort,
        ...(urlItem && { item: urlItem }),
        ...(bestsellers && { featured: true }),
        ...(urlSearch && { search: urlSearch }),
        ...(activeFit && { fit: activeFit }),
        ...(activeSizes.size > 0 && { sizes: [...activeSizes] }),
        ...(activeColours.size > 0 && { colours: [...activeColours] }),
        ...(priceRange.min && { minPrice: Number(priceRange.min) }),
        ...(priceRange.max && { maxPrice: Number(priceRange.max) }),
      });
      const { docs = [], total: t = 0 } = res.data.data;
      const cards = docs.map(toCardProduct);
      setProducts((prev) => (append ? [...prev, ...cards] : cards));
      setTotal(t);
      setPage(pageNum);
    } catch {
      if (!append) setProducts([]);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [urlSearch, activeFit, activeSizes, activeColours, priceRange, sort, urlItem, bestsellers]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const hasMore = products.length < total;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* Page header */}
      <div className="bg-beige pb-8 pt-10">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p className="mb-2.5 text-xs text-mauve">
            <Link to="/" className="text-mauve">Home</Link>
            {' > '}
            <span className="text-ink">{bestsellers ? 'Bestsellers' : urlCat || (urlSearch ? 'Search' : 'Collection')}</span>
          </p>
          <h1 className="mb-2 font-heading italic text-ink" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
            {bestsellers ? 'Our Bestsellers' : urlCat || (urlSearch ? `Results for “${urlSearch}”` : 'Our Collection')}
          </h1>
          <p className="text-sm font-medium text-mauve-dark">
            Everyday comfort, premium feel. {!loading && `${total} ${total === 1 ? 'style' : 'styles'}.`}
          </p>
        </div>
      </div>

      {/* Sticky filter pills + sort */}
      <div className="sticky top-16 z-40 border-b border-beige bg-surface py-3.5">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 md:px-10">
          <div className="no-scrollbar flex flex-grow gap-3 overflow-x-auto">
          <button
            onClick={() => { setActiveFit(''); if (urlSearch) navigate('/collection'); }}
            className={`flex-shrink-0 whitespace-nowrap border px-[18px] py-[7px] text-xs font-medium transition-all ${
              !activeFit && !urlSearch ? 'border-ink bg-ink text-cream' : 'border-beige bg-transparent text-ink'
            }`}
          >
            All
          </button>
          {fits.map((f) => (
            <button
              key={f._id}
              onClick={() => {
                setActiveFit(f._id);
                if (urlSearch) navigate('/collection');
              }}
              className={`flex-shrink-0 whitespace-nowrap border px-[18px] py-[7px] text-xs font-medium transition-all ${
                activeFit === f._id && !urlSearch
                  ? 'border-ink bg-ink text-cream'
                  : 'border-beige bg-transparent text-ink'
              }`}
            >
              {f.name}
            </button>
          ))}
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`flex items-center gap-1.5 border px-[14px] py-[7px] text-xs font-medium transition-all ${activeFacetCount > 0 ? 'border-ink bg-ink text-cream' : 'border-beige bg-transparent text-ink'}`}
            >
              Filters{activeFacetCount > 0 ? ` (${activeFacetCount})` : ''}
            </button>
            {filtersOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 border border-beige bg-white p-5 shadow-xl">
                {sizesFacet.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve">Size</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sizesFacet.map((s) => (
                        <button
                          key={s._id}
                          onClick={() => setActiveSizes((prev) => toggleInSet(prev, s._id))}
                          className={`border px-3 py-1 text-xs font-medium ${activeSizes.has(s._id) ? 'border-ink bg-ink text-cream' : 'border-beige text-ink'}`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {coloursFacet.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve">Colour</p>
                    <div className="flex flex-wrap gap-2">
                      {coloursFacet.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => setActiveColours((prev) => toggleInSet(prev, c._id))}
                          title={c.name}
                          className={`h-7 w-7 rounded-full border-2 ${activeColours.has(c._id) ? 'border-ink' : 'border-transparent'}`}
                          style={{ backgroundColor: c.hexCode || '#ccc' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve">Price (₹)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={priceInput.min}
                      onChange={(e) => setPriceInput((p) => ({ ...p, min: e.target.value }))}
                      className="w-full border border-beige px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink"
                    />
                    <span className="text-mauve">–</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={priceInput.max}
                      onChange={(e) => setPriceInput((p) => ({ ...p, max: e.target.value }))}
                      className="w-full border border-beige px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink"
                    />
                  </div>
                </div>
                {activeFacetCount > 0 && (
                  <button onClick={clearFacets} className="text-xs font-semibold text-mauve-dark underline underline-offset-2">
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
            className="flex-shrink-0 border border-beige bg-cream px-3 py-[7px] text-xs font-medium text-ink outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="flex flex-shrink-0 border border-beige">
            <button
              onClick={() => setListView(false)}
              aria-label="Grid view"
              aria-pressed={!listView}
              className={`flex h-[30px] w-[34px] items-center justify-center transition-colors ${!listView ? 'bg-ink text-cream' : 'bg-transparent text-ink'}`}
            >
              <LayoutGrid size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setListView(true)}
              aria-label="List view"
              aria-pressed={listView}
              className={`flex h-[30px] w-[34px] items-center justify-center border-l border-beige transition-colors ${listView ? 'bg-ink text-cream' : 'bg-transparent text-ink'}`}
            >
              <List size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-32 text-center text-mauve">
            No products found{urlSearch ? ` for “${urlSearch}”` : ''}.
          </div>
        ) : (
          <>
            <div className={listView ? 'flex flex-col' : 'grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4'}>
              {products.map((p) => (
                <GridCard
                  key={p.id}
                  product={p}
                  listView={listView}
                  onClick={() => p.slug && navigate(`/product/${p.slug}`)}
                  onQuickView={(prod) => setQuickViewId(prod.id)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-16 flex justify-center">
                <button
                  onClick={() => fetchPage(page + 1, true)}
                  disabled={loadingMore}
                  className="border border-ink bg-transparent px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-all hover:bg-ink hover:text-cream disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {quickViewId && <QuickViewModal productId={quickViewId} onClose={() => setQuickViewId(null)} />}
    </div>
  );
}
