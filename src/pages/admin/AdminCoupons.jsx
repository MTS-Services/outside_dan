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

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // coupon to delete

  const load = () => {
    setLoading(true);
    api.get('/coupons').then((r) => setCoupons(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function toggleActive(c) {
    setBusyId(c.id);
    try {
      await api.put(`/coupons/${c.id}`, { ...c, isActive: !c.isActive });
      setCoupons((prev) => prev.map((x) => x.id === c.id ? { ...x, isActive: !x.isActive } : x));
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  async function remove(c) {
    setConfirmDelete(c);
  }

  async function confirmRemove() {
    const c = confirmDelete;
    setConfirmDelete(null);
    setBusyId(c.id);
    try { await api.delete(`/coupons/${c.id}`); toast.success('Gelöscht'); load(); }
    catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Gutscheine</h1>
          <p className="text-white/50 text-sm mt-1">Rabattcodes erstellen und verwalten.</p>
        </div>
        <button onClick={() => setEditing({})} className="btn-primary shrink-0">+ Gutschein</button>
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
                  {['Code', 'Typ', 'Wert', 'Min. Bestellung', 'Gültig bis', 'Nutzungen', 'Aktiv', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {coupons.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-white/40">Keine Gutscheine</td></tr>
                ) : coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono font-semibold text-brand-300">{c.code}</td>
                    <td className="px-4 py-3">
                      <span className={`chip text-xs ${c.type === 'PERCENT' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        {c.type === 'PERCENT' ? '% Prozent' : '€ Fest'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.type === 'PERCENT' ? `${Number(c.value)}%` : `€ ${Number(c.value).toFixed(2)}`}</td>
                    <td className="px-4 py-3">{Number(c.minOrder) > 0 ? `€ ${Number(c.minOrder).toFixed(2)}` : '–'}</td>
                    <td className="px-4 py-3 text-white/60">{c.validUntil ? new Date(c.validUntil).toLocaleDateString('de-AT') : '–'}</td>
                    <td className="px-4 py-3 text-white/60">{c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                    <td className="px-4 py-3">
                      <button
                        disabled={busyId === c.id}
                        onClick={() => toggleActive(c)}
                        className={`w-10 h-5 rounded-full transition-colors relative overflow-hidden disabled:opacity-40 ${c.isActive ? 'bg-brand-500' : 'bg-white/15'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.isActive ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(c)} className="px-2 py-1 rounded-lg bg-white/5 text-xs font-semibold">Bearbeiten</button>
                        <button disabled={busyId === c.id} onClick={() => remove(c)} className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold disabled:opacity-40">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {coupons.length === 0 ? (
              <div className="rounded-2xl border border-white/5 p-8 text-center text-white/40">Keine Gutscheine</div>
            ) : coupons.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-brand-300 text-lg">{c.code}</span>
                    <span className={`ml-2 chip text-xs ${c.type === 'PERCENT' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {c.type === 'PERCENT' ? '% Prozent' : '€ Fest'}
                    </span>
                  </div>
                  <button
                    disabled={busyId === c.id}
                    onClick={() => toggleActive(c)}
                    className={`w-10 h-5 rounded-full transition-colors relative overflow-hidden shrink-0 disabled:opacity-40 ${c.isActive ? 'bg-brand-500' : 'bg-white/15'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.isActive ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-white/40 text-xs">Wert</span><div className="font-semibold">{c.type === 'PERCENT' ? `${Number(c.value)}%` : `€ ${Number(c.value).toFixed(2)}`}</div></div>
                  <div><span className="text-white/40 text-xs">Min. Bestellung</span><div>{Number(c.minOrder) > 0 ? `€ ${Number(c.minOrder).toFixed(2)}` : '–'}</div></div>
                  <div><span className="text-white/40 text-xs">Gültig bis</span><div>{c.validUntil ? new Date(c.validUntil).toLocaleDateString('de-AT') : '–'}</div></div>
                  <div><span className="text-white/40 text-xs">Nutzungen</span><div>{c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</div></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditing(c)} className="flex-1 py-1.5 rounded-lg bg-white/5 text-xs font-semibold text-center">Bearbeiten</button>
                  <button disabled={busyId === c.id} onClick={() => remove(c)} className="flex-1 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold disabled:opacity-40 text-center">Löschen</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing !== null && (
        <CouponEditor
          coupon={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111318] border border-white/10 rounded-2xl p-6 space-y-5">
            <h3 className="font-display text-xl">Gutschein löschen?</h3>
            <p className="text-white/60 text-sm">
              Gutschein <span className="font-mono font-bold text-white">{confirmDelete.code}</span> wird unwiderruflich gelöscht.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-sm font-semibold hover:bg-white/10 transition"
              >Abbrechen</button>
              <button
                onClick={confirmRemove}
                className="flex-1 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold transition"
              >Löschen</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function CouponEditor({ coupon, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: coupon?.code || '',
    type: coupon?.type || 'FIXED',
    value: coupon?.value != null ? String(coupon.value) : '',
    minOrder: coupon?.minOrder != null ? String(coupon.minOrder) : '0',
    validFrom: coupon?.validFrom ? coupon.validFrom.split('T')[0] : '',
    validUntil: coupon?.validUntil ? coupon.validUntil.split('T')[0] : '',
    usageLimit: coupon?.usageLimit != null ? String(coupon.usageLimit) : '',
    isActive: coupon?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder) || 0,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        isActive: form.isActive,
      };
      if (coupon) await api.put(`/coupons/${coupon.id}`, payload);
      else        await api.post('/coupons', payload);
      toast.success(coupon ? 'Aktualisiert' : 'Gutschein erstellt');
      onSaved();
    } catch (err) { toast.error(err.displayMessage || 'Fehler'); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-lg bg-[#111318] border border-white/10 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-2xl">{coupon ? 'Gutschein bearbeiten' : 'Neuer Gutschein'}</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Code *</span>
            <input className="input font-mono uppercase" required value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="z.B. WELCOME10" />
          </label>
          <label className="block">
            <span className="label">Typ</span>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="FIXED">Fester Betrag (€)</option>
              <option value="PERCENT">Prozent (%)</option>
            </select>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Wert * {form.type === 'PERCENT' ? '(%)' : '(€)'}</span>
            <input className="input" type="number" min="0" step="0.01" required value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Mindestbestellung (€)</span>
            <input className="input" type="number" min="0" step="0.01" value={form.minOrder}
              onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Gültig ab</span>
            <input className="input" type="date" value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Gültig bis</span>
            <input className="input" type="date" value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </label>
        </div>

        <label className="block">
          <span className="label">Max. Nutzungen (leer = unbegrenzt)</span>
          <input className="input" type="number" min="1" step="1" value={form.usageLimit}
            onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            placeholder="Unbegrenzt" />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-brand-500" />
          Aktiv
        </label>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
          <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spin /> : 'Speichern'}</button>
        </div>
      </form>
    </div>,
    document.body
  );
}
