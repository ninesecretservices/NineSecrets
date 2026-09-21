// Whether the storefront should offer online payment at all — mirrors the
// backend's RAZORPAY_KEY_ID (safe to expose; it's the public half of the key
// pair, RAZORPAY_KEY_SECRET never leaves the server).
export const razorpayEnabled = !!import.meta.env.VITE_RAZORPAY_KEY_ID;

let scriptPromise = null;

export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return scriptPromise;
}
