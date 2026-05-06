import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

function Spin() {
  return (
    <svg className="animate-spin h-5 w-5 text-white/60" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function AdminDeliveryZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, obj = edit
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/delivery-zones').then((r) => setZones(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function toggleActive(z) {
    setBusyId(z.id);
    try {
      await api.put(`/delivery-zones/${z.id}`, { ...z, isActive: !z.isActive });
      setZones((prev) => prev.map((x) => x.id === z.id ? { ...x, isActive: !x.isActive } : x));
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  async function remove(z) {
    if (!window.confirm(`Zone "${z.postalCode}" löschen?`)) return;
    setBusyId(z.id);
    try {
      await api.delete(`/delivery-zones/${z.id}`);
      toast.success('Gelöscht');
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Lieferzonen</h1>
          <p className="text-white/50 text-sm mt-1">Postleitzahlen mit Liefergebühr und Mindestbestellung verwalten.</p>
        </div>
        <button onClick={() => setEditing({})} className="btn-primary shrink-0">+ Zone hinzufügen</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spin /></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-white/50 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Postleitzahl</th>
                  <th className="px-5 py-3 text-left font-medium">Bezeichnung</th>
                  <th className="px-5 py-3 text-left font-medium">Liefergebühr (€)</th>
                  <th className="px-5 py-3 text-left font-medium">Mindestbestellung (€)</th>
                  <th className="px-5 py-3 text-left font-medium">Aktiv</th>
                  <th className="px-5 py-3 text-left font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {zones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-white/40">
                      Keine Lieferzonen definiert. Klicke auf „+ Zone hinzufügen" um zu starten.
                    </td>
                  </tr>
                ) : zones.map((z) => (
                  <tr key={z.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-3 font-mono font-semibold text-white">{z.postalCode}</td>
                    <td className="px-5 py-3 text-white/70">{z.label || <span className="text-white/30">–</span>}</td>
                    <td className="px-5 py-3">€ {Number(z.deliveryFee).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      {Number(z.minimumOrder) > 0 ? `€ ${Number(z.minimumOrder).toFixed(2)}` : <span className="text-white/30">–</span>}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        disabled={busyId === z.id}
                        onClick={() => toggleActive(z)}
                        title={z.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        className={`w-10 h-5 rounded-full transition-colors relative overflow-hidden disabled:opacity-40 ${z.isActive ? 'bg-brand-500' : 'bg-white/15'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${z.isActive ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(z)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold transition">Bearbeiten</button>
                        <button
                          disabled={busyId === z.id}
                          onClick={() => remove(z)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-semibold transition disabled:opacity-40"
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {zones.length === 0 ? (
              <div className="rounded-2xl border border-white/5 p-8 text-center text-white/40">
                Keine Lieferzonen. Klicke auf „+ Zone hinzufügen".
              </div>
            ) : zones.map((z) => (
              <div key={z.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-white text-lg">{z.postalCode}</span>
                    {z.label && <span className="ml-2 text-white/50 text-sm">{z.label}</span>}
                  </div>
                  <button
                    disabled={busyId === z.id}
                    onClick={() => toggleActive(z)}
                    className={`w-10 h-5 rounded-full transition-colors relative overflow-hidden shrink-0 disabled:opacity-40 ${z.isActive ? 'bg-brand-500' : 'bg-white/15'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${z.isActive ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-white/40 text-xs">Liefergebühr</div>
                    <div className="font-semibold">€ {Number(z.deliveryFee).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs">Mindestbestellung</div>
                    <div>{Number(z.minimumOrder) > 0 ? `€ ${Number(z.minimumOrder).toFixed(2)}` : '–'}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditing(z)} className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-center transition">Bearbeiten</button>
                  <button
                    disabled={busyId === z.id}
                    onClick={() => remove(z)}
                    className="flex-1 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-semibold disabled:opacity-40 text-center transition"
                  >Löschen</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing !== null && (
        <ZoneEditor
          zone={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ZoneEditor({ zone, onClose, onSaved }) {
  const [form, setForm] = useState({
    postalCode: zone?.postalCode || '',
    label: zone?.label || '',
    deliveryFee: zone?.deliveryFee != null ? String(zone.deliveryFee) : '',
    minimumOrder: zone?.minimumOrder != null ? String(zone.minimumOrder) : '0',
    isActive: zone?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        postalCode: form.postalCode.trim(),
        label: form.label.trim() || null,
        deliveryFee: Number(form.deliveryFee),
        minimumOrder: Number(form.minimumOrder) || 0,
        isActive: form.isActive,
      };
      if (zone) await api.put(`/delivery-zones/${zone.id}`, payload);
      else      await api.post('/delivery-zones', payload);
      toast.success(zone ? 'Zone aktualisiert' : 'Zone erstellt');
      onSaved();
    } catch (err) { toast.error(err.displayMessage || 'Fehler'); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-[#111318] border border-white/10 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-2xl">{zone ? 'Zone bearbeiten' : 'Neue Lieferzone'}</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Postleitzahl *</span>
            <input
              className="input font-mono"
              required
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              placeholder="z.B. 1010"
            />
          </label>
          <label className="block">
            <span className="label">Bezeichnung</span>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="z.B. Wien 1. Bezirk"
            />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Liefergebühr (€) *</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.deliveryFee}
              onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
              placeholder="z.B. 2.50"
            />
          </label>
          <label className="block">
            <span className="label">Mindestbestellung (€)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.minimumOrder}
              onChange={(e) => setForm({ ...form, minimumOrder: e.target.value })}
              placeholder="0"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 accent-brand-500"
          />
          Zone aktiv (für Bestellungen verfügbar)
        </label>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
          <button disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <Spin /> : 'Speichern'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
