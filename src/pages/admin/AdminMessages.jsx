import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

function fmtDate(d) {
  return new Date(d).toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function replySubject(original) {
  const s = (original || 'Ihre Nachricht an Tarantella').trim();
  return s.toLowerCase().startsWith('re:') ? s : `Re: ${s}`;
}

function ReplyModal({ message, onClose, onSent }) {
  const [form, setForm] = useState({
    subject: replySubject(message?.subject),
    message: '',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (message) {
      setForm({ subject: replySubject(message.subject), message: '' });
    }
  }, [message]);

  if (!message) return null;

  async function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post(`/contact/${message.id}/reply`, form);
      toast.success(`E-Mail an ${message.email} gesendet`);
      onSent();
      onClose();
    } catch (err) {
      toast.error(err.displayMessage || 'E-Mail konnte nicht gesendet werden');
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <h3 className="font-display text-xl text-white">Antwort per E-Mail</h3>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none p-1">&times;</button>
        </header>

        <form onSubmit={onSubmit} className="p-5 space-y-4 overflow-y-auto">
          <label className="block">
            <span className="label">An</span>
            <input className="input w-full opacity-70" value={`${message.name} <${message.email}>`} readOnly />
          </label>
          <p className="text-xs text-white/40 -mt-2">Wird über die Restaurant-E-Mail (SMTP) gesendet</p>

          <label className="block">
            <span className="label">Betreff *</span>
            <input
              className="input w-full"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="label">Nachricht *</span>
            <textarea
              className="input w-full min-h-[160px]"
              required
              rows={8}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Ihre Antwort an den Kunden …"
            />
          </label>

          <div className="rounded-lg bg-white/5 p-3 text-xs text-white/45">
            <div className="text-white/60 mb-1">Ursprüngliche Nachricht:</div>
            <div className="whitespace-pre-wrap">{message.message}</div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-ghost" disabled={sending}>
              Abbrechen
            </button>
            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? 'Wird gesendet…' : 'E-Mail senden'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default function AdminMessages() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [replyOpen, setReplyOpen] = useState(false);
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
      setUnreadCount((c) => (isRead ? Math.max(0, c - 1) : c + 1));
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
        <button
          type="button"
          onClick={load}
          className="btn-outline text-sm py-2 px-4"
          title="Nachrichtenliste neu laden"
        >
          Neu laden
        </button>
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
                  <span className="text-brand-400">{selected.email}</span>
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

              <button
                type="button"
                onClick={() => setReplyOpen(true)}
                className="btn-primary inline-flex text-sm py-2 px-4"
              >
                Antworten per E-Mail
              </button>
            </div>
          )}
        </div>
      </div>

      {replyOpen && selected && (
        <ReplyModal
          message={selected}
          onClose={() => setReplyOpen(false)}
          onSent={() => {
            setSelected((s) => (s ? { ...s, isRead: true } : s));
            setItems((prev) => prev.map((m) => (m.id === selected.id ? { ...m, isRead: true } : m)));
          }}
        />
      )}
    </div>
  );
}
