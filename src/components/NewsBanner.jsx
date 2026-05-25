import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useSiteSettings } from '../store/siteSettings';

export default function NewsBanner() {
  const loaded = useSiteSettings((s) => s.loaded);
  const enabled = useSiteSettings((s) => s.newsBannerEnabled);
  const text = useSiteSettings((s) => s.newsBannerText);
  const marqueeRef = useRef(null);

  const display = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' — ');

  useEffect(() => {
    const el = marqueeRef.current;
    if (!el || !display) return;

    gsap.set(el, { xPercent: 0 });
    const tween = gsap.to(el, {
      xPercent: -50,
      ease: 'none',
      duration: Math.min(22, Math.max(14, display.length * 0.35)),
      repeat: -1,
    });
    return () => tween.kill();
  }, [display]);

  if (!loaded || !enabled || !display) return null;

  return (
    <div className="news-banner bg-brand-500 text-ink-900 border-b border-brand-600/40 overflow-hidden shrink-0">
      <div className="py-2.5 overflow-hidden">
        <div ref={marqueeRef} className="news-marquee-inner flex w-max will-change-transform">
          {Array.from({ length: 2 }).map((_, k) => (
            <span
              key={k}
              className="inline-flex items-center justify-center min-w-[100vw] px-8 text-sm sm:text-base font-semibold tracking-wide uppercase text-ink-900 shrink-0"
            >
              {display}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
