import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import {
  useSiteSettings,
  normalizeDeliverySchedule,
  DAY_LABELS_DE,
} from '../store/siteSettings';

/**
 * Weekly delivery time windows editor.
 * Sits directly under the orders on/off toggle — visible to admin + subadmin.
 */
export default function DeliveryScheduleCard({ className = '' }) {
  const loadSiteSettings = useSiteSettings((s) => s.load);
  const storeEnabled = useSiteSettings((s) => s.deliveryScheduleEnabled);
  const storeSchedule = useSiteSettings((s) => s.deliverySchedule);

  const [enabled, setEnabled] = useState(storeEnabled);
  const [schedule, setSchedule] = useState(storeSchedule);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setEnabled(storeEnabled);
    setSchedule(normalizeDeliverySchedule(storeSchedule));
  }, [storeEnabled, storeSchedule, dirty]);

  function updateDay(dayIdx, patch) {
    setDirty(true);
    setSchedule((sch) => sch.map((d, i) => (i === dayIdx ? { ...d, ...patch } : d)));
  }

  function updateWindow(dayIdx, winIdx, field, value) {
    setDirty(true);
    setSchedule((sch) => sch.map((d, i) => {
      if (i !== dayIdx) return d;
      const windows = d.windows.map((w, j) => (j === winIdx ? { ...w, [field]: value } : w));
      return { ...d, windows };
    }));
  }

  function addWindow(dayIdx) {
    setDirty(true);
    setSchedule((sch) => sch.map((d, i) => (
      i === dayIdx
        ? { ...d, enabled: true, windows: [...d.windows, { from: '12:00', to: '14:00' }] }
        : d
    )));
  }

  function removeWindow(dayIdx, winIdx) {
    setDirty(true);
    setSchedule((sch) => sch.map((d, i) => {
      if (i !== dayIdx) return d;
      const windows = d.windows.filter((_, j) => j !== winIdx);
      return { ...d, windows, enabled: windows.length > 0 ? d.enabled : false };
    }));
  }

  async function save() {
    for (const d of schedule) {
      if (!d.enabled) continue;
      for (const w of d.windows) {
        if (!w.from || !w.to) {
          toast.error(`Bitte gültige Zeiten für ${DAY_LABELS_DE[d.day]} eingeben`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      await api.patch('/site-settings/delivery-schedule', {
        enabled,
        schedule: schedule.map((d) => ({
          day: d.day,
          enabled: d.enabled,
          windows: d.windows,
        })),
      });
      await loadSiteSettings();
      setDirty(false);
      toast.success('Lieferzeiten gespeichert');
    } catch (e) {
      toast.error(e.displayMessage || 'Fehler beim Speichern der Lieferzeiten');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`card p-6 space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-brand-400">Lieferzeiten</h2>
          <p className="text-sm text-white/50 mt-1">
            Bestellungen nur zu bestimmten Zeiten erlauben — z. B. Mo, Di & Do von 12:00 bis 14:00.
            Außerhalb dieser Zeiten können Kunden nicht bestellen.
          </p>
        </div>
        <span className={`chip text-xs ${enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
          {enabled ? 'Aktiv' : 'Deaktiviert'}
        </span>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={!!enabled}
          onChange={(e) => { setDirty(true); setEnabled(e.target.checked); }}
          className="w-5 h-5 accent-brand-500"
        />
        <span className="text-sm text-white/80">Lieferzeiten aktivieren (Zeitplan unten gilt)</span>
      </label>

      <div className={`space-y-2 ${enabled ? '' : 'opacity-40 pointer-events-none'}`}>
        {schedule.map((d, dayIdx) => (
          <div key={d.day} className="rounded-xl border border-white/10 p-3 sm:flex sm:items-start sm:gap-4">
            <label className="flex items-center gap-2 cursor-pointer sm:w-36 shrink-0 pt-1">
              <input
                type="checkbox"
                checked={!!d.enabled}
                onChange={(e) => updateDay(dayIdx, { enabled: e.target.checked })}
                className="w-4 h-4 accent-brand-500"
              />
              <span className={`text-sm font-semibold ${d.enabled ? 'text-white' : 'text-white/40'}`}>
                {DAY_LABELS_DE[d.day]}
              </span>
            </label>

            <div className="flex-1 mt-2 sm:mt-0 space-y-2">
              {d.enabled && d.windows.length === 0 && (
                <p className="text-xs text-amber-400/80 pt-1.5">Keine Zeitfenster — an diesem Tag ist keine Bestellung möglich.</p>
              )}
              {!d.enabled && (
                <p className="text-xs text-white/35 pt-1.5">Geschlossen</p>
              )}
              {d.enabled && d.windows.map((w, winIdx) => (
                <div key={winIdx} className="flex items-center gap-2">
                  <input
                    type="time"
                    className="input !w-auto text-sm"
                    value={w.from}
                    onChange={(e) => updateWindow(dayIdx, winIdx, 'from', e.target.value)}
                  />
                  <span className="text-white/40 text-sm">bis</span>
                  <input
                    type="time"
                    className="input !w-auto text-sm"
                    value={w.to}
                    onChange={(e) => updateWindow(dayIdx, winIdx, 'to', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeWindow(dayIdx, winIdx)}
                    className="text-white/25 hover:text-red-400 transition"
                    aria-label="Zeitfenster entfernen"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
              {d.enabled && (
                <button
                  type="button"
                  onClick={() => addWindow(dayIdx)}
                  className="text-xs text-brand-400 hover:text-brand-300 transition flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14"/></svg>
                  Zeitfenster hinzufügen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-white/40">
          Gilt zusätzlich zum Schalter „Online-Bestellungen“ oben.
        </p>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="btn-primary text-sm disabled:opacity-40"
        >
          {saving ? 'Speichern…' : 'Lieferzeiten speichern'}
        </button>
      </div>
    </div>
  );
}
