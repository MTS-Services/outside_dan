import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Icon from './Icon';
import { useCart, useCartUI } from '../store/cart';
import ExtrasModal from './ExtrasModal';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600&q=80';
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
function imgSrc(url) { return url && url.startsWith('/uploads/') ? `${API}${url}` : (url || FALLBACK_IMG); }

export default function FoodSlider() {
  const root = useRef(null);
  const marqueeRef = useRef(null);
  const [slides, setSlides] = useState([]);
  const addToCart = useCart((s) => s.add);
  const openCartDrawer = useCartUI((s) => s.openDrawer);
  const [modalItem, setModalItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);

  const handleAddClick = (s) => {
    setModalItem(s);
    setModalMounted(true);
    setModalOpen(true);
  };

  const handleConfirm = (selectedExtras = [], qty = 1, notes = '') => {
    if (!modalItem) return;
    addToCart(
      { id: modalItem.id, name: modalItem.title, price: modalItem.rawPrice, imageUrl: modalItem.imageUrl },
      selectedExtras,
      qty,
      notes
    );
    toast.success(`${modalItem.title} zum Warenkorb hinzugefügt`);
    openCartDrawer();
  };

  useEffect(() => {
    api.get('/menu/slider-items').then((r) => {
      const built = (r.data || []).map((item) => ({
        id: item.id,
        tag: item.category?.name || '',
        title: item.name,
        desc: item.description || '',
        rawPrice: Number(item.price),
        price: `€ ${Number(item.price).toFixed(2)}`,
        img: imgSrc(item.imageUrl),
        imageUrl: imgSrc(item.imageUrl),
        extras: (item.extras || []).map((me) => me.extra ? me.extra : me).filter((e) => e && e.isActive !== false),
      }));
      setSlides(built);
    }).catch(() => setSlides([]));
  }, []);

  // Marquee runs independently — not affected by pin
  useEffect(() => {
    const el = marqueeRef.current?.querySelector('.fs-marquee-inner');
    if (!el) return;
    const t = gsap.to(el, { xPercent: -50, ease: 'none', duration: 30, repeat: -1 });
    return () => t.kill();
  }, [slides.length]);

  useGSAP(() => {
    const panels = gsap.utils.toArray('.fs-panel', root.current);
    if (!panels.length) return;

    const isMobile = window.innerWidth < 768;

    const tween = gsap.to(panels, {
      xPercent: -100 * (panels.length - 1),
      ease: 'none',
      scrollTrigger: {
        trigger: root.current,
        pin: true, pinSpacing: true,
        scrub: isMobile ? 0.5 : 1.9,
        anticipatePin: isMobile ? 0 : 1,
        start: 'top top',
        end: () => '+=' + window.innerHeight * (panels.length - 1) * (isMobile ? 1.5 : 1),
        invalidateOnRefresh: true,
      },
    });
    panels.forEach((panel) => {
      const img = panel.querySelector('.fs-img');
      const els = ['.fs-tag', '.fs-title', '.fs-desc', '.fs-price']
        .map((s) => panel.querySelector(s))
        .filter(Boolean);
      if (img) {
        gsap.fromTo(img, { xPercent: 5 }, {
          scale: 1, xPercent: -5, ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        });
      }
      if (els.length) {
        gsap.from(els, {
          yPercent: 60, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left 65%', toggleActions: 'play none none reverse' },
        });
      }
    });
  }, { scope: root, dependencies: [slides.length] });

  if (slides.length === 0) return null;

  return (
    <>
      {/* Marquee scrolls normally — separated from the pinned section so it stays visible */}
      <div ref={marqueeRef} className="bg-ink-900 py-8 border-y border-white/5 overflow-hidden bg-ink-800/40">
        <div className="fs-marquee-inner flex whitespace-nowrap will-change-transform">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex items-center gap-10 pr-10 font-display text-5xl md:text-7xl tracking-wider">
              {['ESSEN', '·', 'SCHLAFEN', '·', 'WIEDERHOLEN', '·', 'FRISCH', '·', 'SCHNELL', '·', 'LAUT', '·'].map((w, i) => (
                <span key={`${k}-${i}`} className={i % 3 === 0 ? 'text-brand-500' : 'text-white/15'}>{w}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pinned slider — exactly h-screen so pin fits the viewport perfectly */}
      <section ref={root} className="relative bg-ink-900 w-full">
        <div className="relative h-screen flex flex-nowrap overflow-hidden">
          <div className="hidden md:block absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
            <div className="text-[11px] tracking-[0.3em] text-white/50 uppercase">Scrollen · Essen · Wiederholen</div>
          </div>

          {slides.map((s, idx) => (
            <article key={`${s.title}-${idx}`} className="fs-panel relative h-full flex items-center will-change-transform" style={{ flex: '0 0 100%', width: '100%' }}>
              <div className="absolute inset-0 overflow-hidden">
                <img src={s.img} alt={s.title} className="fs-img absolute inset-0 w-full h-full object-cover will-change-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-900/95 via-ink-900/55 to-ink-900/15" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />
              </div>

              <div className="relative z-10 max-w-3xl px-6 sm:px-16 lg:px-24 w-full">
                <div className="fs-tag inline-flex items-center gap-3 mb-3 md:mb-6">
                  <span className="w-10 h-px bg-brand-500" />
                  <span className="text-brand-400 text-xs tracking-[0.3em] font-semibold uppercase">
                    {String(idx + 1).padStart(2, '0')} · {s.tag}
                  </span>
                </div>
                <h3 className="fs-title font-display text-4xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.9] tracking-wide">
                  {s.title}
                </h3>
                {s.desc && <p className="fs-desc hidden sm:block mt-6 text-lg md:text-xl text-white/70 max-w-xl leading-relaxed">{s.desc}</p>}
                <div className="fs-price mt-5 md:mt-8 flex flex-wrap items-center gap-4 md:gap-6">
                  <span className="font-display text-3xl md:text-4xl text-brand-400">{s.price}</span>
                  <button
                    onClick={() => handleAddClick(s)}
                    className="btn-primary px-5 py-2.5 md:px-7 md:py-3 text-sm md:text-base flex items-center gap-2"
                  >
                    <Icon name="cart" className="w-4 h-4 md:w-5 md:h-5" />
                    In den Warenkorb
                  </button>
                </div>
              </div>

              <div className="absolute right-6 bottom-6 font-display text-[18vw] leading-none text-white/[0.04] select-none pointer-events-none">
                {String(idx + 1).padStart(2, '0')}
              </div>
            </article>
          ))}
        </div>
      </section>

      {modalMounted && (
        <ExtrasModal
          open={modalOpen}
          item={modalItem ? { id: modalItem.id, name: modalItem.title, price: modalItem.rawPrice, imageUrl: modalItem.imageUrl, extras: modalItem.extras } : null}
          extras={modalItem?.extras || []}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
