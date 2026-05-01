import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

export default function AdminSubadmins() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/admin/subadmins').then((r) => setRows(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function toggleBlocked(u) {
    setBusyId(u.id + '_block');
    try {
      const updated = await api.patch(`/admin/subadmins/${u.id}`, { blocked: !u.blocked });
      setRows((prev) => prev.map((r) => r.id === u.id ? { ...r, blocked: updated.data.blocked } : r));
      toast.success(updated.data.blocked ? 'Deaktiviert' : 'Aktiviert');
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  async function remove(u) {
    if (!window.confirm(`Subadmin "${u.name}" löschen?`)) return;
    setBusyId(u.id);
    try { await api.delete(`/admin/subadmins/${u.id}`); toast.success('Gelöscht'); load(); }
    catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl">Subadmins ({rows.length})</h1>
        <button onClick={() => setCreating(true)} className="btn-primary">+ Neuer Subadmin</button>
      </div>
      {loading ? <Spin /> : rows.length === 0 ? (
        <div className="card p-10 text-center text-white/50">Noch keine Subadmins</div>
      ) : (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
          {rows.map((u) => (
            <div key={u.id} className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full grid place-items-center font-bold shrink-0 ${u.blocked ? 'bg-white/10 text-white/30' : 'bg-brand-500/30 text-brand-200'}`}>
                {u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate ${u.blocked ? 'text-white/40' : ''}`}>{u.name}</div>
                <div className="text-xs text-white/50 truncate">
                  {u.email}{u.phone ? ` • ${u.phone}` : ''}
                </div>
              </div>
              {/* Active / Inactive toggle */}
              <button
                disabled={busyId === u.id + '_block'}
                onClick={() => toggleBlocked(u)}
                title={u.blocked ? 'Aktivieren' : 'Deaktivieren'}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${u.blocked ? 'bg-white/10' : 'bg-brand-500'} disabled:opacity-40`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${u.blocked ? 'translate-x-1' : 'translate-x-6'}`} />
              </button>
              <span className={`text-xs font-medium w-16 text-center ${u.blocked ? 'text-white/30' : 'text-brand-400'}`}>
                {u.blocked ? 'Inaktiv' : 'Aktiv'}
              </span>
              {/* Edit */}
              <button
                onClick={() => setEditing(u)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition"
              >Bearbeiten</button>
              {/* Delete */}
              <button disabled={busyId === u.id} onClick={() => remove(u)} className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold disabled:opacity-40">Löschen</button>
            </div>
          ))}
        </div>
      )}
      {creating && <CreateModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {editing && <EditModal user={editing} onClose={() => setEditing(null)} onSaved={(updated) => { setRows((prev) => prev.map((r) => r.id === updated.id ? updated : r)); setEditing(null); }} />}
    </div>
  );
}

import PasswordInput from '../../components/PasswordInput';

function Spin() { return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />; }

function CreateModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', phoneCountry: 'AT', password: '' });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/subadmins', form);
      toast.success('Subadmin erstellt');
      onSaved();
    } catch (err) { toast.error(err.displayMessage || 'Fehler'); }
    finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-ink-900 border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="font-display text-2xl">Neuer Subadmin</h3>
        <label className="block"><span className="label">Name</span><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block"><span className="label">E-Mail</span><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block"><span className="label">Telefon</span><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label className="block"><span className="label">Passwort (mind. 6 Zeichen)</span><PasswordInput required minLength={6} className="input w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
          <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spin /> : 'Erstellen'}</button>
        </div>
      </form>
    </div>
  );
}

function EditModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch(`/admin/subadmins/${user.id}`, form);
      toast.success('Gespeichert');
      onSaved(res.data);
    } catch (err) { toast.error(err.displayMessage || 'Fehler'); }
    finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-ink-900 border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="font-display text-2xl">Subadmin bearbeiten</h3>
        <label className="block"><span className="label">Name</span><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block"><span className="label">E-Mail</span><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block"><span className="label">Telefon</span><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
          <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spin /> : 'Speichern'}</button>
        </div>
      </form>
    </div>
  );
}
