import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

function loadRecaptchaScript() {
  if (window.grecaptcha) return Promise.resolve(window.grecaptcha);
  const existing = document.querySelector('script[src*="recaptcha/api.js"]');
  if (existing) {
    return new Promise((resolve) => {
      if (window.grecaptcha) resolve(window.grecaptcha);
      else existing.addEventListener('load', () => resolve(window.grecaptcha));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit&hl=de';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.grecaptcha);
    script.onerror = () => reject(new Error('reCAPTCHA konnte nicht geladen werden'));
    document.head.appendChild(script);
  });
}

const RecaptchaWidget = forwardRef(function RecaptchaWidget({ siteKey }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getToken() {
      if (widgetIdRef.current == null || !window.grecaptcha) return '';
      return window.grecaptcha.getResponse(widgetIdRef.current) || '';
    },
    reset() {
      if (widgetIdRef.current != null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined;

    let cancelled = false;

    loadRecaptchaScript()
      .then((grecaptcha) => {
        if (cancelled || !containerRef.current) return;
        if (widgetIdRef.current != null) {
          grecaptcha.reset(widgetIdRef.current);
          return;
        }
        widgetIdRef.current = grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'dark',
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="flex justify-center" />;
});

export default RecaptchaWidget;
