import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

export default function AdminCustomers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.get('/admin/customers').then((r) => setRows(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function toggleBlock(u) {
    setBusyId(u.id);
    try {
      await api.put(`/admin/customers/${u.id}/block`, { blocked: !u.blocked });
      toast.success(u.blocked ? 'Freigegeben' : 'Gesperrt');
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [r.name, r.email, r.phone].some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Kunden ({rows.length})</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen…" className="input h-10 w-full sm:w-64" />
      </div>
      {loading ? <Spin /> : filtered.length === 0 ? (
        <div className="card p-10 text-center text-white/50">Keine Treffer</div>
      ) : (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
          {filtered.map((u) => (
            <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white/10 grid place-items-center font-bold text-white/70 shrink-0">
                  {u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {u.name}
                    {u.blocked && <span className="chip bg-red-500/80 text-white">Gesperrt</span>}
                  </div>
                  <div className="text-xs text-white/50 truncate">{u.email}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{u._count?.orders ?? 0} Bestellung{(u._count?.orders ?? 0) !== 1 ? 'en' : ''}</div>
                </div>
              </div>
              <div className="flex gap-2 sm:ml-auto">
                <button
                  onClick={() => navigate(`/admin/customers/${u.id}`)}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition"
                >Ansehen</button>
                <button disabled={busyId === u.id} onClick={() => toggleBlock(u)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${u.blocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {u.blocked ? 'Freigeben' : 'Sperren'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spin() { return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />; }
