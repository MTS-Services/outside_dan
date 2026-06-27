import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import { useSiteSettings } from '../../store/siteSettings';
import OrdersAcceptedToggle from '../../components/OrdersAcceptedToggle';

const DEFAULT_HOURS = [
  { day: 'Montag',     times: ['12:00 – 14:30', '17:00 – 22:00'], closed: false },
  { day: 'Dienstag',   times: ['12:00 – 14:30', '17:00 – 22:00'], closed: false },
  { day: 'Mittwoch',   times: [], closed: true },
  { day: 'Donnerstag', times: ['12:00 – 14:30', '12:00 – 22:00'], closed: false },
  { day: 'Freitag',    times: ['08:00 – 22:00'], closed: false },
  { day: 'Samstag',    times: ['08:00 – 22:00'], closed: false },
  { day: 'Sonntag',    times: ['12:00 – 22:00'], closed: false },
];

const DEFAULT = {
  restaurant_address: '',
  restaurant_phone: '',
  restaurant_email: '',
  restaurant_facebook: '',
  restaurant_instagram: '',
  maps_url: '',
  max_delivery_minutes: '45',
  orders_accepted: true,
  news_banner_enabled: false,
  news_banner_text: '',
};

const BOOL_KEYS = ['orders_accepted', 'news_banner_enabled'];

export default function AdminSettings() {
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'SUBADMIN' || user?.role === 'STAFF';
  const loadSiteSettings = useSiteSettings((s) => s.load);
  const [form, setForm] = useState(DEFAULT);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return undefined;
    api.get('/site-settings').then((r) => {
      const data = r.data || {};
      setForm((f) => ({
        ...f,
        ...Object.fromEntries(
          Object.entries(data)
            .filter(([k]) => k !== 'opening_hours' && !BOOL_KEYS.includes(k))
            .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])
        ),
        orders_accepted: data.orders_accepted !== false && data.orders_accepted !== 'false',
        news_banner_enabled: data.news_banner_enabled === true || data.news_banner_enabled === 'true',
        news_banner_text: String(data.news_banner_text || ''),
      }));
      if (data.opening_hours) {
        try {
          const h = Array.isArray(data.opening_hours)
            ? data.opening_hours
            : JSON.parse(data.opening_hours);
          // Normalize old { time } format to { times }
          setHours(h.map((r) => ({
            ...r,
            times: Array.isArray(r.times) ? r.times : (r.time ? [r.time] : []),
          })));
        } catch { /* keep default */ }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin && isStaff) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <h1 className="font-display text-2xl sm:text-3xl mb-2">Einstellungen</h1>
        <p className="text-sm text-white/50 mb-6">Online-Bestellungen für Kunden ein- oder ausschalten.</p>
        <OrdersAcceptedToggle />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function updateHour(i, field, val) {
    setHours((h) => h.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function addHour() {
    setHours((h) => [...h, { day: '', times: [''], closed: false }]);
  }
  function removeHour(i) {
    setHours((h) => h.filter((_, idx) => idx !== i));
  }

  const setBool = (k) => async (e) => {
    const checked = e.target.checked;
    setForm((f) => ({ ...f, [k]: checked }));
    try {
      const payload = { [k]: checked };
      if (k === 'news_banner_enabled') {
        payload.news_banner_text = form.news_banner_text || '';
      }
      await api.put('/site-settings', payload);
      await loadSiteSettings();
      if (k === 'orders_accepted') {
        toast.success(checked ? 'Bestellungen aktiviert und gespeichert' : 'Bestellungen pausiert und gespeichert');
      } else if (k === 'news_banner_enabled') {
        toast.success(checked ? 'News-Banner aktiviert' : 'News-Banner deaktiviert');
      }
    } catch {
      setForm((f) => ({ ...f, [k]: !checked }));
      toast.error('Fehler beim Speichern in der Datenbank');
    }
  };

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { orders_accepted: _ignored, ...rest } = form;
      await api.put('/site-settings', {
        ...rest,
        max_delivery_minutes: String(Math.max(5, Math.min(180, parseInt(form.max_delivery_minutes, 10) || 45))),
        opening_hours: hours,
        news_banner_enabled: !!form.news_banner_enabled,
        news_banner_text: form.news_banner_text || '',
      });
      await loadSiteSettings();
      toast.success('Einstellungen in der Datenbank gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-white/50">Laden…</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl sm:text-3xl mb-6">Einstellungen</h1>
      <form onSubmit={save} className="space-y-6">

        {/* Orders */}
        <OrdersAcceptedToggle />

        {/* News banner */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-brand-400">News-Banner (Startseite)</h2>
          <p className="text-sm text-white/50">
            Lauftext oben auf der Startseite — z. B. Feiertagsschließung, Party, Pizza-Special.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.news_banner_enabled}
              onChange={setBool('news_banner_enabled')}
              className="w-5 h-5 accent-brand-500"
            />
            <span className="text-sm text-white/80">Banner auf der Startseite anzeigen</span>
          </label>
          <label className="block">
            <span className="label">Banner-Text</span>
            <textarea
              className="input min-h-[88px] resize-y"
              value={form.news_banner_text}
              onChange={set('news_banner_text')}
              onBlur={async () => {
                if (!form.news_banner_enabled) return;
                try {
                  await api.put('/site-settings', { news_banner_text: form.news_banner_text || '' });
                  await loadSiteSettings();
                } catch {
                  toast.error('Banner-Text konnte nicht gespeichert werden');
                }
              }}
              placeholder={'z. B. Am 24.12. geschlossen — frohe Feiertage!\nPizza-Special: 2 für 1 jeden Freitag'}
              disabled={!form.news_banner_enabled}
            />
            <p className="text-xs text-white/40 mt-1">Mehrere Zeilen werden mit — verbunden. Text wird beim Verlassen des Feldes gespeichert.</p>
          </label>
        </div>

        {/* Contact info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-brand-400">Kontaktdaten</h2>
          <label className="block">
            <span className="label">Adresse</span>
            <input className="input" value={form.restaurant_address} onChange={set('restaurant_address')} placeholder="Musterstraße 1, 1010 Wien" />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Telefon</span>
              <input className="input" value={form.restaurant_phone} onChange={set('restaurant_phone')} placeholder="+43 1 234 5678" />
            </label>
            <label className="block">
              <span className="label">E-Mail</span>
              <input className="input" type="email" value={form.restaurant_email} onChange={set('restaurant_email')} placeholder="hello@example.com" />
            </label>
          </div>
          <label className="block">
            <span className="label">Google Maps URL</span>
            <input className="input" value={form.maps_url} onChange={set('maps_url')} placeholder="https://maps.google.com/?q=..." />
          </label>
        </div>

        {/* Delivery limits */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-brand-400">Lieferung</h2>
          <p className="text-sm text-white/50">
            Steuert die maximale Fahrzeit vom Restaurant zur Kundenadresse — sichtbar in der Kasse und in der Bestellübersicht.
          </p>
          <label className="block">
            <span className="label">Max. Fahrzeit (Minuten)</span>
            <input
              className="input max-w-xs"
              type="number"
              min="5"
              max="180"
              step="1"
              required
              value={form.max_delivery_minutes}
              onChange={set('max_delivery_minutes')}
              placeholder="45"
            />
            <p className="text-xs text-white/40 mt-1">
              Beispiel: Bei <strong className="text-white/60">20</strong> Min. wird eine Adresse mit 21 Min. Fahrzeit in der Kasse als außerhalb des Liefergebiets markiert und kann nicht bestellt werden.
            </p>
          </label>
        </div>

        {/* Social media */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-brand-400">Social Media</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Facebook URL</span>
              <input className="input" value={form.restaurant_facebook} onChange={set('restaurant_facebook')} placeholder="https://facebook.com/..." />
            </label>
            <label className="block">
              <span className="label">Instagram URL</span>
              <input className="input" value={form.restaurant_instagram} onChange={set('restaurant_instagram')} placeholder="https://instagram.com/..." />
            </label>
          </div>
        </div>

        {/* Opening hours */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-brand-400">Öffnungszeiten</h2>
          <div className="space-y-2">
            {hours.map((h, i) => (
              <div key={i} className="flex flex-col sm:grid sm:grid-cols-[140px_1fr_auto_auto] items-start gap-2">
                <input
                  className="input w-full"
                  value={h.day}
                  onChange={(e) => updateHour(i, 'day', e.target.value)}
                  placeholder="Montag"
                />
                <textarea
                  className={`input text-sm resize-none leading-relaxed w-full ${h.closed ? 'opacity-30' : ''}`}
                  rows={Math.max(1, (h.times || []).filter(Boolean).length || 1)}
                  value={(h.times || []).join('\n')}
                  onChange={(e) => updateHour(i, 'times', e.target.value.split('\n'))}
                  placeholder="11:00 – 22:00"
                  disabled={h.closed}
                />
                <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-0">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-white/40 sm:justify-center">
                    <input
                      type="checkbox"
                      checked={!!h.closed}
                      onChange={(e) => updateHour(i, 'closed', e.target.checked)}
                      className="w-4 h-4 accent-brand-500"
                    />
                    <span className="sm:hidden">Geschlossen</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeHour(i)}
                    className="text-white/25 hover:text-red-400 transition sm:mt-1"
                    aria-label="Entfernen"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addHour}
            className="text-sm text-brand-400 hover:text-brand-300 transition flex items-center gap-1.5 mt-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
            Zeile hinzufügen
          </button>
        </div>

        <div className="flex justify-center">
        <button type="submit" disabled={saving} className="btn-primary px-8 py-3">
          {saving ? 'Speichern…' : 'Einstellungen speichern'}
        </button>
        </div>
      </form>
    </div>
  );
}

