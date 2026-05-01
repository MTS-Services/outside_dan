import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import api from '../api/client';
import MenuItemCard from '../components/MenuItemCard';
import Icon from '../components/Icon';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState('all');
  const [activeSlug, setActiveSlug] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuHero, setMenuHero] = useState(null);
  const main = useRef(null);

  useEffect(() => {
    api.get('/site-images/menu_hero').then((r) => {
      if (r.data?.url) setMenuHero(r.data.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${r.data.url}` : r.data.url);
    }).catch(() => {});
  }, []);

  // Load tags once
  useEffect(() => { api.get('/menu/tags').then((r) => setTags(r.data)).catch(() => {}); }, []);

  // Load menu once
  useEffect(() => {
    setLoading(true);
    api.get('/menu')
      .then((r) => setCategories(r.data))
      .finally(() => setLoading(false));
  }, []);

  // Filter items completely locally without artificial UI delays
  const filtered = React.useMemo(() => {
    let cats = categories;
    if (activeSlug !== 'all') cats = cats.filter((c) => c.slug === activeSlug);
    if (activeTag !== 'all') {
      cats = cats
        .map((c) => ({
          ...c,
          items: c.items.filter((i) => (i.tags || []).some((t) => (t.tag?.slug || t.slug) === activeTag)),
        }))
        .filter((c) => c.items.length);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      cats = cats
        .map((c) => ({ ...c, items: c.items.filter((i) => i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)) }))
        .filter((c) => c.items.length);
    }
    return cats;
  }, [categories, activeSlug, activeTag, query]);

  // Scroll to menu top when filtering
  const scrollToMenu = () => {
    setTimeout(() => {
      const hero = document.querySelector('.menu-hero');
      if (hero) {
        // Calculate the absolute bottom of the hero image (where the sticky bar starts)
        const targetY = hero.getBoundingClientRect().bottom + window.scrollY - 64;
        
        // Use Lenis smooth scroll if available, otherwise fallback to native
        if (window.__lenis) {
          window.__lenis.scrollTo(targetY);
        } else {
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }
    }, 50); // Small delay allows React to process state before scrolling
  };

  const handleSlugClick = (slug) => {
    setActiveSlug(slug);
    scrollToMenu();
  };

  const handleTagClick = (tag) => {
    setActiveTag(tag);
    scrollToMenu();
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    scrollToMenu();
  };

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);

  useGSAP(() => {
    gsap.to('.menu-hero-bg', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.menu-hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.from('.menu-hero-anim', { y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out' });
  }, { scope: main, dependencies: [] });



  return (
    <div ref={main}>
      <section className="menu-hero relative h-[55vh] flex items-center overflow-hidden">
        {menuHero && (
          <img
            src={menuHero}
            alt="Speisekarte"
            className="menu-hero-bg absolute inset-0 w-full h-full object-cover object-center will-change-transform"
          />
        )}
        <div className="hero-img-overlay absolute inset-0" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <span className="menu-hero-anim chip bg-brand-500/20 text-brand-300 mb-4 inline-block">{totalItems} Artikel verfügbar</span>
          <h1 className="menu-hero-anim font-display text-6xl md:text-7xl mt-3">UNSERE SPEISEKARTE</h1>
          <p className="menu-hero-anim text-white/65 mt-4 text-lg">Frisch zubereitet. Schnell geliefert. Keine Kompromisse.</p>
        </div>
      </section>

      <div className="sticky top-[64px] z-20 bg-ink-900/90 backdrop-blur-md border-b border-white/5 py-4 space-y-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <CatPill active={activeSlug === 'all'} onClick={() => handleSlugClick('all')}>Alle</CatPill>
              {categories.map((c) => (
                <CatPill key={c.slug} active={activeSlug === c.slug} onClick={() => handleSlugClick(c.slug)}>
                  {c.name}
                </CatPill>
              ))}
            </div>
            <div className="relative w-full sm:w-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                <Icon name="search" className="w-4 h-4" />
              </span>
              <input value={query} onChange={handleQueryChange} placeholder="Artikel suchen…" className="input pl-9 sm:w-64" />
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <TagPill active={activeTag === 'all'} onClick={() => handleTagClick('all')}>Alle</TagPill>
              {tags.map((t) => (
                <TagPill key={t.id} active={activeTag === t.slug} onClick={() => handleTagClick(t.slug)}>
                  {t.name}
                </TagPill>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {loading ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50 mt-4">Speisekarte wird geladen…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-white/50">
            <div className="w-16 h-16 mx-auto mb-4 grid place-items-center rounded-full bg-white/5">
              <Icon name="search" className="w-8 h-8" />
            </div>
            <div className="text-xl">Keine Artikel passen zur Suche.</div>
            <button onClick={() => { setQuery(''); setActiveSlug('all'); setActiveTag('all'); }} className="btn-outline mt-6">
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <div key={`${activeSlug}-${activeTag}-${query}`} className="animate-fade-in">
          {filtered.map((cat) => (
            <section key={cat.id} className="menu-cat mb-16">
              <div className="flex items-baseline gap-4 mb-6">
                <h2 className="font-display text-4xl tracking-wider">{cat.name.toUpperCase()}</h2>
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/40 text-sm whitespace-nowrap">{cat.items.length}</span>
              </div>
              {cat.description && <p className="text-white/50 text-sm mb-5 -mt-2">{cat.description}</p>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {cat.items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="menu-card-wrap"
                    style={{ animationDelay: `${idx * 60}ms`, opacity: 0, animation: `fade-in 0.45s ease forwards ${idx * 60}ms` }}
                  >
                    <MenuItemCard item={it} />
                  </div>
                ))}
              </div>
            </section>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CatPill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wider transition-all ${
        active ? 'bg-brand-500 text-white shadow-glow scale-105' : 'bg-white/5 text-white/65 hover:bg-white/10 hover:text-white'
      }`}>
      {children}
    </button>
  );
}

function TagPill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
        active ? 'bg-brand-500 text-white shadow-glow scale-105' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
      }`}>
      {children}
    </button>
  );
}
