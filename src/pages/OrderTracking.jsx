import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { getSocket } from '../api/socket';

const STEPS = ['PENDING', 'ACCEPTED'];
const LABELS = {
  PENDING_PAYMENT:   'Zahlung ausstehend',
  PENDING:           'Bestellung eingegangen',
  ACCEPTED:          'Vom Koch akzeptiert',
  DECLINED:          'Abgelehnt',
};

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => { setOrder(r.data); setLoading(false); }).catch(() => setLoading(false));
    const sock = getSocket();
    sock.emit('join:order', id);
    const handler = (data) => {
      // Only match this order ID from the socket
      if (data.id === id) {
        setOrder((o) => o ? { ...o, status: data.status, acceptanceNote: data.acceptanceNote ?? o.acceptanceNote, declinedReason: data.declinedReason ?? o.declinedReason } : o);
      }
    };
    sock.on('order:status', handler);
    return () => sock.off('order:status', handler);
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-white/50">Wird geladen…</div>;
  if (!order) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h2 className="text-3xl mb-4">Bestellung nicht gefunden</h2>
      <Link to="/" className="btn-primary">Zur Startseite</Link>
    </div>
  );

  const declined = order.status === 'DECLINED' || order.status === 'CANCELLED';
  const stepIndex = STEPS.indexOf(order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="text-center mb-10">
        <span className="chip bg-brand-500/20 text-brand-300 mb-4">Bestellung {order.orderNumber}</span>
        <h1 className="text-5xl mb-2">{declined ? 'ES TUT UNS LEID' : 'BESTELLUNG VERFOLGEN'}</h1>
        <p className="text-white/60">
          {declined
            ? 'Wir konnten Ihre Bestellung leider nicht annehmen. Details finden Sie unten.'
            : 'Live-Updates von unserer Küche bis zu Ihrer Tür.'}
        </p>
      </div>

      {declined && (
        <div className="space-y-4 mb-6">
          {/* Decline reason */}
          <div className="card p-5 border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 text-lg">✕</span>
              <span className="text-red-300 font-semibold text-sm uppercase tracking-wider">Ablehnungsgrund</span>
            </div>
            <p className="text-white/90 text-base leading-relaxed">
              {order.declinedReason || 'Kein Grund angegeben.'}
            </p>
          </div>

          {/* PayPal refund info */}
          {order.paymentMethod === 'PAYPAL' && (
            <div className="card p-5 border-yellow-500/30 bg-yellow-500/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💳</span>
                <span className="font-semibold text-sm uppercase tracking-wider text-yellow-300">
                  PayPal Rückerstattung
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Betrag</span>
                  <span className="text-white/90 font-bold">€ {Number(order.total).toFixed(2)}</span>
                </div>
                <p className="text-white/70 text-sm mt-2 pt-2 border-t border-white/10">
                  Ihr Geld wird innerhalb von <strong className="text-yellow-200">3–5 Werktagen</strong> auf Ihr PayPal-Konto zurücküberwiesen.
                </p>
              </div>
            </div>
          )}

          {/* Payment summary for non-PayPal */}
          {order.paymentMethod !== 'PAYPAL' && (
            <div className="card p-5 border-white/10 bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/50 text-sm uppercase tracking-wider font-semibold">Zahlung</span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/50">Methode</span>
                  <span className="text-white/80">{order.paymentMethod === 'CASH' ? 'Barzahlung' : 'Kartenzahlung bei Lieferung'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Status</span>
                  <span className="text-emerald-400">Keine Belastung — Bestellung abgelehnt</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {order.acceptanceNote && !declined && (
        <div className="card p-4 mb-6 border-emerald-500/30 bg-emerald-500/10">
          <div className="text-emerald-300 font-semibold text-sm">Hinweis vom Restaurant</div>
          <p className="text-white/80 mt-1">{order.acceptanceNote}</p>
        </div>
      )}

      {!declined && (
        <div className="card p-6 mb-6">
          <ol className="space-y-4">
            {STEPS.map((s, idx) => {
              const reached = idx <= stepIndex;
              const current = idx === stepIndex && stepIndex < STEPS.length - 1;
              return (
                <li key={s} className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full grid place-items-center font-bold
                    ${reached ? 'bg-brand-500 text-white shadow-glow' : 'bg-white/10 text-white/40'}
                    ${current ? 'ring-4 ring-brand-500/30 animate-pulse' : ''}`}>
                    {idx + 1}
                  </div>
                  <div className={`font-semibold ${reached ? 'text-white' : 'text-white/40'}`}>
                    {LABELS[s]}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="card p-6">
        <h3 className="text-2xl mb-4 font-display">Bestelldetails</h3>
        <ul className="divide-y divide-white/5 mb-6">
          {order.items.map((it) => {
            const itemTotal = Number(it.price) * it.quantity + (it.extras?.reduce((sum, ext) => sum + Number(ext.price) * ext.quantity, 0) || 0);
            const imageUrl = it.menuItem?.imageUrl;
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const imgSrc = imageUrl?.startsWith('/uploads/') ? `${baseUrl}${imageUrl}` : imageUrl;
            
            // Group identically named extras in case of multiple selections of the same extra
            const groupedExtras = {};
            it.extras?.forEach(e => {
              if (!groupedExtras[e.name]) groupedExtras[e.name] = { ...e, selectCount: 0 };
              groupedExtras[e.name].selectCount += 1;
            });
            const extrasList = Object.values(groupedExtras);

            return (
              <li key={it.id} className="py-4 flex gap-4">
                {imgSrc && (
                  <img src={imgSrc} alt={it.name} className="w-16 h-16 object-cover rounded-xl shrink-0 border border-white/10" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-lg">{it.quantity} × {it.name}</span>
                    <span className="font-bold">€ {(Number(it.price) * it.quantity).toFixed(2)}</span>
                  </div>
                  {extrasList.length > 0 && (
                    <div className="text-sm text-white/50 mt-2">
                      <span className="text-white/70 font-semibold mb-1 block">Extras:</span>
                      {extrasList.map(e => {
                        const extraQty = e.selectCount * it.quantity;
                        const extraTotal = Number(e.price) * extraQty;
                        return (
                          <div key={e.id} className="flex justify-between items-center ml-2 border-l border-white/10 pl-2 mb-1 text-white/70">
                            <span>+ {extraQty > 1 ? `${extraQty}× ` : ''}{e.name}</span>
                            <span>€ {Number(e.price).toFixed(2)} × {extraQty} = <strong className="text-white/90">€ {extraTotal.toFixed(2)}</strong></span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 font-semibold text-white/80">
                        <span>Artikel Gesamt</span>
                        <span className="text-brand-400">€ {itemTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {it.notes && (
                    <div className="text-sm text-yellow-500/80 mt-2 bg-yellow-500/10 p-2 rounded">
                      <span className="font-semibold">Anmerkung:</span> {it.notes}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="space-y-2 border-t border-white/10 pt-4">
          <div className="flex justify-between text-white/70"><span>Zwischensumme</span><span>€ {Number(order.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between text-white/70"><span>Lieferung</span><span>€ {Number(order.deliveryFee).toFixed(2)}</span></div>
          <div className="flex justify-between text-xl font-bold mt-4 pt-4 border-t border-white/10">
            <span>Gesamt</span>
            <span className="text-brand-500">€ {Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <Link to="/menu" className="btn-outline">Erneut bestellen</Link>
      </div>
    </div>
  );
}
