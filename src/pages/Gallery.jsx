import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import api from '../api/client';
import Icon from '../components/Icon';

gsap.registerPlugin(ScrollTrigger, useGSAP);

function imgSrc(p) {
  return p.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${p.url}` : p.url;
}

export default function Gallery() {
  const main = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [lightbox, setLightbox] = useState(null); // null | index number

  useEffect(() => {
    api.get('/gallery').then((r) => setPhotos(r.data)).catch(() => {});
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e) {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === 'ArrowLeft') setLightbox((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, photos.length]);

  // Lock body scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = lightbox !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  useGSAP(
    () => {
      gsap.to('.gal-hero-bg', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: { trigger: '.gal-hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.from('.gal-hero-anim', { y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out' });

      // Cards stagger in on scroll
      gsap.utils.toArray('.gal-card').forEach((card, i) => {
        gsap.from(card, {
          y: 50,
          opacity: 0,
          scale: 0.93,
          duration: 0.75,
          ease: 'power3.out',
          delay: (i % 5) * 0.07,
          scrollTrigger: {
            trigger: card,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      });

      gsap.from('.gal-story', {
        y: 50, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '.gal-story', start: 'top 85%' },
      });

      gsap.from('.gal-cta', {
        y: 60, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '.gal-cta', start: 'top 85%' },
      });
    },
    { scope: main }
  );

  const current = lightbox !== null ? photos[lightbox] : null;

  return (
    <div ref={main}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="gal-hero relative h-[65vh] flex items-center justify-center overflow-hidden">
        {photos.length > 0 ? (
          <img
            src={imgSrc(photos[0])}
            alt="Gallery hero"
            className="gal-hero-bg absolute inset-0 w-full h-full object-cover object-center will-change-transform"
          />
        ) : (
          <div className="gal-hero-bg absolute inset-0 bg-ink-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/50 via-ink-900/30 to-ink-900/85" />
        <div className="relative z-10 text-center px-4">
          <span className="gal-hero-anim inline-block bg-brand-500/20 text-brand-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border border-brand-500/30 mb-6">
            Einblick in unsere Welt
          </span>
          <h1 className="gal-hero-anim font-display text-6xl md:text-8xl tracking-wider text-white drop-shadow-2xl">
            UNSERE GALERIE
          </h1>
          <p className="gal-hero-anim text-white/60 mt-5 text-lg max-w-2xl mx-auto leading-relaxed">
            Original Pizza Napoletana, italienische Küche und Eindrücke aus unserem Restaurant in Trofaiach.
          </p>
          <div className="gal-hero-anim mt-8 flex items-center justify-center gap-3 text-white/40 text-sm">
            <span className="w-10 h-px bg-white/20" />
            {photos.length} Fotos
            <span className="w-10 h-px bg-white/20" />
          </div>
        </div>
        {/* bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-ink-900 to-transparent" />
      </section>

      {/* ── PINTEREST MASONRY GRID ───────────────────────── */}
      <section className="py-10 px-4 sm:px-8 lg:px-14">
        {photos.length === 0 ? (
          <p className="text-center text-white/30 py-24">Noch keine Bilder vorhanden.</p>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className="gal-card group relative overflow-hidden rounded-2xl cursor-pointer bg-white/5 break-inside-avoid mb-3"
                onClick={() => setLightbox(i)}
              >
                <img
                  src={imgSrc(p)}
                  alt={p.alt || ''}
                  loading="lazy"
                  className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 inset-x-0 p-4 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-between gap-2">
                  {p.alt && <span className="text-white text-sm font-semibold drop-shadow-lg line-clamp-2 flex-1">{p.alt}</span>}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3.5 h-3.5">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── STORY ────────────────────────────────────────── */}
      <section className="gal-story max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="section-title">Die Geschichte hinter Tarantella</h2>
        <div className="divider-brand" />
        <p className="text-white/65 mt-6 text-sm sm:text-base leading-relaxed">
          Was als Traum begann, authentische neapolitanische Pizza nach Trofaiach zu bringen, ist heute
          ein Ort voller italienischer Lebensfreude. Im IZZO FORNI Ofen, mit handwerklichem Können und
          echter Gastfreundschaft – und 2025 von Falstaff zur beliebtesten Pizzeria der Steiermark gewählt.
        </p>
        <Link to="/about#founder-story" className="btn-outline mt-8 inline-flex items-center gap-2">
          Die Geschichte lesen <Icon name="arrowRight" className="w-4 h-4" />
        </Link>
      </section>

      {/* ── ORDER CTA ────────────────────────────────────── */}
      <div className="gal-cta py-16 flex justify-center">
        <Link
          to="/menu"
          className="btn-primary text-lg px-12 py-4 inline-flex items-center gap-3"
        >
          Jetzt bestellen
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* ── LIGHTBOX ─────────────────────────────────────── */}
      {lightbox !== null && current && (
        <div
          className="fixed inset-0 z-[200] bg-ink-900/97 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/45 text-sm tracking-widest">
            {lightbox + 1} / {photos.length}
          </div>

          {/* Close */}
          <button
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition border border-white/10"
            onClick={() => setLightbox(null)}
            aria-label="Schließen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          {lightbox > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition border border-white/10"
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => i - 1); }}
              aria-label="Vorheriges Bild"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* Next */}
          {lightbox < photos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition border border-white/10"
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => i + 1); }}
              aria-label="Nächstes Bild"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}

          {/* Image */}
          <img
            src={imgSrc(current)}
            alt={current.alt || ''}
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          {current.alt && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-ink-900/70 backdrop-blur-sm px-5 py-2 rounded-full border border-white/10 whitespace-nowrap">
              {current.alt}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
