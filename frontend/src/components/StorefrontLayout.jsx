import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User, Menu, X, ChevronDown } from 'lucide-react';
import useStore from '../store/useStore';
import CartDrawer from './CartDrawer';
import Toaster from './Toaster';
import { getHomepageSettings, getPublicSetting } from '../utils/settings';
import { HOME_DEFAULTS, normalizeHomepage, activeAnnouncements } from '../utils/homeContent';
import { applyThemeTokens, clearThemeTokens } from '../utils/themes';

function AnnouncementBar() {
  const [messages, setMessages] = useState(activeAnnouncements(normalizeHomepage(HOME_DEFAULTS)));
  const [idx, setIdx] = useState(0);
  const gotLive = useRef(false);

  useEffect(() => {
    getHomepageSettings().then((s) => {
      if (!gotLive.current) setMessages(activeAnnouncements(normalizeHomepage(s)));
    });
    // Live-preview bridge (admin editor iframe)
    if (!new URLSearchParams(window.location.search).has('preview')) return;
    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'ns-preview-content' && e.data.content) {
        gotLive.current = true;
        setMessages(activeAnnouncements(normalizeHomepage(e.data.content)));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), 3500);
    return () => clearInterval(t);
  }, [messages]);

  if (messages.length === 0) return null;
  const msg = messages[idx % messages.length];

  return (
    <div className="bg-band py-2.5 text-center">
      <p key={idx} className="text-xs tracking-[0.04em] text-band-text transition-opacity duration-500">
        {msg.text}
        {'  ·  '}
        <Link to={msg.link || '/collection'} className="font-semibold">Shop Now</Link>
      </p>
    </div>
  );
}

// Primary nav mirrors the reference flow: Home / Our Collection ▾ / Bestsellers / About / Blog
const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Our Collection', to: '/collection', dropdown: true },
  { label: 'Bestsellers', to: '/bestsellers' },
  { label: 'About Us', to: '/about' },
  { label: 'Blog', to: '/blog' },
];

// Categories for the "Our Collection" submenu (public taxonomy).
function useCategories() {
  const [cats, setCats] = useState([]);
  useEffect(() => {
    import('../utils/api').then(({ default: api }) =>
      api.post('/item/public-list', { page: 1, limit: 50 })
        .then((res) => setCats(res.data.data.docs || []))
        .catch(() => {})
    );
  }, []);
  return cats;
}

const catLink = (c) => `/collection?item=${c._id}&cat=${encodeURIComponent(c.name)}`;

function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mt-24 w-full max-w-xl animate-[fadeSlide_0.25s_ease-out] border border-beige bg-surface px-6 pb-6 pt-8 shadow-2xl sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-2xl italic text-ink">What are you looking for?</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-mauve transition-colors hover:bg-beige hover:text-ink" aria-label="Close search">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) {
              navigate(`/collection?search=${encodeURIComponent(q.trim())}`);
              onClose();
              setQ('');
            }
          }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-grow">
            <Search size={16} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-mauve" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              className="w-full border border-beige bg-white py-3 pl-11 pr-4 text-sm text-ink outline-none transition-all placeholder:text-mauve focus:border-ink focus:shadow-[0_0_0_3px_rgba(32,24,32,0.06)]"
            />
          </div>
          <button type="submit" className="shrink-0 bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85">
            Search
          </button>
        </form>
      </div>
    </div>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);
  const categories = useCategories();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const toggleCart = useStore((s) => s.toggleCart);
  const user = useStore((s) => s.user);
  const wishlist = useStore((s) => s.wishlist);
  const cart = useStore((s) => s.cart);
  const cartCount = (cart?.items || []).reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <nav
        className={`sticky top-0 z-50 border-b border-beige bg-surface transition-shadow duration-300 ${scrolled ? 'shadow-[0_2px_20px_rgba(32,24,32,0.04)]' : ''}`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="" className="h-9 w-9" />
            <span className="flex flex-col items-start">
              <span className="text-[17px] font-bold uppercase leading-none tracking-[0.12em] text-ink">Nine Secrets</span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-mauve">we love your style</span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((l) =>
              l.dropdown ? (
                <div key={l.label} className="group relative">
                  <Link to={l.to} className="flex items-center gap-1 py-5 text-[13px] font-medium text-ink transition-opacity hover:opacity-60">
                    {l.label} <ChevronDown size={13} strokeWidth={1.5} className="transition-transform group-hover:rotate-180" />
                  </Link>
                  <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 border border-beige bg-surface p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                    <Link to="/collection" className="block px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-cream">All Products</Link>
                    <Link to="/collection?sort=newest" className="block px-4 py-2.5 text-[13px] text-ink hover:bg-cream">New In</Link>
                    {categories.map((c) => (
                      <Link key={c._id} to={catLink(c)} className="block px-4 py-2.5 text-[13px] text-ink hover:bg-cream">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={l.label}
                  to={l.to}
                  className="text-[13px] font-medium text-ink transition-opacity hover:opacity-60"
                >
                  {l.label}
                </Link>
              )
            )}
          </div>

          <div className="flex items-center gap-4 text-ink">
            <button onClick={() => setSearchOpen(true)} className="transition-opacity hover:opacity-60" aria-label="Search">
              <Search size={18} strokeWidth={1.5} />
            </button>
            <button onClick={() => navigate('/wishlist')} className="relative transition-opacity hover:opacity-60" aria-label="Wishlist">
              <Heart size={18} strokeWidth={1.5} />
              {wishlist.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blush text-[9px] font-bold text-ink">
                  {wishlist.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                if (!user) navigate('/login');
                else if (user.role === 'customer') navigate('/account');
                else navigate('/admin');
              }}
              className="hidden transition-opacity hover:opacity-60 md:block"
              aria-label="Account"
            >
              <User size={18} strokeWidth={1.5} />
            </button>
            <button onClick={toggleCart} className="relative transition-opacity hover:opacity-60" aria-label="Cart">
              <ShoppingBag size={18} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pastel-green text-[9px] font-bold text-ink">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setMenuOpen(true)} className="md:hidden" aria-label="Menu">
              <Menu size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile fullscreen menu */}
      <div
        className={`fixed inset-0 z-[100] bg-surface transition-transform duration-[350ms] ease-out ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-beige px-6">
          <span className="text-[17px] font-bold uppercase tracking-[0.12em] text-ink">Nine Secrets</span>
          <button onClick={() => setMenuOpen(false)} className="text-ink" aria-label="Close menu">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex flex-col gap-6 overflow-y-auto px-8 pt-10">
          {NAV_LINKS.map((l) =>
            l.dropdown ? (
              <div key={l.label}>
                <button
                  onClick={() => setMobileCatsOpen((o) => !o)}
                  className="flex w-full items-center justify-between text-left font-heading text-[28px] italic text-ink"
                >
                  {l.label}
                  <ChevronDown size={22} strokeWidth={1.5} className={`transition-transform ${mobileCatsOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileCatsOpen && (
                  <div className="mt-3 flex flex-col gap-3 border-l border-beige pl-5">
                    <Link to="/collection" onClick={() => setMenuOpen(false)} className="text-[15px] font-semibold text-ink">All Products</Link>
                    <Link to="/collection?sort=newest" onClick={() => setMenuOpen(false)} className="text-[15px] text-ink">New In</Link>
                    {categories.map((c) => (
                      <Link key={c._id} to={catLink(c)} onClick={() => setMenuOpen(false)} className="text-[15px] text-ink">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className="text-left font-heading text-[28px] italic text-ink transition-opacity hover:opacity-60"
              >
                {l.label}
              </Link>
            )
          )}
          <div className="mt-4 flex flex-col gap-4 border-t border-beige pt-6">
            <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-ink">
              <Heart size={16} strokeWidth={1.5} /> Wishlist {wishlist.length > 0 && `(${wishlist.length})`}
            </Link>
            <Link
              to={!user ? '/login' : user.role === 'customer' ? '/account' : '/admin'}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 text-sm font-medium text-ink"
            >
              <User size={16} strokeWidth={1.5} /> {user ? 'My Account' : 'Sign In'}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

const POLICY_LINKS = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Return & Cancellation', to: '/return-policy' },
  { label: 'Shipping Policy', to: '/shipping-policy' },
  { label: 'Terms of Service', to: '/terms-of-service' },
];

function Footer() {
  const [contact, setContact] = useState({ contactPhone: '', contactEmail: '', contactAddress: '', instagramUrl: '', facebookUrl: '' });

  useEffect(() => {
    import('../utils/settings.js').then(({ getCommerceSettings }) => getCommerceSettings().then(setContact));
  }, []);

  const telHref = contact.contactPhone ? `tel:${contact.contactPhone.replace(/[^0-9+]/g, '')}` : null;

  return (
    <footer className="bg-gradient-to-br from-blush/50 to-baby-pink/50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-16 md:grid-cols-2 md:px-10">
        <div>
          <p className="mb-4 font-heading text-xl italic text-ink">Quick Links</p>
          <div className="flex flex-col gap-3">
            {POLICY_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-left text-[13px] font-medium text-mauve-dark transition-all hover:text-ink hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-4 font-heading text-xl italic text-ink">Contact us</p>
          <div className="flex flex-col gap-3 text-[13px] font-medium text-mauve-dark">
            <p className="font-semibold text-ink">Nine Secrets</p>
            {contact.contactPhone && (
              <p>Phone number: <a href={telHref} className="underline underline-offset-2 hover:text-ink">{contact.contactPhone}</a></p>
            )}
            {contact.contactEmail && (
              <p>Email: <a href={`mailto:${contact.contactEmail}`} className="underline underline-offset-2 hover:text-ink">{contact.contactEmail}</a></p>
            )}
            {contact.contactAddress && <p>Address: {contact.contactAddress}</p>}
          </div>
        </div>
      </div>

      {(contact.facebookUrl || contact.instagramUrl) && (
        <div className="border-t border-ink/10 px-6 py-6 md:px-10">
          <div className="flex justify-center gap-4">
            {contact.facebookUrl && (
              <a href={contact.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-ink hover:text-cream">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="h-4 w-4" fill="currentColor">
                  <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
                </svg>
              </a>
            )}
            {contact.instagramUrl && (
              <a href={contact.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-ink hover:text-cream">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-4 w-4" fill="currentColor">
                  <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-ink/10 bg-cream py-3.5">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center text-xs text-mauve">
          <span>&copy; {new Date().getFullYear()} Nine Secrets. All rights reserved.</span>
          {POLICY_LINKS.slice(0, 3).map((link, i) => (
            <span key={link.label} className="flex items-center gap-2">
              <span className="text-beige">|</span>
              <Link to={link.to} className="hover:text-ink hover:underline">{link.label}</Link>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}

const SOCIAL_DEFAULTS = { whatsappNumber: '919876543210', instagramUrl: 'https://instagram.com/ninesecrets' };

function FloatingSocials() {
  const [links, setLinks] = useState(SOCIAL_DEFAULTS);

  useEffect(() => {
    import('../utils/settings.js').then(({ getCommerceSettings }) =>
      getCommerceSettings().then((c) =>
        setLinks({
          whatsappNumber: c.whatsappNumber ?? SOCIAL_DEFAULTS.whatsappNumber,
          instagramUrl: c.instagramUrl ?? SOCIAL_DEFAULTS.instagramUrl,
        })
      )
    );
  }, []);

  const waUrl = links.whatsappNumber
    ? `https://wa.me/${links.whatsappNumber.replace(/[^0-9]/g, '')}`
    : null;
  const igUrl = links.instagramUrl || null;

  if (!waUrl && !igUrl) return null;

  return (
    // bottom-24 on mobile clears the fixed "Add to Cart" buy bar on product
    // pages (which sits at the very bottom, z-40) — both are position:fixed,
    // so without this offset they permanently overlap on every mobile PDP.
    <div className="fixed bottom-24 right-6 z-[90] flex flex-col gap-3 md:bottom-6">
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="group flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#25D366] shadow-[0_4px_14px_rgba(37,211,102,0.45)] transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_20px_rgba(37,211,102,0.55)]"
        >
          {/* Font Awesome Free — WhatsApp brand icon (CC BY 4.0) */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-7 w-7" fill="white">
            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
          </svg>
        </a>
      )}
      {igUrl && (
        <a
          href={igUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Follow on Instagram"
          className="group flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-[0_4px_14px_rgba(225,48,108,0.4)] transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_20px_rgba(225,48,108,0.5)]"
          style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}
        >
          {/* Font Awesome Free — Instagram brand icon (CC BY 4.0) */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-7 w-7" fill="white">
            <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
          </svg>
        </a>
      )}
    </div>
  );
}

export default function StorefrontLayout() {
  // Apply the brand theme (pastel green on cream) to the storefront; restore
  // the default palette when navigating back into the admin panel.
  useEffect(() => {
    let alive = true;
    getPublicSetting('theme').then((t) => {
      if (!alive || !t?.tokens) return;
      applyThemeTokens(t.tokens);
    });
    return () => {
      alive = false;
      clearThemeTokens();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-cream font-body text-ink">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-grow bg-cream">
        <Outlet />
      </main>
      <Footer />
      <FloatingSocials />
      <CartDrawer />
      <Toaster />
    </div>
  );
}
