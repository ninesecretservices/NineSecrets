import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import useStore from '../store/useStore';
import { resolveImageUrl } from '../utils/api';
import { inr, FREE_SHIPPING_THRESHOLD } from '../utils/format';
import { getCommerceSettings } from '../utils/settings';
import useTitle from '../utils/useTitle';

export default function Cart() {
  useTitle('Your Bag');
  const { user, cart, fetchCart, updateCartItem } = useStore();
  const navigate = useNavigate();
  const [commerce, setCommerce] = useState({ freeShippingThreshold: FREE_SHIPPING_THRESHOLD, shippingFee: 50 });

  useEffect(() => {
    fetchCart();
    getCommerceSettings().then(setCommerce);
  }, [fetchCart]);

  const items = cart?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= commerce.freeShippingThreshold ? 0 : commerce.shippingFee;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 bg-cream px-6 text-center font-body">
        <ShoppingBag size={40} strokeWidth={1} className="text-blush" />
        <h1 className="font-heading text-2xl italic text-ink">Your bag is empty</h1>
        <p className="text-sm text-mauve-dark">Everything soft is one click away.</p>
        <Link to="/collection" className="bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream">
          Shop the Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-cream font-body text-ink">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <h1 className="mb-8 font-heading text-3xl italic text-ink">Your Bag ({items.length})</h1>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          {/* Items */}
          <div className="space-y-5">
            {items.map((item, idx) => (
              <div key={`${item.product?._id || item.product}-${item.variant?.sku || idx}`} className="flex gap-5 border border-beige bg-surface p-4">
                <div
                  className="h-32 w-[104px] flex-shrink-0 cursor-pointer overflow-hidden bg-blush"
                  onClick={() => item.product?.slug && navigate(`/product/${item.product.slug}`)}
                >
                  {item.product?.thumbnail && (
                    <img src={resolveImageUrl(item.product.thumbnail)} alt={item.product?.name || ''} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex flex-grow flex-col justify-between py-1">
                  <div>
                    <p className="font-heading not-italic text-base text-ink">{item.product?.name}</p>
                    <p className="mt-1 text-xs text-mauve">
                      {[item.variant?.colour?.name, item.variant?.size?.name, item.variant?.sku].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 border border-beige px-4 py-1.5">
                      <button onClick={() => updateCartItem(item, item.quantity - 1)} className="flex text-ink" aria-label="Decrease quantity">
                        <Minus size={13} />
                      </button>
                      <span className="min-w-[18px] text-center text-sm font-semibold text-ink">{item.quantity}</span>
                      <button onClick={() => updateCartItem(item, item.quantity + 1)} className="flex text-ink" aria-label="Increase quantity">
                        <Plus size={13} />
                      </button>
                    </div>
                    <p className="text-base font-bold text-ink">{inr(item.price * item.quantity)}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateCartItem(item, 0)}
                  className="self-start p-1 text-mauve transition-colors hover:text-red-700"
                  aria-label="Remove item"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="h-fit border border-beige bg-surface p-6">
            <h2 className="mb-5 font-heading text-xl italic text-ink">Summary</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-mauve-dark"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between text-mauve-dark">
                <span>Shipping</span><span>{shipping === 0 ? 'Free' : inr(shipping)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-[11px] text-mauve">Add {inr(commerce.freeShippingThreshold - subtotal)} more for free shipping.</p>
              )}
              <div className="flex justify-between border-t border-beige pt-3 text-base font-bold text-ink">
                <span>Estimated Total</span><span>{inr(subtotal + shipping)}</span>
              </div>
              <p className="text-[11px] text-mauve">Prices include applicable taxes. Coupons applied at checkout.</p>
            </div>
            <button
              onClick={() => navigate(user ? '/checkout' : '/login')}
              className="mt-5 h-[52px] w-full bg-ink text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85"
            >
              {user ? 'Proceed to Checkout' : 'Sign in to Checkout'}
            </button>
            <Link to="/collection" className="mt-4 block text-center text-[13px] font-medium text-ink underline underline-offset-4">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
