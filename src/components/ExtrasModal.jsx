import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import Icon from './Icon';

const imgSrc = (url) => url?.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;

/** Modal that lets the customer pick optional extras before adding an item to cart.
 *  Up to 10 optional extras (server enforced). All optional.
 *  onConfirm(selectedExtras: [{id,name,price}], qty: number)
 */
export default function ExtrasModal({ open, item, extras = [], onClose, onConfirm }) {
  const [picked, setPicked] = useState({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const tl = useRef(null);

  useEffect(() => {
    if (open) {
      setPicked({});
      setQty(1);
      setNotes('');
    }
  }, [open, item?.id]);

  useEffect(() => {
    if (!panelRef.current || !backdropRef.current) return;
    gsap.set(panelRef.current, { xPercent: -100 });
    gsap.set(backdropRef.current, { autoAlpha: 0 });
    tl.current = gsap.timeline({ paused: true })
      .to(backdropRef.current, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
      .to(panelRef.current, { xPercent: 0, duration: 0.5, ease: 'power3.inOut' }, '<');
    return () => tl.current?.kill();
  }, []);

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

  if (!item) return null;

  const unitPrice = Number(item.price || 0)
    + Object.values(picked).reduce((s, e) => s + (Number(e.price || 0) * e.qty), 0);
  const total = unitPrice * qty;

  const incrementExtra = (e) => {
    setPicked((p) => {
      const n = { ...p };
      if (!n[e.id]) n[e.id] = { ...e, qty: 1 };
      else n[e.id].qty += 1;
      return n;
    });
  };

  const decrementExtra = (e) => {
    setPicked((p) => {
      const n = { ...p };
      if (n[e.id]) {
        if (n[e.id].qty > 1) n[e.id].qty -= 1;
        else delete n[e.id];
      }
      return n;
    });
  };

  const confirm = () => {
    const selectedExtras = [];
    Object.values(picked).forEach((e) => {
      for (let i = 0; i < e.qty; i++) {
        selectedExtras.push(e);
      }
    });
    onConfirm(selectedExtras, qty, notes.trim());
    onClose();
  };

  const content = (
    <div className={`fixed inset-0 z-[80] overflow-hidden ${open ? '' : 'pointer-events-none'}`}>
      <div ref={backdropRef} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" style={{ visibility: 'hidden' }} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-label="Extras auswählen"
        className="absolute left-0 top-0 h-full w-[90%] sm:w-[400px] md:w-[450px] bg-ink-900 border-r border-white/10 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10 shrink-0">
          <div className="flex gap-4 min-w-0">
            {item.imageUrl && (
              <img src={imgSrc(item.imageUrl)} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-ink-800" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl tracking-wider truncate">{item.name}</h3>
              <p className="text-xs text-white/50 line-clamp-2 mt-1">{item.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center transition shrink-0"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {extras.length === 0 ? (
            <p className="text-center text-white/50 py-6 text-sm">Keine Extras für diesen Artikel verfügbar.</p>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Extras (optional)</p>
              <ul className="space-y-2">
                {extras.slice(0, 10).map((e) => {
                  const qtyCount = picked[e.id]?.qty || 0;
                  return (
                    <li key={e.id} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition ${
                      qtyCount > 0 ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/[0.03]'
                    }`}>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{e.name}</span>
                        <span className="text-xs font-bold text-brand-400">+ €{Number(e.price || 0).toFixed(2)}</span>
                      </div>
                      <div className="inline-flex items-center bg-ink-800 rounded-full border border-white/10 shrink-0">
                        <button type="button" onClick={() => decrementExtra(e)} className="w-8 h-8 grid place-items-center text-white/70 hover:text-white shrink-0">
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{qtyCount}</span>
                        <button type="button" onClick={() => incrementExtra(e)} className="w-8 h-8 grid place-items-center text-white/70 hover:text-white shrink-0">
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Note Option */}
          <div className="mt-6">
            <span className="text-sm text-white/60 mb-2 block">Anmerkungen / Sonderwünsche (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Keine Zwiebeln, extra scharf..."
              className="w-full bg-ink-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none transition-colors resize-none"
              rows={2}
            />
          </div>

          {/* Qty */}
          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-white/60">Menge</span>
            <div className="inline-flex items-center bg-ink-800 rounded-full border border-white/10">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 grid place-items-center text-white/70 hover:text-white">−</button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="w-9 h-9 grid place-items-center text-white/70 hover:text-white">+</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-ink-900 shrink-0">
          <button onClick={confirm} className="btn-primary w-full justify-center py-4 text-base">
            <span>In den Warenkorb</span>
            <span className="ml-auto font-bold">€{total.toFixed(2)}</span>
          </button>
        </div>
      </aside>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
