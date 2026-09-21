import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag, Truck } from 'lucide-react';
import useStore from '../store/useStore';
import { resolveImageUrl } from '../utils/api';
import { inr, FREE_SHIPPING_THRESHOLD } from '../utils/format';
import { getCommerceSettings } from '../utils/settings';

function FreeShippingBar({ subtotal }) {
  const [threshold, setThreshold] = useState(FREE_SHIPPING_THRESHOLD);
  useEffect(() => {
    getCommerceSettings().then((c) => setThreshold(c.freeShippingThreshold));
  }, []);
  const remaining = threshold - subtotal;
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  return (
    <div className="border-b border-beige bg-baby-pink/40 px-6 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs text-ink">
        <Truck size={13} strokeWidth={1.5} />
        {remaining > 0 ? (
          <>Add <b>{inr(remaining)}</b> more for <b>free shipping</b></>
        ) : (
          <b>Yay — your order ships free! 🎉</b>
        )}
      </p>
      <div className="h-1.5 overflow-hidden bg-cream">
        <div className="h-full bg-ink transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const { cart, isCartOpen, toggleCart, updateCartItem } = useStore();
  const items = cart?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30 transition-opacity" onClick={toggleCart} />

      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface font-body shadow-2xl md:w-[420px]">
        <div className="flex items-center justify-between border-b border-beige px-6 py-5">
          <h2 className="font-heading text-xl italic text-ink">
            Your Bag {items.length > 0 && <span className="not-italic text-sm text-mauve">({items.length})</span>}
          </h2>
          <button onClick={toggleCart} className="text-ink transition-opacity hover:opacity-60" aria-label="Close cart">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        {items.length > 0 && <FreeShippingBar subtotal={subtotal} />}

        <div className="flex-grow overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="mt-14 flex flex-col items-center gap-4 text-center">
              <ShoppingBag size={36} strokeWidth={1} className="text-blush" />
              <p className="text-sm text-mauve-dark">Your bag is empty.</p>
              <button
                onClick={toggleCart}
                className="border border-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-all hover:bg-ink hover:text-cream"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item, idx) => (
                <div key={`${item.product?._id || item.product}-${item.variant?.sku || idx}`} className="flex gap-4 border-b border-beige/70 pb-5">
                  <div className="h-24 w-[76px] flex-shrink-0 overflow-hidden bg-blush">
                    {item.product?.thumbnail && (
                      <img src={resolveImageUrl(item.product.thumbnail)} alt={item.product?.name || ''} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-grow flex-col justify-between">
                    <div>
                      <p className="font-heading not-italic text-[15px] leading-tight text-ink">{item.product?.name}</p>
                      <p className="mt-1 text-xs text-mauve">
                        {[item.variant?.colour?.name, item.variant?.size?.name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 border border-beige px-3 py-1">
                        <button onClick={() => updateCartItem(item, item.quantity - 1)} className="flex text-ink" aria-label="Decrease quantity">
                          <Minus size={12} />
                        </button>
                        <span className="min-w-[16px] text-center text-xs font-semibold text-ink">{item.quantity}</span>
                        <button onClick={() => updateCartItem(item, item.quantity + 1)} className="flex text-ink" aria-label="Increase quantity">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-ink">{inr(item.price * item.quantity)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => updateCartItem(item, 0)}
                    className="self-start text-mauve transition-colors hover:text-red-700"
                    aria-label="Remove item"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-beige bg-white px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-mauve-dark">Subtotal</span>
              <span className="text-lg font-bold text-ink">{inr(subtotal)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={toggleCart}
              className="block w-full bg-ink py-3.5 text-center text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
            >
              Checkout
            </Link>
            <Link
              to="/cart"
              onClick={toggleCart}
              className="mt-2.5 block w-full border border-ink py-3 text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-ink transition-all hover:bg-ink hover:text-cream"
            >
              View Full Bag
            </Link>
            <p className="mt-3 text-center text-[11px] text-mauve">Prices include applicable taxes · Easy 7-day exchange</p>
          </div>
        )}
      </div>
    </>
  );
}
