import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

function loadRecaptchaScript(version, siteKey) {
  const v3Url = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
  const v2Url = 'https://www.google.com/recaptcha/api.js?render=explicit&hl=de';
  const src = version === 'v3' ? v3Url : v2Url;

  if (window.grecaptcha) {
    return new Promise((resolve) => {
      window.grecaptcha.ready(() => resolve(window.grecaptcha));
    });
  }

  const existing = document.querySelector(`script[src="${src}"]`) || document.querySelector('script[src*="recaptcha/api.js"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      const done = () => window.grecaptcha?.ready(() => resolve(window.grecaptcha));
      if (window.grecaptcha) done();
      else {
        existing.addEventListener('load', done);
        existing.addEventListener('error', () => reject(new Error('reCAPTCHA konnte nicht geladen werden')));
      }
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));
    script.onerror = () => reject(new Error('reCAPTCHA konnte nicht geladen werden'));
    document.head.appendChild(script);
  });
}

const RecaptchaWidget = forwardRef(function RecaptchaWidget({ siteKey, version = 'v2' }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  useImperativeHandle(ref, () => ({
    getToken() {
      if (version === 'v3') return '';
      if (widgetIdRef.current == null || !window.grecaptcha) return '';
      return window.grecaptcha.getResponse(widgetIdRef.current) || '';
    },
    async execute() {
      if (!siteKey || !window.grecaptcha) return '';
      if (version === 'v3') {
        return window.grecaptcha.execute(siteKey, { action: 'contact' });
      }
      return this.getToken();
    },
    reset() {
      if (version === 'v3') return;
      if (widgetIdRef.current != null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    if (!siteKey) return undefined;

    let cancelled = false;
    setLoadError('');
    setReady(false);
    widgetIdRef.current = null;

    loadRecaptchaScript(version, siteKey)
      .then((grecaptcha) => {
        if (cancelled) return;

        if (version === 'v3') {
          setReady(true);
          return;
        }

        if (!containerRef.current) return;

        grecaptcha.ready(() => {
          if (cancelled || !containerRef.current) return;
          try {
            containerRef.current.innerHTML = '';
            widgetIdRef.current = grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              theme: 'dark',
            });
            setReady(true);
          } catch (err) {
            setLoadError('reCAPTCHA konnte nicht angezeigt werden. Bitte Seite neu laden.');
            console.error('[recaptcha]', err);
          }
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'reCAPTCHA konnte nicht geladen werden.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [siteKey, version]);

  if (!siteKey) return null;

  if (version === 'v3') {
    return (
      <p className="text-xs text-white/45 text-center">
        {loadError || (ready
          ? 'Diese Seite ist durch reCAPTCHA geschützt.'
          : 'Sicherheitsprüfung wird geladen…')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`min-h-[78px] flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 ${
          loadError ? 'border-red-500/30' : ''
        }`}
      >
        {!ready && !loadError && (
          <span className="text-sm text-white/45">Sicherheitsprüfung wird geladen…</span>
        )}
        {loadError && (
          <span className="text-sm text-red-400 text-center">{loadError}</span>
        )}
        <div ref={containerRef} className={ready ? 'flex justify-center' : 'hidden'} />
      </div>
      <p className="text-xs text-white/40 text-center">
        Bitte das Kontrollkästchen „Ich bin kein Roboter“ anklicken.
      </p>
    </div>
  );
});

export default RecaptchaWidget;
