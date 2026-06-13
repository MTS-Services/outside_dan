import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

function fmtDate(d) {
  return new Date(d).toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminMessages() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/contact');
      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      toast.error('Nachrichten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openMessage(id) {
    try {
      const { data } = await api.get(`/contact/${id}`);
      setSelected(data);
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
      setUnreadCount((c) => Math.max(0, c - (items.find((m) => m.id === id && !m.isRead) ? 1 : 0)));
    } catch {
      toast.error('Nachricht konnte nicht geladen werden');
    }
  }

  async function toggleRead(id, isRead) {
    try {
      await api.patch(`/contact/${id}/read`, { isRead });
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, isRead } : m)));
      if (selected?.id === id) setSelected((s) => ({ ...s, isRead }));
      setUnreadCount((c) => isRead ? Math.max(0, c - 1) : c + 1);
    } catch {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  }

  async function deleteMessage(id) {
    if (!window.confirm('Nachricht wirklich löschen?')) return;
    try {
      await api.delete(`/contact/${id}`);
      setItems((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success('Nachricht gelöscht');
      load();
    } catch {
      toast.error('Löschen fehlgeschlagen');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-white">Kontaktnachrichten</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alle Nachrichten gelesen'}
          </p>
        </div>
        <button type="button" onClick={load} className="btn-outline text-sm py-2 px-4">Aktualisieren</button>
      </div>

      <div className="flex-1 grid lg:grid-cols-[340px_1fr] gap-4 min-h-0">
        <div className="card overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-3 border-b border-white/5 text-xs uppercase tracking-widest text-white/40">
            Posteingang ({items.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-white/40 text-sm text-center">Noch keine Nachrichten</p>
            ) : (
              items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openMessage(m.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 transition hover:bg-white/5 ${
                    selected?.id === m.id ? 'bg-brand-500/10 border-l-2 border-l-brand-500' : ''
                  } ${!m.isRead ? 'bg-white/[0.02]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm truncate ${!m.isRead ? 'font-semibold text-white' : 'text-white/70'}`}>
                      {m.name}
                    </span>
                    {!m.isRead && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />}
                  </div>
                  <div className="text-xs text-white/40 truncate mt-0.5">{m.subject || 'Ohne Betreff'}</div>
                  <div className="text-[11px] text-white/30 mt-1">{fmtDate(m.createdAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="card p-6 min-h-[400px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-white/40 text-sm">
              Wähle eine Nachricht aus der Liste
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selected.name}</h2>
                  <p className="text-sm text-white/50 mt-1">{fmtDate(selected.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRead(selected.id, !selected.isRead)}
                    className="btn-outline text-xs py-1.5 px-3"
                  >
                    {selected.isRead ? 'Als ungelesen' : 'Als gelesen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMessage(selected.id)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Löschen
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-white/40 text-xs mb-1">E-Mail</div>
                  <a href={`mailto:${selected.email}`} className="text-brand-400 hover:underline">{selected.email}</a>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-white/40 text-xs mb-1">Telefon</div>
                  <div className="text-white/80">{selected.phone || '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 sm:col-span-2">
                  <div className="text-white/40 text-xs mb-1">Betreff</div>
                  <div className="text-white/80">{selected.subject || '—'}</div>
                </div>
              </div>

              <div>
                <div className="text-white/40 text-xs mb-2">Nachricht</div>
                <div className="p-4 rounded-xl bg-white/5 text-white/85 whitespace-pre-wrap leading-relaxed">
                  {selected.message}
                </div>
              </div>

              <a
                href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Ihre Nachricht an Tarantella')}`}
                className="btn-primary inline-flex text-sm py-2 px-4"
              >
                Antworten per E-Mail
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
