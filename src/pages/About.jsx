import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../components/Icon';
import api from '../api/client';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const VALUES = [
  { icon: 'leaf',   t: 'Authentischer Geschmack',    d: 'Original italienische Rezepte und sorgfältig ausgewählte Zutaten.' },
  { icon: 'flame',  t: 'Traditionelles Handwerk',    d: 'Neapolitanische Pizza aus dem IZZO FORNI Ofen bei bis zu 485 °C.' },
  { icon: 'truck',  t: 'Genuss für Zuhause',         d: 'Ab sofort auch bequem online bestellen und liefern lassen.' },
  { icon: 'trophy', t: 'Ausgezeichnete Qualität',    d: 'Falstaff Sieger 2025 und täglich mit Leidenschaft für unsere Gäste da.' },
];

const HIGHLIGHTS = [
  { icon: 'trophy',   t: 'Falstaff Sieger 2025',  d: 'Beliebteste Pizzeria der Steiermark' },
  { icon: 'pizza',    t: 'Pizza Napoletana',      d: 'Original neapolitanische Tradition' },
  { icon: 'mountain', t: '120 Sitzplätze',        d: 'Mit Blick auf die Bergwelt' },
  { icon: 'truck',    t: 'Lieferung & Abholung',  d: 'Jetzt bequem online bestellen' },
];

const FOUNDER_IMAGE = '/tarantella_pizza_pasta_napoli_1746379741_3625218479079695935_70184343698_1.jpg';

export default function About() {
  const main = useRef(null);
  const [aboutHero, setAboutHero] = useState(null);
  const [aboutStory, setAboutStory] = useState(null);
  const [aboutFounder, setAboutFounder] = useState(null);
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

    api.get('/site-images/about_founder').then((r) => {
      if (r.data?.url) setAboutFounder(r.data.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${r.data.url}` : r.data.url);
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
      <section className="about-hero relative h-[65vh] flex items-center overflow-hidden">
        {aboutHero && (
          <img
            src={aboutHero}
            alt="Restaurant interior"
            className="about-hero-bg absolute inset-0 w-full h-full object-cover object-center will-change-transform"
          />
        )}
        <div className="absolute inset-0 bg-ink-900/75" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
          <span className="about-hero-anim chip bg-brand-500/20 text-brand-300 mb-4 inline-block">Unsere Geschichte</span>
          <h1 className="about-hero-anim font-display text-6xl md:text-7xl mt-3">ÜBER UNS</h1>
          <p className="about-hero-anim text-white/70 mt-4 text-lg max-w-2xl mx-auto">
            Wo Tradition, Qualität und Gastfreundschaft zusammenkommen.
          </p>
          <p className="about-hero-anim text-white/60 mt-3 text-lg max-w-2xl mx-auto leading-relaxed">
            Bei Tarantella geht es um mehr als Pizza und Pasta. Es geht um gemeinsame Momente, italienische Lebensfreude und den Geschmack echter Handwerkskunst.
          </p>
        </div>
      </section>

      {/* FOUNDER STORY */}
      <section id="founder-story" className="founder-story bg-ink-800/40 border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <h2 className="section-title">Die Geschichte hinter Tarantella</h2>
            <p className="section-sub mt-3">Wie aus einer Leidenschaft ein Restaurant wurde</p>
            <div className="divider-brand" />
          </div>
          <div className="grid md:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="founder-body text-sm sm:text-[0.9375rem] leading-[1.75] text-white/65 space-y-4 reveal text-justify">
              <p>
                Mein beruflicher Weg begann ursprünglich nicht in der Gastronomie, sondern im Tischlerhandwerk. Die Leidenschaft für gutes Essen und besondere Genussmomente hat mich jedoch schon früh begleitet.
              </p>
              <p>
                Viele Jahre durfte ich auf einigen der exklusivsten Yachten der Welt arbeiten. Dort habe ich erlebt, was echte Spitzenqualität bedeutet – in jedem Detail. Höchste Ansprüche an Produkte, Service und Gastfreundschaft waren selbstverständlich. Diese Erfahrungen prägen meine Arbeit bis heute und bilden einen wichtigen Teil der Philosophie von Tarantella.
              </p>
              <p>
                Während meiner Zeit in London entdeckte ich schließlich die traditionelle neapolitanische Pizza. Die Einfachheit der Zutaten, das handwerkliche Können und der unverwechselbare Geschmack haben mich sofort begeistert. Es war faszinierend zu sehen, wie aus wenigen, hochwertigen Zutaten etwas so Besonderes entstehen kann.
              </p>
              <p>
                Egal, in welchem Land ich danach unterwegs war – ich habe immer versucht, ein neapolitanisches Restaurant zu besuchen. Mit jeder Pizza, die ich probierte, wuchs meine Begeisterung für diese besondere Handwerkskunst.
              </p>
              <p>
                Jedes Mal, wenn ich in meine Heimat zurückkehrte, stellte ich mir dieselbe Frage: Warum gibt es so eine Pizza eigentlich nicht in unserer Region?
              </p>
              <p>
                Ursprünglich hatte ich nie vor, eine eigene Pizzeria zu eröffnen. Ich wollte einfach eine authentische Pizza Napoletana in der Nähe genießen können. Doch je länger ich suchte, desto klarer wurde mir, dass genau dieses Angebot fehlte.
              </p>
              <p>
                Irgendwann entstand daraus ein Gedanke, der mich nicht mehr losließ:
              </p>
              <blockquote className="border-l-4 border-brand-500 pl-5 py-1 text-white/85 italic text-base sm:text-lg my-6 text-left">
                „Wenn es sie nicht gibt, dann mache ich sie selbst.“
              </blockquote>
              <p>
                Durch eine zufällige Begegnung am Golfplatz Trofaiach ergab sich schließlich die Möglichkeit, diesen Gedanken Wirklichkeit werden zu lassen. Aus einer Idee wurde ein Plan, aus einem Traum ein Restaurant – und so entstand Tarantella.
              </p>
              <p>
                Von Anfang an war mein Ziel klar: einen Ort zu schaffen, an dem Qualität, Gastfreundschaft und authentische neapolitanische Pizza im Mittelpunkt stehen. Einen Ort, an dem man gerne zusammenkommt, genießt und sich wohlfühlt.
              </p>
              <p>
                Dass Tarantella bereits kurz nach der Eröffnung von Falstaff zur beliebtesten Pizzeria der Steiermark gewählt wurde, erfüllt mich mit großem Stolz. Eine weitere besondere Anerkennung war die Auszeichnung zum Steirischen Kopf des Jahres. Beide Auszeichnungen bestätigen, dass Leidenschaft, Mut und der Anspruch an höchste Qualität wahrgenommen werden.
              </p>
              <p>
                Am wichtigsten sind für mich jedoch die Menschen, die uns täglich besuchen. Jeder Gast, jede Empfehlung und jedes Wiederkommen zeigen uns, dass wir auf dem richtigen Weg sind.
              </p>
              <p>
                Ich freue mich darauf, auch dich bald bei uns begrüßen zu dürfen.
              </p>
              <div className="pt-8 mt-4 border-t border-white/10 text-left">
                <p className="font-display text-xl text-white/90 tracking-wide">Daniel Trost</p>
                <p className="text-brand-300 text-sm mt-1">Gründer & Inhaber von Tarantella</p>
              </div>
            </div>
            <div className="relative reveal md:sticky md:top-28">
              <div className="absolute -inset-4 bg-brand-500/15 rounded-3xl blur-2xl" />
              <img
                src={aboutFounder || FOUNDER_IMAGE}
                alt="Daniel Trost, Gründer von Tarantella"
                className="founder-img relative rounded-3xl object-cover object-top w-full aspect-[3/4] shadow-2xl will-change-transform"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="story-section max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid md:grid-cols-2 gap-10 lg:gap-14 items-start overflow-hidden">
        <div className="reveal">
          <span className="chip bg-brand-500/20 text-brand-300 mb-4">Wer wir sind</span>
          <h2 className="section-title mt-3 text-3xl sm:text-4xl lg:text-5xl">Ein Stück Neapel in Trofaiach</h2>
          <div className="w-16 h-1 bg-brand-500 rounded-full mt-4 mb-5" />
          <div className="story-body text-sm sm:text-[0.9375rem] leading-[1.75] text-white/65 space-y-3.5 mb-8">
            <p>
              Bei Tarantella verbinden wir italienische Tradition mit echter Gastfreundschaft. Unsere Leidenschaft gilt der original neapolitanischen Pizza, die mit hochwertigen Zutaten, viel Erfahrung und handwerklichem Können zubereitet wird.
            </p>
            <p>
              Das Herzstück unserer Küche ist unser IZZO FORNI Pizzaofen. Bei Temperaturen von bis zu 485 °C entsteht in nur 60 Sekunden eine Pizza mit luftiger Kruste, intensivem Aroma und dem unverwechselbaren Geschmack Neapels.
            </p>
            <p>
              Doch Tarantella ist mehr als nur Pizza. Wir möchten einen Ort schaffen, an dem sich Menschen wohlfühlen, gemeinsam genießen und besondere Momente erleben können.
            </p>
            <p>
              Mit insgesamt 120 Sitzplätzen – 60 im stilvollen Innenbereich und 60 im Gastgarten mit Blick auf die umliegende Natur und Bergwelt – bieten wir den perfekten Rahmen für entspannte Mittagessen, gemütliche Familienabende oder Treffen mit Freunden.
            </p>
            <p>
              Seit unserer Eröffnung dürfen wir Gäste aus der gesamten Region begrüßen und wurden 2025 von Falstaff zur beliebtesten Pizzeria der Steiermark gewählt – eine Auszeichnung, die uns stolz macht und für die wir unseren Gästen von Herzen danken.
            </p>
            <p>
              Wir freuen uns darauf, auch dich bei uns willkommen zu heißen.
            </p>
          </div>
          <Link to="/menu" className="btn-primary">
            Jetzt bestellen <Icon name="arrowRight" className="w-4 h-4" />
          </Link>
        </div>
        <div className="relative reveal md:sticky md:top-28">
          <div className="absolute -inset-4 bg-brand-500/15 rounded-3xl blur-2xl" />
          <img
            src={aboutStory || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900'}
            alt="About us story"
            className="story-img relative rounded-3xl object-cover w-full aspect-square shadow-2xl will-change-transform"
          />
          <div className="absolute -bottom-5 -left-5 card p-5 shadow-glow max-w-[200px]">
            <div className="font-display text-4xl text-brand-400">120</div>
            <div className="text-white/60 text-sm mt-1">Sitzplätze</div>
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
          <h2 className="section-title">Aus unserer Küche</h2>
          <p className="section-sub mt-3 max-w-2xl mx-auto">
            Italienische Spezialitäten, frisch zubereitet und mit Leidenschaft serviert.
          </p>
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

      {/* HIGHLIGHTS */}
      <section className="bg-brand-500 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {HIGHLIGHTS.map((h) => (
            <div key={h.t} className="flex flex-col items-center">
              <div className="w-12 h-12 grid place-items-center rounded-xl bg-white/15 mb-3">
                <Icon name={h.icon} className="w-6 h-6" />
              </div>
              <div className="font-display text-lg sm:text-xl leading-tight">{h.t}</div>
              <div className="text-white/85 text-xs sm:text-sm mt-1.5 leading-snug">{h.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center reveal">
        <h2 className="section-title">Italien für Zuhause</h2>
        <p className="text-white/60 mt-4 mb-8 text-lg">
          Bestelle deine Lieblingsgerichte bequem online und genieße Tarantella dort, wo du möchtest.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/menu" className="btn-primary text-lg px-8 py-3">
            Jetzt bestellen <Icon name="arrowRight" className="w-5 h-5" />
          </Link>
          <Link to="/menu" className="btn-outline text-lg px-8 py-3">
            Speisekarte ansehen
          </Link>
        </div>
      </section>
    </div>
  );
}
