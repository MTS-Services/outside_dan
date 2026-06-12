import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCookieConsent,
  setCookieConsent,
  COOKIE_CONSENT_EVENT,
} from '../utils/cookieConsent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => getCookieConsent() === null);

  useEffect(() => {
    const sync = () => setVisible(getCookieConsent() === null);
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (!visible) return null;

  function acceptAll() {
    setCookieConsent('all');
    setVisible(false);
  }

  function acceptEssential() {
    setCookieConsent('essential');
    setVisible(false);
  }

  return (
    <div
      className="fixed left-4 bottom-4 z-[90] max-w-[22rem] sm:max-w-xs pointer-events-none"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-Einstellungen"
    >
      <div className="pointer-events-auto rounded-xl border border-white/10 bg-ink-900/95 backdrop-blur-md shadow-2xl p-4 space-y-3">
        <div>
          <h2 className="font-display text-sm text-white">Cookies & Datenschutz</h2>
          <p className="text-xs text-white/55 mt-1 leading-snug">
            Notwendige Cookies für Warenkorb & Anmeldung. Mit Zustimmung auch Google Maps und PayPal.{' '}
            <Link to="/datenschutz" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
              Mehr
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={acceptAll}
            className="btn-primary text-xs py-2"
          >
            Alle akzeptieren
          </button>
          <button
            type="button"
            onClick={acceptEssential}
            className="btn-ghost text-xs py-2 border border-white/10"
          >
            Nur notwendige
          </button>
        </div>
      </div>
    </div>
  );
}
