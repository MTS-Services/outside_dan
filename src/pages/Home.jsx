import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import FoodSlider from '../components/FoodSlider';
import Icon from '../components/Icon';
import api from '../api/client';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1800&q=85',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1800&q=85',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1800&q=85',
];

const REVIEWS = [
  { name: 'Maria S.', text: 'Unglaubliche Burger — saftig, knusprig und in 30 Minuten heiß geliefert. Rockin Rumble ist unser Freitagabend-Klassiker!', stars: 5 },
  { name: 'Thomas K.', text: 'Der Pizzateig ist perfekt, leicht knusprig und super geschmackvoll. Online-Bestellung kinderleicht. Ich bestelle wieder.', stars: 5 },
  { name: 'Anna M.', text: 'Bestes Liefer-Erlebnis in Wien. Die App hat unsere Bestellung in Echtzeit verfolgt — alles kam genau wie versprochen.', stars: 5 },
];

export default function Home() {
  const main = useRef(null);
  const [homeCategories, setHomeCategories] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [homeHero, setHomeHero] = useState(null);
  const [aboutStory, setAboutStory] = useState(null);

  useEffect(() => {
    api.get('/menu/home-categories').then((r) => setHomeCategories(r.data)).catch(() => {});
    api.get('/gallery?home=true').then((r) => setGalleryImages(r.data)).catch(() => {});
    
    // Load home hero
    api.get('/site-images/home_hero').then((r) => {
      if (r.data?.url) setHomeHero(r.data.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${r.data.url}` : r.data.url);
    }).catch(() => {});

    // Load about story image shared with About page
    api.get('/site-images/about_story').then((r) => {
      if (r.data?.url) setAboutStory(r.data.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${r.data.url}` : r.data.url);
    }).catch(() => {});
  }, []);

  useGSAP(
    () => {
      // ── HERO: parallax bg + staggered intro ─────────────
      gsap.to('.hero-bg', {
        yPercent: 25,
        scale: 1.15,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      gsap.from('.hero-anim', {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.12,
        delay: 0.1,
      });

      // ── BEAST headline letters ─────────────────────────
      const split = gsap.utils.toArray('.beast-letter');
      if (split.length) {
        gsap.from(split, {
          y: 120,
          opacity: 0,
          rotateX: -90,
          stagger: 0.05,
          duration: 1.1,
          ease: 'back.out(1.4)',
          delay: 0.3,
        });
      }

      // ── Generic scroll reveal ──────────────────────────
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.from(el, {
          y: 80,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // ── Category cards stagger ─────────────────────────
      gsap.from('.cat-card', {
        y: 100,
        opacity: 0,
        scale: 0.9,
        stagger: 0.15,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.cat-grid',
          start: 'top 80%',
        },
      });

      // ── Feature cards ──────────────────────────────────
      gsap.from('.feature-card', {
        y: 60,
        opacity: 0,
        stagger: 0.18,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.feature-grid', start: 'top 80%' },
      });

      // ── About image parallax ───────────────────────────
      gsap.to('.about-img', {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: '.about-section',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      // ── Gallery items pop in ───────────────────────────
      gsap.from('.gallery-item', {
        scale: 0.88,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.gallery-grid', start: 'top 80%' },
      });

      // ── Gallery featured parallax ────────────────────────
      gsap.to('.gallery-featured img', {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: {
          trigger: '.gallery-grid',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      // ── CTA banner zoom-in ─────────────────────────────
      gsap.to('.cta-bg', {
        scale: 1.2,
        ease: 'none',
        scrollTrigger: {
          trigger: '.cta-section',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    },
    { scope: main }
  );

  return (
    <div ref={main}>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section id="home" className="hero-section relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background image */}
        {homeHero && (
          <img
            src={homeHero}
            alt="Hero food"
            className="hero-bg absolute inset-0 w-full h-full object-cover will-change-transform"
          />
        )}
        <div className="hero-img-overlay absolute inset-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
          <div className="max-w-2xl">
            <span className="hero-anim chip bg-brand-500/30 text-brand-200 mb-6 text-sm tracking-widest uppercase inline-flex items-center gap-2">
              <Icon name="star" className="w-3.5 h-3.5" /> Jetzt Lieferung in ganz Wien
            </span>
            <h1 className="hero-anim font-display text-6xl md:text-8xl leading-[0.9] tracking-wide mt-4">
              <span className="inline-block overflow-hidden">
                {'BEAST'.split('').map((c, i) => (
                  <span key={i} className="beast-letter inline-block">{c}</span>
                ))}
              </span>{' '}
              <span className="inline-block overflow-hidden">
                {'MODE'.split('').map((c, i) => (
                  <span key={i} className="beast-letter inline-block">{c}</span>
                ))}
              </span>
              <br />
              <span className="text-brand-400">SCHNELLE LIEFERUNG.</span>
            </h1>
            <p className="hero-anim mt-6 text-lg md:text-xl text-white/75 leading-relaxed">
              Handgemachte Burger, holzofen­gebackene Pizza & eiskalte Getränke —
              direkt aus unserer Küche an deine Tür in unter 45 Minuten.
            </p>
            <div className="hero-anim mt-9 flex flex-wrap gap-4">
              <Link to="/menu" className="btn-primary px-8 py-3.5 text-lg">
                Jetzt bestellen <Icon name="arrowRight" className="w-5 h-5" />
              </Link>
              <Link to="/menu" className="btn-outline px-8 py-3.5 text-lg">
                Speisekarte ansehen
              </Link>
            </div>
            <div className="hero-anim mt-12 flex flex-wrap gap-10">
              <Stat n="20K+" l="Zufriedene Kunden" />
              <Stat n="4,9" l="Durchschnittsbewertung" icon="star" />
              <Stat n="35 Min" l="Ø Lieferzeit" />
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scrollen</span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none"><rect x="6.5" y="1" width="3" height="7" rx="1.5" fill="currentColor"/><path d="M1 12l7 9 7-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </section>

      {/* ── CATEGORY CARDS ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center reveal">
          <h2 className="section-title">LUST AUF WAS?</h2>
          <div className="divider-brand" />
        </div>
        <div className="cat-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-2">
          {homeCategories.map((c) => (
            <Link key={c.id} to={`/menu?category=${c.slug}`} className="cat-card overflow-hidden rounded-2xl group relative aspect-[3/4]">
              <img
                src={c.homeImageUrl || c.imageUrl || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700'}
                alt={c.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="font-display text-3xl tracking-wider">{c.name}</div>
                <div className="flex items-center gap-2 text-brand-400 text-sm font-semibold mt-1 group-hover:gap-3 transition-all">
                  Jetzt bestellen <Icon name="arrowRight" className="w-4 h-4" />
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                <span className="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">Ansehen</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── GSAP HORIZONTAL FOOD SLIDER ──────────────────── */}
      <FoodSlider />

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="bg-ink-800/40 border-y border-white/5 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="feature-grid grid md:grid-cols-3 gap-6">
            {[
              {
                icon: 'trophy',
                title: 'Preisgekrönte Qualität',
                desc: 'Jedes Gericht wird aus frischen, regionalen Zutaten zubereitet. Keine Abkürzungen — niemals.',
              },
              {
                icon: 'device',
                title: 'Einfache Online-Bestellung',
                desc: 'Bestelle in unter einer Minute. Verfolge deine Lieferung in Echtzeit bis vor deine Tür.',
              },
              {
                icon: 'truck',
                title: 'Blitzschnelle Lieferung',
                desc: 'Ø Lieferzeit 35 Minuten. Heiß bei dir zu Hause — genau wie aus der Küche.',
              },
            ].map((f) => (
              <div key={f.title} className="feature-card card p-8 flex flex-col items-center text-center hover:border-brand-500/30 transition-colors">
                <div className="w-16 h-16 grid place-items-center rounded-2xl bg-brand-500/15 border border-brand-500/20 text-brand-400 mb-5">
                  <Icon name={f.icon} className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl mb-3">{f.title}</h3>
                <p className="text-white/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT PREVIEW ────────────────────────────────── */}
      <section id="about" className="about-section max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid md:grid-cols-2 gap-12 items-center overflow-hidden">
        <div className="relative reveal">
          <div className="absolute -inset-4 bg-brand-500/20 rounded-3xl blur-2xl" />
          <img
            src={aboutStory || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000'}
            alt="Restaurant interior"
            className="about-img relative rounded-3xl object-cover w-full aspect-[4/3] shadow-2xl will-change-transform"
          />
          <div className="absolute -bottom-4 -right-4 bg-brand-500 text-white rounded-2xl p-5 shadow-glow">
            <div className="font-display text-3xl">10+</div>
            <div className="text-sm text-white/80">Jahre Leidenschaft</div>
          </div>
        </div>
        <div className="reveal">
          <span className="chip bg-brand-500/20 text-brand-300 mb-4">Unsere Geschichte</span>
          <h2 className="section-title mt-3">MIT LIEBE GEMACHT IN WIEN</h2>
          <div className="w-16 h-1 bg-brand-500 rounded-full mt-4 mb-6" />
          <p className="text-white/70 leading-relaxed mb-4">
            Rockin Rumble entstand aus einer Leidenschaft: Essen, das wirklich nach etwas schmeckt.
            Handgemachte Burger, neapolitanische Pizza bei 485 °C aus dem Holzofen, und Beilagen, die alles überstrahlen.
          </p>
          <p className="text-white/70 leading-relaxed mb-8">
            Heute bringen wir alles heiß und frisch zu dir nach Hause. Kein Aufwärmen.
            Keine Kompromisse. Nur lautes, leckeres Essen — schnell geliefert.
          </p>
          <Link to="/about" className="btn-outline">Unsere Geschichte lesen <Icon name="arrowRight" className="w-4 h-4" /></Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="bg-ink-800/40 border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-title">SO FUNKTIONIERT'S</h2>
          <div className="divider-brand" />
          <div className="grid md:grid-cols-3 gap-6 mt-4 text-left">
            {[
              { t: 'Auswählen & Bestellen', d: 'Speisekarte durchstöbern, Warenkorb füllen, in unter einer Minute bezahlen. Kein Konto nötig.' },
              { t: 'Wir kochen',           d: 'Unser Koch sieht deine Bestellung sofort, nimmt sie an und feuert den Grill an. Du bekommst Live-Updates.' },
              { t: 'Du genießt',           d: 'Heißes Essen vor deiner Tür, in Echtzeit verfolgt. Genieße jeden Bissen.' },
            ].map((s, idx) => (
              <div key={s.t} className="card p-8 relative overflow-hidden group hover:border-brand-500/30 transition-colors">
                <div className="absolute -top-3 -left-3 font-display text-[100px] text-white/[0.03] leading-none select-none">
                  {idx + 1}
                </div>
                <div className="w-14 h-14 grid place-items-center rounded-2xl bg-brand-500/15 border border-brand-500/20 text-brand-400 font-display text-3xl mb-5 group-hover:bg-brand-500/25 transition">
                  {idx + 1}
                </div>
                <h3 className="font-display text-2xl mb-3">{s.t}</h3>
                <p className="text-white/60 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY ──────────────────────────────────────── */}
      <section id="gallery" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-10 reveal">
          <h2 className="section-title">UNSERE GALERIE</h2>
          <p className="section-sub">Von der Küche auf den Tisch — jedes Gericht erzählt eine Geschichte.</p>
          <div className="divider-brand" />
        </div>

        {galleryImages.length > 0 && (() => {
          const right = galleryImages.slice(1, 5);
          const rightCols = right.length <= 2 ? 1 : 2;
          return (
            <div className="gallery-grid flex gap-3 h-[500px] lg:h-[560px]">
              {/* Featured left — links to /gallery */}
              <Link to="/gallery" className="gallery-featured gallery-item relative overflow-hidden rounded-3xl flex-[2] cursor-pointer group bg-white/5 block">
                {(() => {
                  const g = galleryImages[0];
                  const src = g.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${g.url}` : g.url;
                  return (
                    <>
                      <img src={src} alt={g.alt || ''} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 inset-x-0 p-6">
                        <span className="text-white/50 text-xs tracking-widest uppercase font-semibold">Galerie</span>
                        {g.alt && <p className="text-white font-display text-2xl lg:text-3xl mt-1 tracking-wide drop-shadow-lg">{g.alt}</p>}
                        <div className="mt-3 inline-flex items-center gap-2 text-brand-400 text-sm font-semibold">
                          <span>Alle ansehen</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </Link>

              {/* Right grid — each links to /gallery */}
              {right.length > 0 && (
                <div className={`flex-1 grid gap-3 ${rightCols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                  style={{ gridTemplateRows: `repeat(${Math.ceil(right.length / rightCols)}, 1fr)` }}
                >
                  {right.map((g) => {
                    const src = g.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${g.url}` : g.url;
                    return (
                      <Link to="/gallery" key={g.id} className="gallery-item group relative overflow-hidden rounded-2xl bg-white/5 cursor-pointer block">
                        <img src={src} alt={g.alt || ''} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        {g.alt && (
                          <div className="absolute bottom-0 inset-x-0 p-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                            <span className="text-white text-xs font-semibold truncate block">{g.alt}</span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        <div className="text-center mt-8">
          <Link to="/gallery" className="btn-outline">Komplette Galerie ansehen <Icon name="arrowRight" className="w-4 h-4" /></Link>
        </div>
      </section>

      {/* ── REVIEWS ──────────────────────────────────────── */}
      <section className="bg-ink-800/40 border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center reveal">
            <h2 className="section-title">WAS UNSERE GÄSTE SAGEN</h2>
            <p className="section-sub">Glaub nicht uns — glaub ihnen.</p>
            <div className="divider-brand" />
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-4">
            {REVIEWS.map((r) => (
              <div key={r.name} className="reveal card p-8 flex flex-col hover:border-brand-500/20 transition-colors">
                <div className="flex gap-1 text-brand-400 mb-4">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <Icon key={i} name="star" className="w-4 h-4" />
                  ))}
                </div>
                <p className="text-white/75 leading-relaxed flex-1 italic">"{r.text}"</p>
                <div className="mt-6 font-semibold text-white/90">— {r.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

function Stat({ n, l, icon }) {
  return (
    <div>
      <div className="font-display text-4xl text-brand-400 flex items-center gap-1">
        {n}{icon && <Icon name={icon} className="w-7 h-7" />}
      </div>
      <div className="text-xs uppercase tracking-widest text-white/50 mt-1">{l}</div>
    </div>
  );
}
