import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import RichTextEditor from '../../components/RichTextEditor';
import { hasHtmlContent } from '../../utils/html';

function Spin() { return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />; }

function AdminModal({ children, onBackdropClick }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (window.__lenis) window.__lenis.stop();
    return () => {
      document.body.style.overflow = prev;
      if (window.__lenis) window.__lenis.start();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" data-lenis-prevent>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onBackdropClick} aria-hidden="true" />
      <div className="relative z-10 min-h-full overflow-y-auto overscroll-contain pointer-events-none">
        <div className="flex min-h-full items-start justify-center p-4 sm:p-6 py-8 pointer-events-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function AdminLegalPages() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/legal-pages/admin/all').then((r) => setRows(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function save(form, id) {
    try {
      const body = {
        slug: slugify(form.slug || form.title),
        title: form.title.trim(),
        content: hasHtmlContent(form.content) ? form.content : '',
        sortOrder: Number(form.sortOrder) || 0,
        isActive: !!form.isActive,
      };
      if (id) await api.put(`/legal-pages/admin/${id}`, body);
      else await api.post('/legal-pages/admin', body);
      toast.success(id ? 'Seite aktualisiert' : 'Seite erstellt');
      setEditing(null);
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler beim Speichern'); }
  }

  async function confirmDelete() {
    const row = confirmRow;
    setConfirmRow(null);
    setBusyId(row.id);
    try {
      await api.delete(`/legal-pages/admin/${row.id}`);
      toast.success('Gelöscht');
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl">Rechtliche Seiten ({rows.length})</h2>
          <p className="text-sm text-white/45 mt-1">Impressum, Datenschutz, AGB – erscheinen im Footer der Website.</p>
        </div>
        <button onClick={() => setEditing({})} className="btn-primary">+ Neue Seite</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spin /></div>
      ) : (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">Noch keine Seiten vorhanden.</div>
          ) : rows.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <span className="w-9 h-9 rounded-lg bg-brand-500/15 text-brand-400 text-sm font-bold grid place-items-center shrink-0 tabular-nums">
                {r.sortOrder ?? 0}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.title}</div>
                <div className="text-xs text-white/45 truncate">/{r.slug} · {r.isActive ? 'Aktiv' : 'Inaktiv'}</div>
              </div>
              <a
                href={`/${r.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition"
              >
                Ansehen
              </a>
              <button
                onClick={() => setEditing(r)}
                className="px-3 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
              >
                Bearbeiten
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => setConfirmRow(r)}
                className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold disabled:opacity-40 transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <LegalPageEditor page={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={save} />
      )}

      {confirmRow && (
        <AdminModal onBackdropClick={() => setConfirmRow(null)}>
          <div className="w-full max-w-sm bg-ink-800 border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div>
              <p className="font-semibold text-white">Seite löschen</p>
              <p className="text-sm text-white/50 mt-1">„{confirmRow.title}" wird dauerhaft gelöscht.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRow(null)} className="btn-ghost flex-1 justify-center">Abbrechen</button>
              <button onClick={confirmDelete} className="btn-danger flex-1 justify-center">Löschen</button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

function LegalPageEditor({ page, onClose, onSave }) {
  const [form, setForm] = useState({
    title: page?.title || '',
    slug: page?.slug || '',
    content: page?.content || '',
    sortOrder: page?.sortOrder ?? 0,
    isActive: page?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form, page?.id);
    setSaving(false);
  }

  return (
    <AdminModal onBackdropClick={onClose}>
      <form onSubmit={submit} className="relative z-10 w-full max-w-2xl overflow-visible bg-ink-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
        <h3 className="font-display text-2xl">{page ? 'Seite bearbeiten' : 'Neue Seite'}</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Titel *</span>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value, slug: page ? form.slug : slugify(e.target.value) })}
              placeholder="z.B. Impressum"
            />
          </label>
          <label className="block">
            <span className="label">Reihenfolge (1, 2, 3…)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </label>
        </div>

        <label className="block">
          <span className="label">URL-Slug *</span>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">/</span>
            <input
              className="input flex-1"
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              placeholder="impressum"
            />
          </div>
        </label>

        <label className="block">
          <span className="label">Inhalt</span>
          <RichTextEditor
            key={page?.id ?? 'new'}
            value={form.content}
            onChange={(content) => setForm({ ...form, content })}
            placeholder="Seiteninhalt…"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 accent-brand-500"
          />
          Aktiv (im Footer sichtbar)
        </label>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
          <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spin /> : 'Speichern'}</button>
        </div>
      </form>
    </AdminModal>
  );
}
