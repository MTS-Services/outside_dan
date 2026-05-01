import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../components/Icon';
import api from '../api/client';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const VALUES = [
  { icon: 'leaf',   t: 'Frische Zutaten',  d: 'Regionale Lieferanten, saisonale Produkte, niemals tiefgekühlt.' },
  { icon: 'chef',   t: 'Handwerk',         d: '485 °C Steinofen. Handgemachte Patties. Jedes Mal.' },
  { icon: 'truck',  t: 'Schnelle Lieferung', d: 'Live-Tracking. Ø 35 Minuten Lieferzeit.' },
  { icon: 'heart',  t: 'Keine Kompromisse', d: 'Wir kochen für dich, wie wir für uns selbst kochen.' },
];

export default function About() {
  const main = useRef(null);
  const [aboutHero, setAboutHero] = useState(null);
  const [aboutStory, setAboutStory] = useState(null);
  const [kitchenPics, setKitchenPics] = useState([]);

  useEffect(() => {
    // Load hero image
    api.get('/site-images/about_hero').then((r) => {
      if (r.data?.url) setAboutHero(r.data.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${r.data.url}` : r.data.url);
    }).catch(() => {});
    
    // Load story image
    api.get('/site-images/about_story').then((r) => {
      if (r.data?.url) setAboutStory(r.data.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${r.data.url}` : r.data.url);
    }).catch(() => {});
    
    // Load product images: try bestsellers, then from different categories
    api.get('/menu').then((r) => {
      const allItems = r.data.flatMap(c => c.items).filter(i => i.imageUrl);
      
      // 1. Try to get items with a "bestseller" tag
      let selectedItems = allItems.filter(i => 
        i.tags?.some(t => t.tag?.slug === 'bestseller' || t.tag?.name?.toLowerCase().includes('best'))
      ).slice(0, 4); // Limit to max 4 right away

      // 2. If we don't have 4 yet, try picking one item from each category to mix it up
      if (selectedItems.length < 4) {
        const catItems = [];
        for (const cat of r.data) {
          const item = cat.items.find(i => i.imageUrl && !selectedItems.find(si => si.id === i.id));
          if (item) catItems.push(item);
        }
        selectedItems = [...selectedItems, ...catItems].slice(0, 4);
      }

      // 3. Still missing some? Just fill with whatever is left
      if (selectedItems.length < 4) {
        const remaining = allItems.filter(i => !selectedItems.find(si => si.id === i.id));
        selectedItems = [...selectedItems, ...remaining].slice(0, 4);
      }

      const images = selectedItems.map(i => i.imageUrl.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${i.imageUrl}` : i.imageUrl);
      
      if (images.length > 0) {
        setKitchenPics(images);
      } else {
        // Absolute fallback if menu is completely empty
        setKitchenPics([
          'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800',
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
          'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800',
          'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800',
        ].slice(0, 4));
      }
    }).catch(() => {});
  }, []);
  useGSAP(
    () => {
      // Hero parallax
      gsap.to('.about-hero-bg', {
        yPercent: 25,
        ease: 'none',
        scrollTrigger: {
          trigger: '.about-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Hero text intro
      gsap.from('.about-hero-anim', {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: 'power3.out',
      });

      // Show content immediately if it's already in the viewport when the page loads
      // This prevents the "black empty box" issue
      ScrollTrigger.refresh();

      // Generic reveal
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.from(el, {
          y: 70,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none reverse' },
        });
      });

      // Values stagger
      gsap.from('.value-card', {
        y: 60,
        opacity: 0,
        scale: 0.9,
        stagger: 0.12,
        duration: 0.8,
        ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '.value-grid', start: 'top 95%' },
      });

      // Kitchen photos
      gsap.from('.kitchen-img', {
        y: 80,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.kitchen-grid', start: 'top 80%' },
      });

      // Stats counter
      gsap.utils.toArray('.stat-num').forEach((el) => {
        const target = parseFloat(el.dataset.value);
        const suffix = el.dataset.suffix || '';
        const decimals = (el.dataset.decimals && parseInt(el.dataset.decimals, 10)) || 0;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          onUpdate: () => {
            el.textContent = obj.v.toFixed(decimals) + suffix;
          },
        });
      });

      // Story image parallax
      gsap.to('.story-img', {
        yPercent: -10,
        ease: 'none',
        scrollTrigger: {
          trigger: '.story-section',
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
      {/* HERO */}
      <section className="about-hero relative h-[44vh] flex items-center overflow-hidden">
        {aboutHero && (
          <img
            src={aboutHero}
            alt="Restaurant interior"
            className="about-hero-bg absolute inset-0 w-full h-full object-cover object-top will-change-transform"
          />
        )}
        <div className="absolute inset-0 bg-ink-900/75" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
          <span className="about-hero-anim chip bg-brand-500/20 text-brand-300 mb-4 inline-block">Unsere Geschichte</span>
          <h1 className="about-hero-anim font-display text-6xl md:text-7xl mt-3">ÜBER UNS</h1>
          <p className="about-hero-anim text-white/60 mt-4 text-lg max-w-xl mx-auto">
            In Wien geboren, aus Leidenschaft für ehrliches, richtig gemachtes Essen.
          </p>
        </div>
      </section>

      {/* STORY */}
      <section className="story-section max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid md:grid-cols-2 gap-12 items-center overflow-hidden">
        <div className="reveal">
          <span className="chip bg-brand-500/20 text-brand-300 mb-4">Wer wir sind</span>
          <h2 className="section-title mt-3">MIT LIEBE GEMACHT IN WIEN</h2>
          <div className="w-16 h-1 bg-brand-500 rounded-full mt-4 mb-6" />
          <p className="text-white/70 leading-relaxed mb-4">
            Rockin Rumble startete 2014 als kleiner Foodtruck mit einer Mission — Burger und
            Pizza zu servieren, die schmecken, als hätte sie jemand mit Herzblut gemacht.
            Frisch faschiertes Rindfleisch, frischer Teig, regionale Produkte. Keine Abkürzungen.
          </p>
          <p className="text-white/70 leading-relaxed mb-4">
            Unsere neapolitanischen Pizzen werden bei 485 °C im IZZO-Steinofen gebacken —
            perfekt knusprig, luftig und in unter 60 Sekunden fertig. Unsere Burger werden
            für jede Bestellung handgemacht, niemals tiefgekühlt.
          </p>
          <p className="text-white/70 leading-relaxed mb-8">
            Heute, mit unserer eigenen Lieferplattform direkt verbunden mit unserer Küche
            und Kassensystem, wird jede Bestellung mit der gleichen Sorgfalt behandelt,
            als wärst du selbst bei uns vor Ort.
          </p>
          <Link to="/menu" className="btn-primary">
            Jetzt bestellen <Icon name="arrowRight" className="w-4 h-4" />
          </Link>
        </div>
        <div className="relative reveal">
          <div className="absolute -inset-4 bg-brand-500/15 rounded-3xl blur-2xl" />
          <img
            src={aboutStory || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900'}
            alt="About us story"
            className="story-img relative rounded-3xl object-cover w-full aspect-square shadow-2xl will-change-transform"
          />
          <div className="absolute -bottom-5 -left-5 card p-5 shadow-glow max-w-[200px]">
            <div className="font-display text-4xl text-brand-400">10+</div>
            <div className="text-white/60 text-sm mt-1">Jahre lautes Essen</div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-ink-800/40 border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-title reveal">WOFÜR WIR STEHEN</h2>
          <div className="divider-brand" />
          <div className="value-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-4 text-left">
            {VALUES.map((v) => (
              <div key={v.t} className="value-card card p-6 hover:border-brand-500/30 transition-colors">
                <div className="w-14 h-14 grid place-items-center rounded-2xl bg-brand-500/15 border border-brand-500/20 text-brand-400 mb-5">
                  <Icon name={v.icon} className="w-7 h-7" />
                </div>
                <h3 className="font-display text-xl mb-2">{v.t}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KITCHEN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-12 reveal">
          <h2 className="section-title tracking-widest uppercase">FROM OUR KITCHEN</h2>
          <div className="divider-brand" />
        </div>
        <div className={`kitchen-grid grid grid-cols-2 md:grid-cols-${Math.min(kitchenPics.length || 4, 4)} gap-4`}>
          {kitchenPics.map((src, i) => (
            <div key={i} className="kitchen-img gallery-item overflow-hidden rounded-2xl aspect-square bg-ink-800">
              <img src={src} alt={`kitchen ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="bg-brand-500 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { v: 20, suffix: 'K+', l: 'Zufriedene Kunden' },
            { v: 4.9, decimals: 1, l: 'Durchschnittsbewertung', star: true },
            { v: 35, suffix: ' Min', l: 'Ø Lieferzeit' },
            { v: 100, suffix: '%', l: 'Frische Zutaten' },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-display text-4xl flex items-center justify-center gap-1">
                <span
                  className="stat-num"
                  data-value={s.v}
                  data-suffix={s.suffix || ''}
                  data-decimals={s.decimals || 0}
                >
                  0
                </span>
                {s.star && <Icon name="star" className="w-7 h-7" />}
              </div>
              <div className="text-white/80 text-sm mt-1 uppercase tracking-wider">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center reveal">
        <h2 className="section-title">BEREIT ZU ESSEN?</h2>
        <p className="text-white/60 mt-4 mb-8 text-lg">Schau dir die Speisekarte an und bestelle etwas Leckeres.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/menu" className="btn-primary text-lg px-8 py-3">
            Speisekarte ansehen <Icon name="arrowRight" className="w-5 h-5" />
          </Link>
          <Link to="/contact" className="btn-outline text-lg px-8 py-3">Kontakt</Link>
        </div>
      </section>
    </div>
  );
}
