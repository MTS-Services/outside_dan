import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';

const STATUS_META = {
  PENDING:          { label: 'Wartet auf Bestätigung', color: 'bg-yellow-500',   text: 'text-yellow-300' },
  ACCEPTED:         { label: 'Akzeptiert',             color: 'bg-blue-500',     text: 'text-blue-300'   },
  PREPARING:        { label: 'In der Küche',           color: 'bg-purple-500',   text: 'text-purple-300' },
  READY:            { label: 'Bereit',                 color: 'bg-pink-500',     text: 'text-pink-300'   },
  OUT_FOR_DELIVERY: { label: 'Unterwegs',              color: 'bg-cyan-500',     text: 'text-cyan-300'   },
  DELIVERED:        { label: 'Geliefert',              color: 'bg-emerald-500',  text: 'text-emerald-300'},
  DECLINED:         { label: 'Abgelehnt',              color: 'bg-red-500',      text: 'text-red-300'    },
  CANCELLED:        { label: 'Storniert',              color: 'bg-gray-500',     text: 'text-gray-300'   },
  PENDING_PAYMENT:  { label: 'Zahlung ausstehend',     color: 'bg-orange-500',   text: 'text-orange-300' },
};

export default function MyOrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/mine/list')
      .then((r) => setOrders(r.data))
      .catch((e) => toast.error(e.displayMessage || 'Bestellungen konnten nicht geladen werden'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-white/40 py-20">Bestellungen werden geladen…</div>;
  if (orders.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-white/70 mb-6">Du hast noch keine Bestellungen aufgegeben.</p>
        <Link to="/menu" className="btn-primary">Zur Speisekarte</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const meta = STATUS_META[o.status] || STATUS_META.PENDING;
        return (
          <Link key={o.id} to={`/order/${o.id}`}
            className="card p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-brand-500/30 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-display text-lg tracking-wider">{o.orderNumber}</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${meta.text} bg-white/5`}>
                  <span className={`w-2 h-2 rounded-full ${meta.color}`} />
                  {meta.label}
                </span>
              </div>
              <div className="text-sm text-white/60">
                {new Date(o.createdAt).toLocaleString('de-AT')} • {o.items.length} Artikel
              </div>
              {o.declinedReason && (
                <div className="text-sm text-red-300/80 mt-1">Grund: {o.declinedReason}</div>
              )}
              {o.acceptanceNote && (
                <div className="text-sm text-emerald-300/80 mt-1">Hinweis: {o.acceptanceNote}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">€ {Number(o.total).toFixed(2)}</div>
              <div className="text-xs text-white/50">{o.paymentMethod}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
