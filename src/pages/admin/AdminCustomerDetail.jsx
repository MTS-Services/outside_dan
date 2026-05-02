import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { COUNTRIES } from '../../data/countries';
import FlagIcon from '../../components/FlagIcon';

const STATUS_LABEL = {
  PENDING_PAYMENT: 'Zahlung ausstehend',
  PENDING: 'Ausstehend',
  ACCEPTED: 'Akzeptiert',
  DECLINED: 'Abgelehnt',
};

const STATUS_COLOR = {
  PENDING_PAYMENT: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  PENDING: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  ACCEPTED: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  DECLINED: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

const PAYMENT_LABEL = { CASH: 'Bar', CARD: 'Karte', PAYPAL: 'PayPal' };

function getDialInfo(code) {
  return COUNTRIES.find((c) => c.code === code) || null;
}
function formatPhone(phone, country) {
  if (!phone) return '—';
  const info = country ? getDialInfo(country) : null;
  if (info) return (
    <span className="inline-flex items-center gap-1.5">
      <FlagIcon code={info.code} className="w-5 h-4 shrink-0" />
      <span className="text-white/50">{info.dial}</span>
      <span>{phone}</span>
    </span>
  );
  return phone;
}
function imgSrc(url) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;
}

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/customers'),
      api.get('/orders', { params: { userId: id, pageSize: 200 } }),
    ]).then(([cusRes, ordRes]) => {
      const found = cusRes.data.find((c) => c.id === id);
      setCustomer(found || null);
      const data = ordRes.data;
      setOrders(Array.isArray(data) ? data : data.items ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <span className="inline-block w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!customer) return (
    <div className="p-6 text-center text-white/50">Kunde nicht gefunden.</div>
  );

  const accepted = orders.filter(o => o.status === 'ACCEPTED');
  const totalSpent = accepted.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const initials = customer.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate('/admin/customers')}
        className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
      >
        ← Zurück zu Kunden
      </button>

      {/* Profile card */}
      <div className="card p-6 space-y-5">
        {/* Top row: avatar + name + status badge */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full grid place-items-center font-bold text-2xl shrink-0
            ${customer.blocked ? 'bg-red-500/20 text-red-300' : 'bg-brand-500/30 text-brand-200'}`}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl leading-tight">{customer.name}</h1>
              {customer.blocked
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Gesperrt</span>
                : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Aktiv</span>
              }
            </div>
            <div className="text-xs text-white/40 mt-0.5">Kundenprofil</div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label="E-Mail" value={customer.email} />
          <InfoRow label="Telefon" value={formatPhone(customer.phone, customer.phoneCountry)} />
          <InfoRow label="Registriert am" value={new Date(customer.createdAt).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })} />
          <InfoRow label="Kunden-ID" value={<span className="font-mono text-xs text-white/40">{customer.id}</span>} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <StatBox label="Bestellungen gesamt" value={orders.length} />
          <StatBox label="Abgeschlossen" value={accepted.length} accent="text-emerald-400" />
          <StatBox label="Ausgegeben" value={`€${totalSpent.toFixed(2)}`} accent="text-emerald-400" />
        </div>
      </div>

      {/* Orders section */}
      <div>
        <h2 className="font-display text-lg mb-3 text-white/80">
          Alle Bestellungen
          <span className="ml-2 text-sm text-white/40 font-normal">({orders.length})</span>
        </h2>
        {orders.length === 0 ? (
          <div className="card p-10 text-center text-white/30">Noch keine Bestellungen vorhanden</div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 bg-white/5 rounded-xl px-4 py-3">
      <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-white font-medium">{value || '—'}</span>
    </div>
  );
}

function StatBox({ label, value, accent }) {
  return (
    <div className="bg-white/5 rounded-xl px-4 py-3 text-center">
      <div className={`text-xl font-bold ${accent || ''}`}>{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
    </div>
  );
}

function OrderCard({ order: o }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.03] transition select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm">{o.orderNumber}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status] || 'bg-white/10 text-white/60'}`}>
              {STATUS_LABEL[o.status] || o.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <span className="text-xs text-white/40">
              <span className="text-white/25 mr-1">Datum</span>
              {new Date(o.createdAt).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            {o.street && (
              <span className="text-xs text-white/40">
                <span className="text-white/25 mr-1">Adresse</span>
                {o.street}{o.city ? `, ${o.postalCode} ${o.city}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-lg">€{Number(o.total).toFixed(2)}</div>
          <div className="text-xs text-white/40">{PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod}</div>
        </div>
        <span className="text-white/25 text-xs ml-1">{open ? '▲' : '▼'}</span>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-white/5">
          {/* Product rows */}
          <div className="divide-y divide-white/5">
            {o.items?.map((item) => {
              const image = imgSrc(item.menuItem?.imageUrl);
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                  {image ? (
                    <img
                      src={image}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 bg-white/5"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/5 grid place-items-center text-white/20 text-2xl shrink-0">🍽</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{item.name}</div>
                    {item.extras?.length > 0 && (
                      <div className="text-xs text-white/40 mt-0.5">
                        <span className="text-white/25">Extras: </span>
                        {item.extras.map((e) => e.name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-brand-300/70 mt-0.5">
                        <span className="text-white/25">Notiz: </span>{item.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="text-sm font-semibold">€{Number(item.price).toFixed(2)}</div>
                    <div className="text-xs text-white/40">× {item.quantity}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-end justify-between flex-wrap gap-3">
            <div className="space-y-1 text-xs text-white/50">
              {o.notes && (
                <div>
                  <span className="text-white/25 uppercase tracking-wide text-[10px] mr-1">Bestellnotiz</span>
                  {o.notes}
                </div>
              )}
              {o.acceptanceNote && (
                <div className="text-emerald-400/80">
                  <span className="text-white/25 uppercase tracking-wide text-[10px] mr-1">Annahmenotiz</span>
                  {o.acceptanceNote}
                </div>
              )}
              {o.declinedReason && (
                <div className="text-red-400/80">
                  <span className="text-white/25 uppercase tracking-wide text-[10px] mr-1">Ablehnungsgrund</span>
                  {o.declinedReason}
                </div>
              )}
              {o.acceptedBy && (
                <div>
                  <span className="text-white/25 uppercase tracking-wide text-[10px] mr-1">Bearbeitet von</span>
                  {o.acceptedBy.name}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/25 uppercase tracking-wide">Gesamtbetrag</div>
              <div className="text-xl font-bold">€{Number(o.total).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
