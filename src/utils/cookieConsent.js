const STORAGE_KEY = 'tarantella_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'cookie-consent-changed';

/** @returns {'all' | 'essential' | null} */
export function getCookieConsent() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'all' || value === 'essential' ? value : null;
  } catch {
    return null;
  }
}

/** @param {'all' | 'essential'} value */
export function setCookieConsent(value) {
  localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export function hasExternalConsent() {
  return getCookieConsent() === 'all';
}

export function hasCookieChoice() {
  return getCookieConsent() !== null;
}
