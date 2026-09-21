import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tag, X, MapPin, Pencil } from 'lucide-react';
import useStore from '../store/useStore';
import api, { resolveImageUrl } from '../utils/api';
import { inr, FREE_SHIPPING_THRESHOLD } from '../utils/format';
import { getCommerceSettings } from '../utils/settings';
import useTitle from '../utils/useTitle';
import { razorpayEnabled, loadRazorpayScript } from '../utils/razorpay';

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
  const [step, setStep] = useState('details'); // 'details' | 'review'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(-1); // -1 = new address
  const [saveAddress, setSaveAddress] = useState(true);
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [pincodeLookup, setPincodeLookup] = useState(''); // '' | 'looking' | 'done' | 'failed'
  const [commerce, setCommerce] = useState({
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shippingFee: 50,
    standardShippingDays: '3-5 business days',
    expressShippingEnabled: false,
    expressShippingFee: 150,
    expressShippingDays: '1-2 business days',
    codEnabled: true,
  });

  useEffect(() => {
    getCommerceSettings().then((c) => {
      setCommerce(c);
      if (!c.codEnabled && razorpayEnabled) setPaymentMethod('card');
    });
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

  // India-only PIN-to-city/state autofill via the free, no-auth India Post API.
  // Never overwrites what the shopper already typed — only fills blanks, and
  // a failed/slow lookup never blocks typing or submitting.
  useEffect(() => {
    const pin = form.postalCode.trim();
    if (!/^\d{6}$/.test(pin)) {
      setPincodeLookup('');
      return;
    }
    let cancelled = false;
    setPincodeLookup('looking');
    const t = setTimeout(() => {
      fetch(`https://api.postalpincode.in/pincode/${pin}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          const office = data?.[0]?.PostOffice?.[0];
          if (data?.[0]?.Status === 'Success' && office) {
            setForm((f) => ({
              ...f,
              city: f.city.trim() ? f.city : office.District,
              state: f.state.trim() ? f.state : office.State,
            }));
            setPincodeLookup('done');
          } else {
            setPincodeLookup('failed');
          }
        })
        .catch(() => !cancelled && setPincodeLookup('failed'));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // Only re-run when the PIN itself changes, not on every city/state keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.postalCode]);

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
  const shippingFee = shippingMethod === 'express'
    ? commerce.expressShippingFee
    : (subtotal - discount >= commerce.freeShippingThreshold ? 0 : commerce.shippingFee);
  // Tax is computed authoritatively server-side; totals here are the customer-facing estimate.
  const estimatedTotal = subtotal - discount + shippingFee;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    try {
      const res = await api.post('/coupon/apply', {
        code: couponInput.trim(),
      });
      setCoupon(res.data.data);
    } catch (err) {
      setCoupon(null);
      setCouponError(err.response?.data?.message || 'Invalid coupon');
    }
  };

  const finalizeOrder = async (extraFields) => {
    const res = await api.post('/order/create', {
      shippingAddress: form,
      paymentMethod,
      shippingMethod,
      ...(coupon && { couponCode: coupon.code }),
      ...extraFields,
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
  };

  const payWithRazorpay = async () => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setError('Could not load the payment gateway. Please check your connection and try again.');
      return;
    }
    const { data } = await api.post('/order/razorpay-order', {
      ...(coupon && { couponCode: coupon.code }),
      shippingMethod,
    });
    const { razorpayOrderId, amount, currency, keyId } = data.data;

    const rzp = new window.Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount,
      currency,
      name: 'Nine Secrets',
      prefill: { name: form.fullName, contact: form.phone },
      theme: { color: '#201820' },
      handler: async (response) => {
        try {
          await finalizeOrder({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Payment succeeded but placing the order failed. Please contact support.');
        } finally {
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    });
    rzp.on('payment.failed', () => {
      setError('Payment failed. Please try again.');
      setLoading(false);
    });
    rzp.open();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (step === 'details') {
      setStep('review');
      return;
    }
    placeOrder();
  };

  const placeOrder = async () => {
    setLoading(true);
    setError('');
    try {
      if (paymentMethod === 'card') {
        await payWithRazorpay();
        return; // loading/navigation are handled by Razorpay's callbacks above
      }
      await finalizeOrder();
      setLoading(false);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Checkout failed. Please try again.',
      );
      setLoading(false);
    }
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
        {/* Shipping + payment, or review */}
        <div>
          <div className="mb-8 flex items-center gap-3">
            <h1 className="font-heading text-3xl italic text-ink">
              Checkout
            </h1>
            <span className="text-sm text-mauve">
              Step {step === 'details' ? '1' : '2'} of 2 — {step === 'details' ? 'Details' : 'Review'}
            </span>
          </div>
          {error && (
            <div className="mb-5 bg-blush px-4 py-3 text-sm text-ink">
              {error}
            </div>
          )}

          <form id="checkout-form" onSubmit={handleFormSubmit}>
            {step === 'details' ? (
              <>
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

                <div className="space-y-4">
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
                    {pincodeLookup === 'looking' && (
                      <p className="mt-1 text-[11px] text-mauve">Looking up city/state...</p>
                    )}
                    {pincodeLookup === 'done' && (
                      <p className="mt-1 text-[11px] text-mauve">City/state filled in below — edit if needed.</p>
                    )}
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
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      required
                      pattern="[0-9+ \-]{10,}"
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
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

                  {/* Shipping method */}
                  <div className="pt-4">
                    <label className={labelClass}>Shipping Method</label>
                    <div className="flex flex-col gap-3">
                      <label
                        className={`flex items-center justify-between border bg-white p-4 ${shippingMethod === 'standard' ? 'border-ink' : 'border-beige'}`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipMethod"
                            checked={shippingMethod === 'standard'}
                            onChange={() => setShippingMethod('standard')}
                            className="accent-[#201820]"
                          />
                          <span>
                            <span className="block text-sm font-semibold">Standard</span>
                            <span className="block text-xs text-mauve">{commerce.standardShippingDays}</span>
                          </span>
                        </span>
                        <span className="text-sm font-medium">
                          {subtotal - discount >= commerce.freeShippingThreshold ? 'Free' : inr(commerce.shippingFee)}
                        </span>
                      </label>
                      {commerce.expressShippingEnabled && (
                        <label
                          className={`flex items-center justify-between border bg-white p-4 ${shippingMethod === 'express' ? 'border-ink' : 'border-beige'}`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shipMethod"
                              checked={shippingMethod === 'express'}
                              onChange={() => setShippingMethod('express')}
                              className="accent-[#201820]"
                            />
                            <span>
                              <span className="block text-sm font-semibold">Express</span>
                              <span className="block text-xs text-mauve">{commerce.expressShippingDays}</span>
                            </span>
                          </span>
                          <span className="text-sm font-medium">{inr(commerce.expressShippingFee)}</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Payment method */}
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
                        className={`flex items-center gap-3 border bg-white p-4 ${!commerce.codEnabled ? 'border-beige opacity-50' : paymentMethod === 'cod' ? 'border-ink' : 'border-beige'}`}
                      >
                        <input
                          type="radio"
                          name="pay"
                          checked={paymentMethod === 'cod'}
                          disabled={!commerce.codEnabled}
                          onChange={() => setPaymentMethod('cod')}
                          className="accent-[#201820]"
                        />
                        <div>
                          <p className="text-sm font-semibold">Cash on Delivery</p>
                          <p className="text-xs text-mauve">
                            Pay when your order arrives
                          </p>
                        </div>
                      </label>
                      <label
                        className={`flex items-center gap-3 border bg-white p-4 ${!razorpayEnabled ? 'border-beige opacity-50' : paymentMethod === 'card' ? 'border-ink' : 'border-beige'}`}
                      >
                        <input
                          type="radio"
                          name="pay"
                          checked={paymentMethod === 'card'}
                          disabled={!razorpayEnabled}
                          onChange={() => setPaymentMethod('card')}
                          className="accent-[#201820]"
                        />
                        <div>
                          <p className="text-sm font-semibold">Card / UPI</p>
                          <p className="text-xs text-mauve">
                            {razorpayEnabled ? 'Pay securely online' : 'Online payment — coming soon'}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Review step — everything read-only, with an Edit link back to Details */
              <div className="space-y-5">
                <div className="border border-beige bg-white p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-mauve">Delivery Address</p>
                    <button type="button" onClick={() => setStep('details')} className="flex items-center gap-1 text-xs font-medium text-ink underline underline-offset-4">
                      <Pencil size={11} /> Edit
                    </button>
                  </div>
                  <p className="text-sm text-ink">
                    <b>{form.fullName}</b><br />
                    {form.addressLine1}{form.addressLine2 ? `, ${form.addressLine2}` : ''}<br />
                    {form.city}, {form.state} {form.postalCode}<br />
                    Phone: {form.phone}
                  </p>
                </div>
                <div className="border border-beige bg-white p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-mauve">Shipping</p>
                  <p className="text-sm text-ink">
                    {shippingMethod === 'express' ? 'Express' : 'Standard'} — {shippingMethod === 'express' ? commerce.expressShippingDays : commerce.standardShippingDays}
                  </p>
                </div>
                <div className="border border-beige bg-white p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-mauve">Payment</p>
                  <p className="text-sm text-ink">{paymentMethod === 'card' ? 'Card / UPI' : 'Cash on Delivery'}</p>
                </div>
              </div>
            )}
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
          {step === 'details' && (
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
          )}
          {step === 'review' && coupon && (
            <div className="mb-5 flex items-center gap-2 border-b border-beige pb-5 text-sm text-ink">
              <Tag size={14} /> {coupon.code} applied (−₹{coupon.discount})
            </div>
          )}

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
              <span>Shipping ({shippingMethod === 'express' ? 'Express' : 'Standard'})</span>
              <span>{shippingFee === 0 ? 'Free' : inr(shippingFee)}</span>
            </div>
            <div className="flex justify-between border-t border-beige pt-3 text-base font-bold text-ink">
              <span>Total</span>
              <span>{inr(estimatedTotal)}</span>
            </div>
            <p className="text-[11px] text-mauve">
              Prices are inclusive of applicable taxes.
            </p>
          </div>

          <button
            type="submit"
            form="checkout-form"
            disabled={loading || (paymentMethod === 'cod' ? !commerce.codEnabled : !razorpayEnabled)}
            className="mt-5 h-[52px] w-full bg-ink text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {step === 'details'
              ? 'Review Order'
              : loading
                ? paymentMethod === 'card' ? 'Waiting for payment...' : 'Placing Order...'
                : paymentMethod === 'card' ? `Pay ${inr(estimatedTotal)}` : `Place Order · ${inr(estimatedTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
