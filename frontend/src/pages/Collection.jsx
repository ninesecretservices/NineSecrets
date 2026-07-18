import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { TagBadge } from '../components/ProductCard';
import { toCardProduct } from '../utils/designData';
import { inr } from '../utils/format';
import useTitle from '../utils/useTitle';

const FILTERS = ['All', 'Padded', 'Non-Padded', 'Cotton', 'Push-Up', 'Plus Size'];
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

function GridCard({ product, onClick }) {
  const addToCart = useStore((st) => st.addToCart);
  const toast = useStore((st) => st.toast);
  const [picking, setPicking] = useState(false);
  const pct = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const sizesInStock = [...new Map(
    (product.variants || []).filter((v) => v.stock > 0 && v.size).map((v) => [v.size._id || v.size, v.size])
  ).values()];

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

  return (
    <div className="flex flex-col">
      <div className="group relative cursor-pointer overflow-hidden bg-surface" onClick={onClick}>
        <div className="relative aspect-square overflow-hidden">
          <img
            src={product.img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[550ms] group-hover:scale-[1.03]"
          />
          <div className="absolute left-0 top-0">
            <TagBadge label={product.tag} green={product.tag === 'NEW IN'} />
          </div>
          {pct > 0 && (
            <span className="absolute right-0 top-0 bg-ink px-2.5 py-1 text-[10px] font-bold text-cream">
              -{pct}%
            </span>
          )}
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
  const [activeFilter, setActiveFilter] = useState('All');
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter pills search the catalogue by name; the URL ?search= term wins when set.
  const effectiveSearch = urlSearch || (activeFilter !== 'All' ? activeFilter : '');

  const fetchPage = useCallback(async (pageNum, append) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await api.post('/product/public-list', {
        page: pageNum,
        limit: PAGE_SIZE,
        sort,
        ...(urlItem && { item: urlItem }),
        ...(bestsellers && { featured: true }),
        ...(effectiveSearch && { search: effectiveSearch }),
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
  }, [effectiveSearch, sort, urlItem, bestsellers]);

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
            Everyday comfort, premium feel. {total} {total === 1 ? 'style' : 'styles'}.
          </p>
        </div>
      </div>

      {/* Sticky filter pills + sort */}
      <div className="sticky top-16 z-40 border-b border-beige bg-surface py-3.5">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 md:px-10">
          <div className="no-scrollbar flex flex-grow gap-3 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => {
                setActiveFilter(f);
                if (urlSearch) navigate('/collection');
              }}
              className={`flex-shrink-0 whitespace-nowrap border px-[18px] py-[7px] text-xs font-medium transition-all ${
                activeFilter === f && !urlSearch
                  ? 'border-ink bg-ink text-cream'
                  : 'border-beige bg-transparent text-ink'
              }`}
            >
              {f}
            </button>
          ))}
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
            No products found{effectiveSearch ? ` for “${effectiveSearch}”` : ''}.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <GridCard key={p.id} product={p} onClick={() => p.slug && navigate(`/product/${p.slug}`)} />
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
    </div>
  );
}
