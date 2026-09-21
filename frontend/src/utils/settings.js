import api from './api';

// Storefront content & config (admin-managed). Fetched once per key per page
// load. Append ?preview=1 to any storefront URL while logged in as admin to
// see DRAFT content instead of the published site.
const cache = {};

const isPreview = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('preview') &&
  !!localStorage.getItem('accessToken');

export const getPublicSetting = (key) => {
  if (!cache[key]) {
    const endpoint = isPreview() ? '/setting/preview-detail' : '/setting/public-detail';
    cache[key] = api
      .post(endpoint, { key })
      .then((res) => res.data.data || {})
      .catch(() => ({}));
  }
  return cache[key];
};

export const getHomepageSettings = () => getPublicSetting('homepage');
export const getCommerceSettings = () =>
  getPublicSetting('commerce').then((c) => ({
    freeShippingThreshold: 599,
    shippingFee: 50,
    standardShippingDays: '3-5 business days',
    expressShippingEnabled: false,
    expressShippingFee: 150,
    expressShippingDays: '1-2 business days',
    codEnabled: true,
    whatsappNumber: '',
    instagramUrl: '',
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    legalName: '',
    gstin: '',
    jurisdictionCity: '',
    grievanceName: '',
    grievanceEmail: '',
    facebookUrl: '',
    ...c,
  }));
