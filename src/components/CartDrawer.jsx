import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useCart, useCartUI } from '../store/cart';
import { ORDERS_CLOSED_MESSAGE, useOrderGuard } from '../store/siteSettings';
import Icon from './Icon';

const imgSrc = (url) => url?.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;

export default function CartDrawer() {
  const open = useCartUI((s) => s.open);
  const close = useCartUI((s) => s.closeDrawer);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const modifyExtraQty = useCart((s) => s.modifyExtraQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());
  const { canOrder } = useOrderGuard();

  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const tl = useRef(null);

  // Build animation timeline once — useLayoutEffect runs before first paint,
  // so the panel is already off-screen before the browser renders anything.
  useLayoutEffect(() => {
    if (!panelRef.current || !backdropRef.current) return;
    gsap.set(panelRef.current, { xPercent: 100 });
    gsap.set(backdropRef.current, { autoAlpha: 0 });
    tl.current = gsap.timeline({ paused: true })
      .to(backdropRef.current, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
      .to(panelRef.current, { xPercent: 0, duration: 0.5, ease: 'power3.inOut' }, '<');
    return () => { tl.current?.kill(); };
  }, []);

  // Play / reverse on open state
  useEffect(() => {
    if (!tl.current) return;
    if (open) tl.current.play();
    else tl.current.reverse();
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'clip';
    if (window.__lenis) window.__lenis.stop();
    return () => {
      document.body.style.overflow = prev;
      if (window.__lenis) window.__lenis.start();
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open} data-lenis-prevent>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ visibility: 'hidden' }}
      />

      {/* Panel: 40% on desktop, full on mobile */}
      <aside
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full sm:w-[60%] md:w-[50%] lg:w-[40%] bg-ink-900 border-l border-white/10 shadow-2xl flex flex-col"
        role="dialog"
        aria-label="Warenkorb"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-brand-500/20 grid place-items-center">
              <Icon name="cart" className="w-5 h-5 text-brand-400" />
            </span>
            <div>
              <h2 className="font-display text-2xl tracking-widest leading-none">WARENKORB</h2>
              <p className="text-xs text-white/50 mt-1">{items.length} Artikel</p>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Schließen"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white stroke-2 fill-none">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-4" data-lenis-prevent>
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/50 py-20">
              <Icon name="cart" className="w-12 h-12 mb-4 opacity-40" />
              <p className="font-display text-xl tracking-wider">DEIN KORB IST LEER</p>
              <p className="text-sm mt-2">Stöbere in der Speisekarte und füge etwas Leckeres hinzu.</p>
              <Link
                to="/menu"
                onClick={close}
                className="btn-primary mt-6 px-5 py-2.5"
              >
                Zur Speisekarte
              </Link>
            </div>
          ) : (
            items.map((line) => {
              const unit = Number(line.price) + (line.extras || []).reduce((s, e) => s + Number(e.price || 0), 0);
              const lineTotal = unit * line.quantity;
              return (
                <div key={line.lineId} className="flex gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                  {line.imageUrl ? (
                    <img src={imgSrc(line.imageUrl)} alt={line.name} className="w-20 h-20 rounded-xl object-cover shrink-0 bg-ink-800" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-ink-800 grid place-items-center text-white/30 text-xs shrink-0 font-display">RR</div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-lg leading-tight truncate text-white">{line.name}</p>
                      <button
                        onClick={() => remove(line.lineId)}
                        aria-label="Entfernen"
                        className="text-white/40 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                      >
                        <Icon name="close" className="w-4 h-4" />
                      </button>
                    </div>
                    {line.extras?.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {Object.values(
                          line.extras.reduce((acc, curr) => {
                            const key = curr.id || curr.name;
                            if (!acc[key]) acc[key] = { ...curr, count: 0 };
                            acc[key].count += 1;
                            return acc;
                          }, {})
                        ).map((ext, idx) => {
                          const totalExtQty = ext.count * line.quantity;
                          return (
                            <div key={idx} className="text-xs text-brand-400 flex items-center justify-between gap-2">
                              <span className="leading-tight">
                                + {ext.name} <span className="text-brand-400/60 ml-1">({totalExtQty} × €{Number(ext.price || 0).toFixed(2)})</span>
                              </span>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="inline-flex items-center bg-ink-950 rounded-full border border-white/10 h-6">
                                  <button onClick={() => modifyExtraQty(line.lineId, ext.id || ext.name, -1)} className="w-6 h-6 grid place-items-center text-white/50 hover:text-white">−</button>
                                  <span className="w-5 text-center text-[10px] font-semibold text-white/90">{ext.count}</span>
                                  <button onClick={() => modifyExtraQty(line.lineId, ext.id || ext.name, 1)} className="w-6 h-6 grid place-items-center text-white/50 hover:text-white">+</button>
                                </div>
                                <span className="font-semibold w-12 text-right">€{(Number(ext.price || 0) * totalExtQty).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {line.notes && (
                      <p className="text-xs text-white/50 italic mt-1.5 line-clamp-2">
                        Anmerkung: {line.notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3">
                      <div className="inline-flex items-center bg-ink-900 rounded-full border border-white/10 h-8">
                        <button
                          onClick={() => setQty(line.lineId, Math.max(1, line.quantity - 1))}
                          className="w-8 h-8 grid place-items-center text-white/70 hover:text-white"
                          aria-label="Verringern"
                        >−</button>
                        <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
                        <button
                          onClick={() => setQty(line.lineId, Math.min(99, line.quantity + 1))}
                          className="w-8 h-8 grid place-items-center text-white/70 hover:text-white"
                          aria-label="Erhöhen"
                        >+</button>
                      </div>
                      <span className="font-bold text-white text-lg">€{lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/10 px-6 py-5 space-y-3 bg-ink-900">
            <div className="flex items-center justify-between text-sm text-white/65">
              <span>Zwischensumme</span>
              <span className="font-semibold text-white">€{subtotal.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-white/40">Versand & Steuern werden an der Kasse berechnet.</p>
            {!canOrder && (
              <p className="text-xs text-amber-400/90">{ORDERS_CLOSED_MESSAGE}</p>
            )}
            {canOrder ? (
              <Link
                to="/checkout"
                onClick={close}
                className="btn-primary w-full justify-center py-3 text-base"
              >
                Zur Kasse →
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="btn-primary w-full justify-center py-3 text-base opacity-50 cursor-not-allowed"
              >
                Zur Kasse →
              </button>
            )}
            <Link
              to="/cart"
              onClick={close}
              className="btn-outline w-full justify-center py-2.5 text-sm"
            >
              Warenkorb anzeigen
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
