import { hasAnalyticsConsent } from './consent';

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

let loaded = false;

function loadGoogleAnalytics() {
  if (!GA_ID || document.getElementById('ga-script')) return;
  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

function loadMetaPixel() {
  if (!PIXEL_ID || window.fbq) return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
}

// Loads Google Analytics / Meta Pixel only if (a) the site owner has actually
// configured VITE_GA_MEASUREMENT_ID / VITE_META_PIXEL_ID, and (b) the shopper
// has accepted the cookie-consent banner. Call once at app start, and again
// whenever consent changes (the banner dispatches 'consentchange').
export function initAnalyticsIfConsented() {
  if (loaded || !hasAnalyticsConsent()) return;
  loadGoogleAnalytics();
  loadMetaPixel();
  loaded = true;
}

export function trackPageView(path) {
  if (!hasAnalyticsConsent()) return;
  if (window.gtag && GA_ID) window.gtag('config', GA_ID, { page_path: path });
  if (window.fbq) window.fbq('track', 'PageView');
}
