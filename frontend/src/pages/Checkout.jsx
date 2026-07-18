import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tag, X, MapPin } from 'lucide-react';
import useStore from '../store/useStore';
import api, { resolveImageUrl } from '../utils/api';
import { inr, FREE_SHIPPING_THRESHOLD } from '../utils/format';
import { getCommerceSettings } from '../utils/settings';
import useTitle from '../utils/useTitle';

const inputClass =
  'w-full border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink';
const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink';

const EMPTY_ADDRESS = {
  fullName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  phone: '',
};

export default function Checkout() {
  useTitle('Checkout');
  const { user, cart, fetchCart } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod] = useState('cod'); // Online payment enabled once a gateway is integrated.
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(-1); // -1 = new address
  const [saveAddress, setSaveAddress] = useState(true);
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [commerce, setCommerce] = useState({
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shippingFee: 50,
    codEnabled: true,
  });

  useEffect(() => {
    getCommerceSettings().then(setCommerce);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCart();
    (async () => {
      try {
        const res = await api.post('/auth/profile');
        const addrs = res.data.data?.addresses || [];
        setSavedAddresses(addrs);
        if (addrs.length > 0) {
          setSelectedAddress(0);
          setForm({ ...EMPTY_ADDRESS, ...addrs[0] });
        }
      } catch {
        // profile fetch is best-effort
      }
    })();
  }, [user, fetchCart]);

  const pickAddress = (idx) => {
    setSelectedAddress(idx);
    setForm(
      idx >= 0 ? { ...EMPTY_ADDRESS, ...savedAddresses[idx] } : EMPTY_ADDRESS,
    );
  };

  const subtotal = useMemo(
    () => (cart?.items || []).reduce((s, i) => s + i.price * i.quantity, 0),
    [cart],
  );
  const discount = coupon?.discount || 0;
  const shippingFee =
    subtotal - discount >= commerce.freeShippingThreshold
      ? 0
      : commerce.shippingFee;
  // Tax is computed authoritatively server-side; totals here are the customer-facing estimate.
  const estimatedTotal = subtotal - discount + shippingFee;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    try {
      const res = await api.post('/coupon/apply', {
        code: couponInput.trim(),
        subtotal,
      });
      setCoupon(res.data.data);
    } catch (err) {
      setCoupon(null);
      setCouponError(err.response?.data?.message || 'Invalid coupon');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/order/create', {
        shippingAddress: form,
        paymentMethod,
        ...(coupon && { couponCode: coupon.code }),
      });
      // Save a newly typed address to the address book (best-effort).
      if (selectedAddress === -1 && saveAddress) {
        api
          .post('/auth/profile-update', {
            addresses: [...savedAddresses, form],
          })
          .catch(() => {});
      }
      await fetchCart();
      navigate(`/order-success/${res.data.data.orderNumber}`, {
        state: { order: res.data.data },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || 'Checkout failed. Please try again.',
      );
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 font-body">
        <p className="text-mauve-dark">Please sign in to check out.</p>
        <Link
          to="/login"
          className="bg-ink px-8 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 font-body">
        <p className="text-mauve-dark">Your cart is empty.</p>
        <Link
          to="/collection"
          className="bg-ink px-8 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream"
        >
          Explore the Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-cream font-body text-ink">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-12 md:grid-cols-[1fr_400px] md:px-10">
        {/* Shipping + payment */}
        <div>
          <h1 className="mb-8 font-heading text-3xl italic text-ink">
            Checkout
          </h1>
          {error && (
            <div className="mb-5 bg-blush px-4 py-3 text-sm text-ink">
              {error}
            </div>
          )}

          {/* Saved addresses */}
          {savedAddresses.length > 0 && (
            <div className="mb-6">
              <label className={labelClass}>Deliver To</label>
              <div className="flex flex-col gap-2.5">
                {savedAddresses.map((a, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => pickAddress(i)}
                    className={`flex items-start gap-3 border p-4 text-left ${selectedAddress === i ? 'border-ink bg-white' : 'border-beige'}`}
                  >
                    <MapPin
                      size={15}
                      strokeWidth={1.5}
                      className="mt-0.5 flex-shrink-0 text-mauve"
                    />
                    <span className="text-sm text-ink">
                      <b>{a.fullName}</b> · {a.addressLine1}, {a.city}{' '}
                      {a.postalCode} · {a.phone}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => pickAddress(-1)}
                  className={`border p-4 text-left text-sm font-medium ${selectedAddress === -1 ? 'border-ink bg-white text-ink' : 'border-dashed border-beige text-mauve-dark'}`}
                >
                  + Use a new address
                </button>
              </div>
            </div>
          )}

          <form
            id="checkout-form"
            onSubmit={handleCheckout}
            className="space-y-4"
          >
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                required
                className={inputClass}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Address Line 1</label>
              <input
                required
                className={inputClass}
                value={form.addressLine1}
                onChange={(e) =>
                  setForm({ ...form, addressLine1: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Address Line 2 (optional)</label>
              <input
                className={inputClass}
                value={form.addressLine2}
                onChange={(e) =>
                  setForm({ ...form, addressLine2: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>City</label>
                <input
                  required
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  required
                  className={inputClass}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Postal Code</label>
                <input
                  required
                  pattern="[0-9]{6}"
                  title="6-digit PIN code"
                  className={inputClass}
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm({ ...form, postalCode: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  required
                  pattern="[0-9+ -]{10,}"
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            {selectedAddress === -1 && (
              <label className="flex items-center gap-2 text-sm text-mauve-dark">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="h-4 w-4 accent-[#201820]"
                />
                Save this address for next time
              </label>
            )}

            {/* Payment method — COD only until an online gateway is connected */}
            <div className="pt-4">
              <label className={labelClass}>Payment Method</label>
              {!commerce.codEnabled && (
                <div className="mb-3 bg-blush px-4 py-3 text-sm text-ink">
                  Cash on Delivery is temporarily unavailable. Please check back
                  soon.
                </div>
              )}
              <div className="flex flex-col gap-3">
                <label
                  className={`flex items-center gap-3 border bg-white p-4 ${commerce.codEnabled ? 'border-ink' : 'border-beige opacity-50'}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={commerce.codEnabled}
                    disabled={!commerce.codEnabled}
                    readOnly
                    className="accent-[#201820]"
                  />
                  <div>
                    <p className="text-sm font-semibold">Cash on Delivery</p>
                    <p className="text-xs text-mauve">
                      Pay when your order arrives
                    </p>
                  </div>
                </label>
                <div className="flex items-center gap-3 border border-beige p-4 opacity-50">
                  <input
                    type="radio"
                    name="pay"
                    disabled
                    className="accent-[#201820]"
                  />
                  <div>
                    <p className="text-sm font-semibold">Card / UPI</p>
                    <p className="text-xs text-mauve">
                      Online payment — coming soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Summary */}
        <div className="h-fit border border-beige bg-white p-6">
          <h2 className="mb-5 font-heading text-xl italic text-ink">
            Order Summary
          </h2>
          <div className="mb-5 space-y-4 border-b border-beige pb-5">
            {cart.items.map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="h-16 w-[52px] flex-shrink-0 overflow-hidden bg-blush">
                  {item.product?.thumbnail && (
                    <img
                      src={resolveImageUrl(item.product.thumbnail)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-ink">
                    {item.product?.name}
                  </p>
                  <p className="text-xs text-mauve">
                    {item.variant?.colour?.name} · {item.variant?.size?.name} ·
                    Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {inr(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="mb-5 border-b border-beige pb-5">
            {coupon ? (
              <div className="flex items-center justify-between bg-pastel-green px-4 py-2.5 text-sm text-ink">
                <span className="flex items-center gap-2">
                  <Tag size={14} /> {coupon.code} applied (−₹{coupon.discount})
                </span>
                <button
                  onClick={() => {
                    setCoupon(null);
                    setCouponInput('');
                  }}
                  aria-label="Remove coupon"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
                    placeholder="Coupon code"
                    className="flex-grow border border-beige px-4 py-2 text-sm uppercase text-ink outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="border border-ink px-4 py-2 text-xs font-semibold uppercase text-ink hover:bg-ink hover:text-cream"
                  >
                    Apply
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 text-xs text-red-700">{couponError}</p>
                )}
              </>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-mauve-dark">
              <span>Subtotal</span>
              <span>{inr(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-mauve-dark">
                <span>Discount</span>
                <span>−{inr(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-mauve-dark">
              <span>Shipping</span>
              <span>{shippingFee === 0 ? 'Free' : inr(shippingFee)}</span>
            </div>
            <div className="flex justify-between border-t border-beige pt-3 text-base font-bold text-ink">
              <span>Total</span>
              <span>{inr(estimatedTotal)}</span>
            </div>
            <p className="text-[11px] text-mauve">
              Taxes (if applicable) are calculated at order confirmation.
            </p>
          </div>

          <button
            type="submit"
            form="checkout-form"
            disabled={loading || !commerce.codEnabled}
            className="mt-5 h-[52px] w-full bg-ink text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {loading
              ? 'Placing Order...'
              : `Place Order · ${inr(estimatedTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
