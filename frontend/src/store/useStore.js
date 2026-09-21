import { create } from 'zustand';
import api from '../utils/api';

const loadJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const saveGuestCart = (cart) => localStorage.setItem('guestCart', JSON.stringify(cart));

const cartTotal = (items) => items.reduce((s, i) => s + i.price * i.quantity, 0);

let toastId = 0;

const useStore = create((set, get) => ({
  user: loadJSON('user', null),
  // Guests get a local cart; it merges into the server cart at login.
  cart: loadJSON('user', null) ? null : loadJSON('guestCart', { items: [], total: 0 }),
  isCartOpen: false,
  wishlist: loadJSON('wishlist', []),
  toasts: [],

  // ---- Toasts ----
  toast: (message, type = 'success') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },

  // ---- Auth ----
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    set({ user });
  },

  // Push any guest-cart items into the server cart right after login.
  syncGuestCartToServer: async () => {
    const guest = loadJSON('guestCart', { items: [] });
    try {
      const res = await api.post('/cart/detail');
      let items = res.data.data?.items || [];
      if (guest.items.length > 0) {
        const merged = [...items];
        for (const gi of guest.items) {
          const idx = merged.findIndex((i) => i.variant?.sku === gi.variant?.sku);
          if (idx > -1) merged[idx].quantity += gi.quantity;
          else merged.push({ product: gi.product?._id || gi.product, variant: gi.variant, quantity: gi.quantity, price: gi.price });
        }
        const upd = await api.post('/cart/update', { items: merged });
        items = upd.data.data?.items || merged;
        localStorage.removeItem('guestCart');
        set({ cart: upd.data.data });
        return;
      }
      set({ cart: res.data.data });
    } catch (e) {
      console.error('Cart sync failed', e);
    }
  },

  // Converts a raw Product doc (from the server) into the lightweight
  // display shape the wishlist UI already uses everywhere (see PDP's
  // toggleWishlist call for the canonical shape).
  productToWishlistCard: (p) => ({
    id: p._id,
    slug: p.slug,
    name: p.name,
    tag: p.isFeatured ? 'BEST SELLER' : 'NEW IN',
    price: p.sellingPrice ?? p.variants?.[0]?.sellingPrice ?? p.mrp,
    mrp: p.mrp ?? p.variants?.[0]?.mrp,
    img: p.thumbnail,
  }),

  // Loads the logged-in user's wishlist from the server. Guests keep using
  // the localStorage copy already in state.
  fetchWishlist: async () => {
    const { user, productToWishlistCard } = get();
    if (!user) return;
    try {
      const res = await api.post('/wishlist/list');
      set({ wishlist: (res.data.data || []).map(productToWishlistCard) });
    } catch (e) {
      console.error('Failed to fetch wishlist', e);
    }
  },

  // Push any guest-wishlist items into the server wishlist right after login.
  syncGuestWishlistToServer: async () => {
    const guest = loadJSON('wishlist', []);
    try {
      if (guest.length > 0) {
        await api.post('/wishlist/merge', { productIds: guest.map((p) => p.id) });
        localStorage.removeItem('wishlist'); // now server-authoritative for this session
      }
      await get().fetchWishlist();
    } catch (e) {
      console.error('Wishlist sync failed', e);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout is client-side anyway; ignore network errors.
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({
      user: null,
      cart: loadJSON('guestCart', { items: [], total: 0 }),
      wishlist: loadJSON('wishlist', []),
    });
  },

  // ---- Wishlist ----
  // Guests: localStorage only. Logged in: persisted server-side (User.wishlist)
  // so it survives across devices — syncGuestWishlistToServer merges any local
  // guest picks in right after login (see Login.jsx).
  toggleWishlist: async (product) => {
    const { user, wishlist, toast } = get();
    const exists = wishlist.some((p) => p.id === product.id);
    const next = exists ? wishlist.filter((p) => p.id !== product.id) : [...wishlist, product];

    if (!user) {
      localStorage.setItem('wishlist', JSON.stringify(next));
      set({ wishlist: next });
      toast(exists ? 'Removed from wishlist' : 'Saved to wishlist ♥');
      return;
    }

    set({ wishlist: next }); // optimistic
    toast(exists ? 'Removed from wishlist' : 'Saved to wishlist ♥');
    try {
      await api.post('/wishlist/toggle', { productId: product.id });
    } catch (e) {
      set({ wishlist }); // roll back on failure
      toast('Could not update wishlist', 'error');
    }
  },
  isWishlisted: (id) => get().wishlist.some((p) => p.id === id),

  // ---- Cart ----
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

  fetchCart: async () => {
    const { user } = get();
    if (!user) {
      set({ cart: loadJSON('guestCart', { items: [], total: 0 }) });
      return;
    }
    try {
      const res = await api.post('/cart/detail');
      set({ cart: res.data.data });
    } catch (error) {
      console.error('Failed to fetch cart', error);
    }
  },

  // product: full product doc; variant: populated variant (colour/size/fit objects)
  addToCart: async (product, variant, quantity, price) => {
    const { user, cart, toast } = get();

    if (!user) {
      // Guest cart: keep a display-ready snapshot locally.
      const items = cart?.items ? [...cart.items] : [];
      const idx = items.findIndex((i) => i.variant?.sku === variant.sku);
      if (idx > -1) {
        items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
      } else {
        items.push({
          product: { _id: product._id, name: product.name, slug: product.slug, thumbnail: product.thumbnail },
          variant,
          quantity,
          price,
        });
      }
      const next = { items, total: cartTotal(items) };
      saveGuestCart(next);
      set({ cart: next, isCartOpen: true });
      toast('Added to your bag');
      return;
    }

    try {
      const currentItems = cart?.items ? [...cart.items] : [];
      const existingIdx = currentItems.findIndex((item) => item.variant.sku === variant.sku);
      if (existingIdx > -1) {
        currentItems[existingIdx].quantity += quantity;
      } else {
        currentItems.push({ product: product._id, variant, quantity, price });
      }
      const res = await api.post('/cart/update', { items: currentItems });
      set({ cart: res.data.data, isCartOpen: true });
      // cartUpdate re-validates stock/price server-side and reports back
      // (via `message`) if it had to drop or reduce a line — surface that
      // instead of a generic success toast so the shopper knows why.
      toast(res.data.message === 'Cart updated successfully' ? 'Added to your bag' : res.data.message, res.data.message === 'Cart updated successfully' ? 'success' : 'error');
    } catch (error) {
      console.error('Failed to update cart', error);
      toast(error.response?.data?.message || 'Could not add to bag', 'error');
    }
  },

  // qty <= 0 removes the line.
  updateCartItem: async (sku, qty) => {
    const { user, cart, toast } = get();
    const items = (cart?.items || [])
      .map((i) => (i.variant?.sku === sku ? { ...i, quantity: qty } : i))
      .filter((i) => i.quantity > 0);

    if (!user) {
      const next = { items, total: cartTotal(items) };
      saveGuestCart(next);
      set({ cart: next });
      return;
    }
    try {
      const res = await api.post('/cart/update', { items });
      set({ cart: res.data.data });
      if (res.data.message !== 'Cart updated successfully') {
        toast(res.data.message, 'error');
      }
    } catch (error) {
      toast(error.response?.data?.message || 'Could not update bag', 'error');
    }
  },
}));

export default useStore;
