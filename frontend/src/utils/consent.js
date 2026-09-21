const KEY = 'cookieConsent'; // 'accepted' | 'rejected'

export const getConsent = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setConsent = (value) => {
  try {
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new Event('consentchange'));
  } catch {
    // localStorage unavailable (private mode etc.) — analytics just won't load, harmless.
  }
};

export const hasAnalyticsConsent = () => getConsent() === 'accepted';
