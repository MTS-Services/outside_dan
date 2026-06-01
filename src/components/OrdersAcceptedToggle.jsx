import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useSiteSettings } from '../store/siteSettings';

export default function OrdersAcceptedToggle({ className = '' }) {
  const loadSiteSettings = useSiteSettings((s) => s.load);
  const ordersAccepted = useSiteSettings((s) => s.ordersAccepted);
  const [checked, setChecked] = useState(ordersAccepted);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSiteSettings();
  }, [loadSiteSettings]);

  useEffect(() => {
    setChecked(ordersAccepted !== false);
  }, [ordersAccepted]);

  async function toggle(e) {
    const next = e.target.checked;
    setChecked(next);
    setSaving(true);
    try {
      await api.patch('/site-settings/orders-accepted', { orders_accepted: next });
      await loadSiteSettings();
      toast.success(next ? 'Bestellungen aktiviert' : 'Bestellungen pausiert');
    } catch {
      setChecked(!next);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`card p-6 space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-brand-400">Online-Bestellungen</h2>
          <p className="text-sm text-white/50 mt-1">
            Lieferung und Abholung für Kunden ein- oder ausschalten.
          </p>
        </div>
        <span className={`chip text-xs ${checked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
          {checked ? 'Aktiv' : 'Pausiert'}
        </span>
      </div>
      <label className={`flex items-start gap-4 p-4 rounded-xl border transition cursor-pointer ${
        checked ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'
      } ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={toggle}
          disabled={saving}
          className="mt-1 w-5 h-5 accent-brand-500 shrink-0"
        />
        <div>
          <span className="font-semibold text-white block">
            {checked ? 'Bestellungen werden angenommen' : 'Bestellungen pausiert'}
          </span>
          <span className="text-sm text-white/50 mt-1 block">
            {checked
              ? 'Kunden können bestellen und zur Kasse gehen.'
              : 'Kunden sehen: „Wir nehmen derzeit keine Bestellungen entgegen.“'}
          </span>
        </div>
      </label>
    </div>
  );
}
