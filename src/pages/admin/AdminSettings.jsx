import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

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
};

export default function AdminSettings() {
  const [form, setForm] = useState(DEFAULT);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/site-settings').then((r) => {
      const data = r.data || {};
      setForm((f) => ({
        ...f,
        ...Object.fromEntries(
          Object.entries(data)
            .filter(([k]) => k !== 'opening_hours')
            .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])
        ),
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
  }, []);

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

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/site-settings', { ...form, opening_hours: hours });
      toast.success('Einstellungen gespeichert');
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

