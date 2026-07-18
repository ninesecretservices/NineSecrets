import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Camera, ChevronLeft, ChevronRight, BadgeCheck, Volume2, VolumeX } from 'lucide-react';
import api, { resolveImageUrl } from '../utils/api';
import { getHomepageSettings } from '../utils/settings';
import ProductCard from '../components/ProductCard';
import useTitle from '../utils/useTitle';
import { toCardProduct } from '../utils/designData';
import {
  HOME_DEFAULTS,
  normalizeHomepage,
  activeHero,
  heroSlides,
} from '../utils/homeContent';

// Hero carousel: 1–3 rotating full-bleed promotional banners, each clickable
// to its target — edge-to-edge image with overlaid text on a gradient scrim,
// mirroring the reference site's stacked full-width banner treatment.
function HeroCarousel({ content }) {
  const slides = heroSlides(content);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  const h = slides[idx % slides.length];

  const go = (dir) => setIdx((i) => (i + dir + slides.length) % slides.length);

  return (
    <section className="relative h-[78vh] min-h-[480px] w-full overflow-hidden bg-ink md:h-[88vh]">
      {h.image && (
        <img
          key={idx}
          src={resolveImageUrl(h.image)}
          alt="Nine Secrets hero"
          className="absolute inset-0 h-full w-full animate-[fadeSlide_0.6s_ease-out] object-cover object-top"
        />
      )}
      <div className="absolute inset-0 bg-ink/30" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {h.eyebrow && (
          <span className="mb-4 block text-[11px] uppercase tracking-[0.18em] text-cream/90">{h.eyebrow}</span>
        )}
        {h.heading && (
          <h1
            key={`h-${idx}`}
            className="mb-4 max-w-2xl animate-[fadeSlide_0.6s_ease-out] whitespace-pre-line font-heading italic leading-[1.15] text-cream"
            style={{ fontSize: 'clamp(32px, 4.6vw, 56px)' }}
          >
            {h.heading}
          </h1>
        )}
        {h.subtext && <p className="mb-6 text-sm tracking-[0.04em] text-cream/90">{h.subtext}</p>}
        {h.features && (
          <div className="mb-9 text-[11px] uppercase tracking-[0.14em] text-cream/80">{h.features}</div>
        )}
        {h.ctaLabel && (
          <Link to={h.link || '/collection'} className="bg-cream px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-white">
            {h.ctaLabel}
          </Link>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-cream transition-colors hover:bg-cream/10 md:flex md:left-6"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-cream transition-colors hover:bg-cream/10 md:flex md:right-6"
          >
            <ChevronRight size={22} />
          </button>
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === idx % slides.length ? 'w-6 bg-cream' : 'w-2 bg-cream/40 hover:bg-cream/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// Horizontal scroller with floating prev/next arrow buttons — shared by every
// product carousel and the category-circle row, mirroring the reference's
// swipeable rows with visible arrow controls at the edges.
function HScroller({ children, itemWidth = 320, arrowClassName = '' }) {
  const ref = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const scrollBy = (dir) => ref.current?.scrollBy({ left: dir * itemWidth, behavior: 'smooth' });

  // Re-checked after every render (cheap — one layout read) so a short row
  // (e.g. only 3 categories filled in) is centered with no dead arrows,
  // while a row that actually overflows keeps the scrollable/arrow behavior.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  });

  return (
    <div className="relative">
      {overflowing && (
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className={`absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-beige bg-surface text-ink shadow-md transition-colors hover:bg-cream md:flex ${arrowClassName}`}
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <div ref={ref} className={`no-scrollbar flex gap-7 overflow-x-auto pb-4 ${overflowing ? '' : 'justify-center'}`}>
        {children}
      </div>
      {overflowing && (
        <button
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className={`absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-beige bg-surface text-ink shadow-md transition-colors hover:bg-cream md:flex ${arrowClassName}`}
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

// Circular category row right under the header — the reference site's
// signature "shop by look" strip, shown before the hero banner.
function CategoryCircles({ categories }) {
  if (!categories || categories.length === 0) return null;
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-7xl px-10">
        <HScroller itemWidth={240}>
          {categories.map((cat, i) => (
            <Link key={i} to={cat.link || '/collection'} className="group flex w-[110px] flex-shrink-0 flex-col items-center gap-3 text-center">
              <div className="h-[110px] w-[110px] overflow-hidden rounded-full bg-beige">
                <img
                  src={resolveImageUrl(cat.image)}
                  alt={cat.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="font-heading text-sm not-italic leading-tight text-ink">{cat.title}</p>
            </Link>
          ))}
        </HScroller>
      </div>
    </section>
  );
}

// One horizontally-scrollable product carousel per category, with "View all".
function CategoryProductRow({ item }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let alive = true;
    api.post('/product/public-list', { page: 1, limit: 8, item: item._id, sort: 'newest' })
      .then((res) => { if (alive) setProducts((res.data.data.docs || []).map(toCardProduct)); })
      .catch(() => { if (alive) setProducts([]); });
    return () => { alive = false; };
  }, [item._id]);

  if (!products || products.length === 0) return null;
  const viewAll = `/collection?item=${item._id}&cat=${encodeURIComponent(item.name)}`;

  return (
    <div className="mb-14 last:mb-0">
      <div className="mb-2 text-center">
        <Link to={viewAll} className="font-heading italic text-ink transition-opacity hover:opacity-70" style={{ fontSize: 'clamp(24px, 2.6vw, 34px)' }}>
          {item.name}
        </Link>
      </div>
      <p className="mb-8 text-center text-[10px] uppercase tracking-[0.16em] text-mauve">Swipe left</p>
      <HScroller>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAddToCart={() => (p.slug ? navigate(`/product/${p.slug}`) : navigate(viewAll))} />
        ))}
      </HScroller>
    </div>
  );
}

function CategoryCarousels() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.post('/item/public-list', { page: 1, limit: 50 })
      .then((res) => setItems(res.data.data.docs || []))
      .catch(() => {});
  }, []);
  if (items.length === 0) return null;
  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {items.map((item) => <CategoryProductRow key={item._id} item={item} />)}
      </div>
    </section>
  );
}

function UspStrip({ items }) {
  // Mirrors the announcement bar's colours (band token) so the two strips read
  // as one design system — dark on blush themes, blush on the original.
  // Continuous marquee like the reference site's benefits strip; content is
  // duplicated once so the 50%-translate loop is seamless.
  const track = [...items, ...items];
  return (
    <div className="overflow-hidden bg-band py-[18px]">
      <div className="flex w-max animate-marquee items-center gap-16">
        {track.map((u, i) => (
          <div key={i} className="flex flex-shrink-0 items-center gap-2.5">
            <span className="text-sm text-band-text">{u.icon}</span>
            <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.08em] text-band-text">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Curated product row: auto (featured/newest) or hand-picked ids.
function useRowProducts(rowConfig) {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const body = { page: 1, limit: rowConfig.count || 4, sort: 'newest' };
        if (rowConfig.mode === 'featured') body.featured = true;
        if (rowConfig.mode === 'custom' && rowConfig.productIds?.length) body.ids = rowConfig.productIds;
        const res = await api.post('/product/public-list', body);
        const docs = res.data.data.docs || [];
        if (alive) setProducts(docs.map(toCardProduct));
      } catch {
        if (alive) setProducts([]);
      }
    })();
    return () => { alive = false; };
  }, [rowConfig.mode, rowConfig.count, JSON.stringify(rowConfig.productIds)]);
  return products || [];
}

function ProductRow({ config, centered }) {
  const navigate = useNavigate();
  const products = useRowProducts(config);
  if (products.length === 0) return null;
  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-2 text-center">
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-ink">{config.eyebrow}</p>
          <Link to="/collection?sort=newest" className="font-heading italic text-ink transition-opacity hover:opacity-70" style={{ fontSize: 'clamp(28px, 3.2vw, 40px)' }}>
            {config.heading}
          </Link>
        </div>
        <p className="mb-10 text-center text-[10px] uppercase tracking-[0.16em] text-mauve">Swipe left</p>
        <HScroller>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={() => (p.slug ? navigate(`/product/${p.slug}`) : navigate('/collection'))} />
          ))}
        </HScroller>
      </div>
    </section>
  );
}

// Customer testimonials: one review at a time in a large quote card, with an
// aggregate rating badge above and prev/next arrows below — mirroring the
// reference site's "Customers are saying" carousel.
function TestimonialsSection() {
  const [reviews, setReviews] = useState(null);
  const [stats, setStats] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api.post('/review/featured', { limit: 10 }).then((res) => setReviews(res.data.data)).catch(() => setReviews([]));
    api.post('/review/stats', {}).then((res) => setStats(res.data.data)).catch(() => {});
  }, []);

  if (!reviews || reviews.length === 0) return null;
  const r = reviews[idx % reviews.length];

  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-3xl px-6 text-center md:px-10">
        <h2 className="mb-3 font-heading italic text-ink" style={{ fontSize: 'clamp(28px, 3.2vw, 40px)' }}>Customers are saying</h2>
        {stats && stats.count > 0 && (
          <p className="mb-8 flex flex-wrap items-center justify-center gap-2 text-sm text-mauve-dark">
            <span className="text-ink" aria-hidden>
              {'★'.repeat(Math.round(stats.average))}{'☆'.repeat(5 - Math.round(stats.average))}
            </span>
            <b className="text-ink">{stats.average}</b> ({stats.count})
            <span className="flex items-center gap-1 text-xs text-mauve-dark">
              <BadgeCheck size={13} className="text-pastel-green" /> Verified
            </span>
          </p>
        )}
        <div className="bg-baby-pink px-8 py-14 md:px-16">
          <span className="mb-2 block font-heading text-6xl italic leading-none text-ink/60" aria-hidden>&rdquo;</span>
          <p className="mb-6 text-base leading-relaxed text-ink">{r.comment}</p>
          <div className="mb-3 flex justify-center gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n <= r.rating ? 'text-ink' : 'text-beige'}>★</span>
            ))}
          </div>
          <p className="text-sm font-semibold text-ink">{r.user?.name || 'Verified Customer'}</p>
          {r.product?.name && (
            <Link
              to={r.product.slug ? `/product/${r.product.slug}` : '/collection'}
              className="mt-1 inline-block text-xs text-ink underline underline-offset-4"
            >
              {r.product.name}
            </Link>
          )}
        </div>
        {reviews.length > 1 && (
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => setIdx((i) => (i - 1 + reviews.length) % reviews.length)}
              aria-label="Previous review"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-beige text-ink transition-colors hover:bg-beige/40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % reviews.length)}
              aria-label="Next review"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-beige text-ink transition-colors hover:bg-beige/40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function PromiseSection({ content }) {
  return (
    <section className="bg-beige">
      <div className="flex min-h-[520px] flex-col md:flex-row">
        <div className="max-h-[600px] overflow-hidden bg-blush/40 md:w-1/2">
          {content.image && (
            <img
              src={resolveImageUrl(content.image)}
              alt="Nine Secrets promise"
              loading="lazy"
              className="h-full w-full object-cover object-top"
            />
          )}
        </div>
        <div className="flex flex-col justify-center px-10 py-16 md:w-1/2 md:px-20">
          <p className="mb-5 text-[11px] uppercase tracking-[0.16em] text-ink">{content.eyebrow}</p>
          <h2 className="mb-6 whitespace-pre-line font-heading italic leading-[1.3] text-ink" style={{ fontSize: 'clamp(26px, 3vw, 40px)' }}>
            {content.heading}
          </h2>
          <p className="mb-9 max-w-[400px] text-sm font-medium leading-[1.8] text-mauve-dark">{content.body}</p>
          <Link to="/collection" className="w-fit border border-ink px-[30px] py-[13px] text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-all hover:bg-ink hover:text-cream">
            {content.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

function InstaTile({ src, href, type = 'image' }) {
  const [muted, setMuted] = useState(true);

  const tile = (
    <div className="group relative aspect-square cursor-pointer overflow-hidden">
      {type === 'video' ? (
        <video
          src={src}
          className="h-full w-full object-cover brightness-[0.92] transition-all duration-[400ms] group-hover:brightness-[1.08]"
          autoPlay
          loop
          muted={muted}
          playsInline
        />
      ) : (
        <img
          src={src}
          alt="Nine Secrets lifestyle photo"
          loading="lazy"
          className="h-full w-full object-cover brightness-[0.92] transition-all duration-[400ms] group-hover:brightness-[1.08]"
        />
      )}
      {type === 'video' ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMuted((m) => !m); }}
          aria-label={muted ? 'Unmute video' : 'Mute video'}
          className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-cream"
        >
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      ) : (
        <>
          <div className="absolute inset-0 bg-blush/[0.13] transition-opacity duration-[400ms] group-hover:opacity-0" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <Heart size={22} className="fill-cream text-cream" />
          </div>
        </>
      )}
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer" aria-label="View post on Instagram">{tile}</a> : tile;
}

// Behold (behold.so) JSON feed → up to 6 grid tiles linked to their Instagram posts.
const fetchBeholdPosts = async (feedUrl) => {
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error('Behold feed unavailable');
  const feed = await res.json();
  const posts = Array.isArray(feed) ? feed : feed.posts || feed.media || [];
  return posts
    .map((p) => ({
      img: p.sizes?.medium?.mediaUrl || (p.mediaType === 'VIDEO' ? p.thumbnailUrl : p.mediaUrl) || p.thumbnailUrl || p.mediaUrl,
      link: p.permalink,
    }))
    .filter((p) => p.img)
    .slice(0, 6);
};

function InstagramSection({ content }) {
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    if (!content.beholdUrl) return;
    fetchBeholdPosts(content.beholdUrl).then((p) => p.length && setPosts(p)).catch(() => {});
  }, [content.beholdUrl]);

  const manualImages = content.images || [];
  if (!posts && manualImages.length === 0) return null;

  // Fewer than 6 tiles? Size the grid to match, so tiles fill the row and
  // grow proportionally instead of leaving a dead empty column behind.
  const itemCount = posts ? posts.length : manualImages.length;
  const desktopColsClass = {
    1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3',
    4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6',
  }[Math.min(Math.max(itemCount, 1), 6)];

  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-ink">As Seen On @ninesecrets</p>
          <h2 className="font-heading italic text-ink" style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>Customer Diaries</h2>
        </div>
        <div className={`mb-12 grid grid-cols-3 gap-3 ${desktopColsClass}`}>
          {posts
            ? posts.map((p, i) => <InstaTile key={i} src={p.img} href={p.link} />)
            : manualImages.map((item, i) => {
                const media = typeof item === 'string' ? { url: item, type: 'image' } : item;
                return <InstaTile key={i} src={resolveImageUrl(media.url)} type={media.type} />;
              })}
        </div>
        <div className="flex justify-center">
          <a
            href={content.profileUrl || 'https://instagram.com/ninesecrets'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-pastel-green px-7 py-[13px] text-xs font-semibold tracking-[0.08em] text-ink"
          >
            <Camera size={14} />
            Follow us on Instagram
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useTitle('', 'Premium innerwear for every woman. Crafted with care, priced with honesty.');
  const [content, setContent] = useState(normalizeHomepage(HOME_DEFAULTS));
  // Once live editor content has arrived, the (slower) server fetch must never overwrite it.
  const gotLiveContent = useRef(false);

  useEffect(() => {
    getHomepageSettings().then((saved) => {
      if (!gotLiveContent.current) setContent(normalizeHomepage(saved));
    });
  }, []);

  // Live-preview bridge: when embedded by the admin editor (?preview=1),
  // receive draft content as it is typed and scroll to the section being edited.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('preview')) return;
    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'ns-preview-content' && e.data.content) {
        gotLiveContent.current = true;
        setContent(normalizeHomepage(e.data.content));
      }
      if (e.data?.type === 'ns-scroll') {
        if (e.data.section === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
        else document.getElementById(`section-${e.data.section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('message', onMessage);
    // Handshake: tell the editor we're mounted so it (re)sends the current draft —
    // a push sent before this listener existed would otherwise be lost.
    window.parent?.postMessage({ type: 'ns-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const renderSection = (key) => {
    if (content.sectionsVisible[key] === false) return null;
    const wrap = (node) => <div key={key} id={`section-${key}`}>{node}</div>;
    switch (key) {
      case 'usp':
        return wrap(<UspStrip items={content.usp} />);
      case 'catrows':
        return wrap(<CategoryCarousels />);
      case 'bestsellers':
        return wrap(<ProductRow config={content.bestsellers} />);
      case 'promise':
        return wrap(<PromiseSection content={content.promise} />);
      case 'justarrived':
        return wrap(<ProductRow config={content.justarrived} />);
      case 'testimonials':
        return wrap(<TestimonialsSection />);
      case 'instagram':
        return wrap(<InstagramSection content={content.instagram} />);
      default:
        return null;
    }
  };

  return (
    <div className="bg-cream font-body text-ink">
      {content.sectionsVisible.categories !== false && (
        <div id="section-categories"><CategoryCircles categories={content.categories} /></div>
      )}
      <div id="section-hero"><HeroCarousel content={content} /></div>
      {content.sectionsOrder.filter((k) => k !== 'categories').map(renderSection)}
    </div>
  );
}
