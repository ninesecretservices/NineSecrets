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

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout is client-side anyway; ignore network errors.
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, cart: loadJSON('guestCart', { items: [], total: 0 }) });
  },

  // ---- Wishlist (persisted locally) ----
  toggleWishlist: (product) => {
    const { wishlist, toast } = get();
    const exists = wishlist.some((p) => p.id === product.id);
    const next = exists ? wishlist.filter((p) => p.id !== product.id) : [...wishlist, product];
    localStorage.setItem('wishlist', JSON.stringify(next));
    set({ wishlist: next });
    toast(exists ? 'Removed from wishlist' : 'Saved to wishlist ♥');
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
      toast('Added to your bag');
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
    } catch (error) {
      toast(error.response?.data?.message || 'Could not update bag', 'error');
    }
  },
}));

export default useStore;
