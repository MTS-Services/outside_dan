import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../store/auth';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  pushSupported,
} from '../api/push';
import Icon from '../components/Icon';

const STATUS_META = {
  PENDING_PAYMENT:  { label: 'Zahlung ausstehend',     color: 'bg-yellow-500',   text: 'text-yellow-300' },
  PENDING:          { label: 'Wartet auf Bestätigung', color: 'bg-orange-500',   text: 'text-orange-300' },
  ACCEPTED:         { label: 'Akzeptiert',             color: 'bg-emerald-500',  text: 'text-emerald-300'},
  DECLINED:         { label: 'Abgelehnt',              color: 'bg-red-500',      text: 'text-red-300'    },
};

export default function MyOrders() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/orders/mine/list')
      .then((r) => setOrders(r.data))
      .catch((e) => toast.error(e.displayMessage || 'Bestellungen konnten nicht geladen werden'))
      .finally(() => setLoading(false));
    isPushSubscribed().then(setPushOn);
  }, [token]);

  if (!token) return <Navigate to="/login?next=/account" replace />;

  async function togglePush() {
    try {
      if (pushOn) {
        await unsubscribeFromPush();
        toast('Push-Benachrichtigungen deaktiviert');
        setPushOn(false);
      } else {
        await subscribeToPush();
        toast.success('Push-Benachrichtigungen aktiviert');
        setPushOn(true);
      }
    } catch (e) {
      toast.error(e.message || 'Aktion fehlgeschlagen');
    }
  }

  function onLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl">MEIN DASHBOARD</h1>
          <p className="text-white/60 mt-1">Willkommen, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {pushSupported() && (
            <button onClick={togglePush} className={pushOn ? 'btn-outline' : 'btn-primary'}>
              <Icon name="bolt" className="w-4 h-4" />
              {pushOn ? 'Push deaktivieren' : 'Push-Benachrichtigungen aktivieren'}
            </button>
          )}
          <button onClick={onLogout} className="btn-ghost">Abmelden</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-white/40 py-20">Bestellungen werden geladen…</div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-white/70 mb-6">Du hast noch keine Bestellungen aufgegeben.</p>
          <Link to="/menu" className="btn-primary">Zur Speisekarte</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const meta = STATUS_META[o.status] || STATUS_META.PENDING;
            return (
              <Link key={o.id} to={`/order/${o.id}`}
                className="card p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-brand-500/30 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
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
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">€ {Number(o.total).toFixed(2)}</div>
                  <div className="text-xs text-white/50">{o.paymentMethod}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
