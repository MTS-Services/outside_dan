import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const TABS = [
  { id: 'items',      label: 'Produkte' },
  { id: 'categories', label: 'Kategorien' },
  { id: 'tags',       label: 'Tags' },
  { id: 'extras',     label: 'Extras' },
];

export default function AdminMenu() {
  const [tab, setTab] = useState('items');
  return (
    <div className="p-4 sm:p-6">
      <div className="flex gap-1 sm:gap-2 mb-6 border-b border-white/5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 ${
              tab === t.id ? 'text-brand-400 border-brand-500' : 'text-white/50 border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'items' && <ItemsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'tags' && <TagsTab />}
      {tab === 'extras' && <ExtrasTab />}
    </div>
  );
}

function Spin() { return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />; }

/* ── ITEMS ─────────────────────────────────────────── */
function ItemsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {item}
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');
  const imgSrc = (url) => url?.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;

  const load = () => {
    setLoading(true);
    api.get('/menu/admin/items').then((r) => setRows(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function toggle(it) {
    setBusyId(it.id);
    try {
      await api.put(`/menu/admin/items/${it.id}/availability`, { isAvailable: !it.isAvailable });
      toast.success(it.isAvailable ? 'Deaktiviert' : 'Aktiviert');
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }
  async function remove(it) {
    if (!window.confirm(`"${it.name}" löschen?`)) return;
    setBusyId(it.id);
    try { await api.delete(`/menu/admin/items/${it.id}`); toast.success('Gelöscht'); load(); }
    catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="font-display text-xl sm:text-2xl">Produkte ({rows.length})</h2>
        <button onClick={() => setEditing({})} className="btn-primary">+ Neues Produkt</button>
      </div>
      <input
        type="text"
        placeholder="Artikel suchen..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input w-full sm:w-72"
      />
      {loading ? (
        <div className="flex justify-center items-center py-20"><Spin /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.filter((it) => it.name.toLowerCase().includes(search.toLowerCase())).map((it) => (
            <div key={it.id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
              <div className="aspect-[4/3] bg-ink-800 relative">
                {it.imageUrl ? <img src={imgSrc(it.imageUrl)} alt={it.name} className="w-full h-full object-cover" /> : null}
                <span className={`absolute top-2 left-2 chip ${it.isAvailable ? 'bg-emerald-500/80' : 'bg-red-500/80'}`}>
                  {it.isAvailable ? 'Aktiv' : 'Deaktiviert'}
                </span>

              </div>
              <div className="p-3">
                <div className="font-display tracking-wide text-lg truncate">{it.name}</div>
                <div className="text-xs text-white/50">{it.category?.name} • € {Number(it.price).toFixed(2)}</div>
                <div className="flex gap-1.5 mt-3">
                  <button onClick={() => setEditing(it)} className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold">Bearbeiten</button>
                  <button disabled={busyId === it.id} onClick={() => toggle(it)} className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold disabled:opacity-40">{it.isAvailable ? 'Deaktivieren' : 'Aktivieren'}</button>
                  <button disabled={busyId === it.id} onClick={() => remove(it)} className="px-2 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold disabled:opacity-40">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing !== null && <ItemEditor item={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ItemEditor({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    categoryId: item?.categoryId || '',
    imageUrl: item?.imageUrl || '',
    isAvailable: item?.isAvailable ?? true,
    isOnline: item?.isOnline ?? true,
    isVegetarian: item?.isVegetarian || false,
    isSpicy: item?.isSpicy || false,
    vatId: item?.vatId || '',
    tagIds: (item?.tags || []).map((t) => (t.tag?.id || t.tagId || t.id)),
    extraIds: (item?.extras || []).map((e) => (e.extra?.id || e.extraId || e.id)),
  });
  const [cats, setCats] = useState([]);
  const [tags, setTags] = useState([]);
  const [extras, setExtras] = useState([]);
  const [vatRates, setVatRates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlModal, setUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const imgSrc = (url) => url?.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;

  useEffect(() => {
    Promise.all([
      api.get('/menu/admin/categories').then((r) => setCats(r.data)),
      api.get('/menu/admin/tags').then((r) => setTags(r.data)),
      api.get('/menu/admin/extras').then((r) => setExtras(r.data)),
      api.get('/r2o/vat-rates').then((r) => setVatRates(r.data)).catch(() => {}),
    ]);
  }, []);

  async function uploadFile(file) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/menu/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, imageUrl: data.url }));
      toast.success('Bild hochgeladen');
    } catch (e) { toast.error(e.displayMessage || 'Upload fehlgeschlagen'); }
    finally { setUploading(false); }
  }

  async function confirmUrlUpload() {
    if (!urlInput.trim()) return;
    setUrlModal(false);
    setUploading(true);
    try {
      const { data } = await api.post('/menu/admin/upload-url', { url: urlInput.trim() });
      setForm((f) => ({ ...f, imageUrl: data.url }));
      toast.success('Bild gespeichert');
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setUploading(false); setUrlInput(''); }
  }

  function onDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      if (item) await api.put(`/menu/admin/items/${item.id}`, payload);
      else      await api.post('/menu/admin/items', payload);
      toast.success(item ? 'Produkt aktualisiert' : 'Produkt erstellt');
      onSaved();
    } catch (err) { toast.error(err.displayMessage || 'Speichern fehlgeschlagen'); }
    finally { setSaving(false); }
  }

  const toggleId = (key, id) => setForm((f) => ({
    ...f,
    [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
  }));

  const selectedTags = tags.filter((t) => form.tagIds.includes(t.id));
  const selectedExtras = extras.filter((e) => form.extraIds.includes(e.id));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur p-4 overflow-y-auto">
      <form onSubmit={save} className="w-full max-w-2xl bg-ink-900 border border-white/10 rounded-2xl p-6 space-y-4 my-8">
        <h3 className="font-display text-2xl">{item ? 'Produkt bearbeiten' : 'Neues Produkt'}</h3>

        {/* Image drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-xl border-2 border-dashed border-white/15 hover:border-brand-500/50 p-4 transition"
        >
          {form.imageUrl ? (
            <img src={imgSrc(form.imageUrl)} alt="" className="w-full max-h-48 object-cover rounded-lg" />
          ) : (
            <div className="text-center py-8 text-white/40 text-sm">Bild hierher ziehen oder unten auswählen</div>
          )}
          <div className="flex gap-2 mt-3">
            <label className="flex-1 btn-outline justify-center cursor-pointer">
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
              {uploading ? <Spin /> : 'Datei wählen'}
            </label>
            <button type="button" onClick={() => setUrlModal(true)} className="flex-1 btn-outline justify-center">Von URL laden</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Name *"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Preis (€) *"><input className="input" type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
        </div>
        <Field label="Beschreibung"><textarea rows="2" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Kategorie *">
          <select className="input" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Kategorie wählen</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        {vatRates.length > 0 && (
          <Field label="MwSt.-Satz (R2O)">
            <select className="input" value={form.vatId} onChange={(e) => setForm({ ...form, vatId: e.target.value })}>
              <option value="">Standard (automatisch)</option>
              {vatRates.map((v) => (
                <option key={v.vat_id || v.id} value={String(v.vat_id || v.id)}>
                  {v.vat_name || v.name || `VAT ${v.vat_id || v.id}`} – {v.vat_value ?? v.value}%
                </option>
              ))}
            </select>
          </Field>
        )}

        {/* Only Active checkbox */}
        <Check label="Aktiv" checked={form.isAvailable} onChange={(v) => setForm({ ...form, isAvailable: v })} />

        {/* Tags dropdown */}
        <div>
          <span className="label">Tags</span>
          <select
            className="input"
            value=""
            onChange={(e) => { if (e.target.value) toggleId('tagIds', e.target.value); }}
          >
            <option value="">Tag hinzufügen…</option>
            {tags.filter((t) => !form.tagIds.includes(t.id)).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTags.map((t) => (
                <span key={t.id} className="chip border border-brand-500/40 bg-brand-500/20 text-brand-300">
                  {t.name}
                  <button type="button" onClick={() => toggleId('tagIds', t.id)} className="outline-none focus:outline-none hover:text-white transition-colors leading-none">✕</button>
                </span>
              ))}
            </div>
          )}
          {tags.length === 0 && <p className="text-white/40 text-xs mt-1">Keine Tags – im Tags-Tab erstellen</p>}
        </div>

        {/* Extras dropdown */}
        <div>
          <span className="label">Extras</span>
          <select
            className="input"
            value=""
            onChange={(e) => { if (e.target.value) toggleId('extraIds', e.target.value); }}
          >
            <option value="">Extra hinzufügen…</option>
            {extras.filter((e) => !form.extraIds.includes(e.id)).map((e) => (
              <option key={e.id} value={e.id}>{e.name} (+€{Number(e.price).toFixed(2)})</option>
            ))}
          </select>
          {selectedExtras.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedExtras.map((e) => (
                <span key={e.id} className="chip border border-brand-500/40 bg-brand-500/20 text-brand-300">
                  {e.name} (+€{Number(e.price).toFixed(2)})
                  <button type="button" onClick={() => toggleId('extraIds', e.id)} className="outline-none focus:outline-none hover:text-white transition-colors leading-none">✕</button>
                </span>
              ))}
            </div>
          )}
          {extras.length === 0 && <p className="text-white/40 text-xs mt-1">Keine Extras</p>}
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
          <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spin /> : 'Speichern'}</button>
        </div>
      </form>

      {/* URL modal */}
      {urlModal && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-ink-800 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <p className="font-semibold text-white">Bild-URL einfügen</p>
            <input
              autoFocus
              className="input"
              placeholder="https://…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), confirmUrlUpload())}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setUrlModal(false); setUrlInput(''); }} className="btn-ghost flex-1 justify-center">Abbrechen</button>
              <button type="button" onClick={confirmUrlUpload} className="btn-primary flex-1 justify-center">Laden</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label>; }
function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-brand-500" />
      {label}
    </label>
  );
}

/* ── CATEGORIES ───────────────────────────────────── */
function CategoriesTab() {
  return <CrudList endpoint="/menu/admin/categories" title="Kategorien" autoSlug fields={[
    { key: 'name', label: 'Name', required: true },
  ]} />;
}

/* ── TAGS ─────────────────────────────────────────── */
function TagsTab() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} | tag obj
  const [confirmTag, setConfirmTag] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const imgSrc = (url) => url?.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;

  const load = () => {
    setLoading(true);
    api.get('/menu/admin/tags').then((r) => setTags(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function save(form, id) {
    try {
      const slug = form.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const body = { name: form.name, slug, imageUrl: form.imageUrl || null };
      if (id) await api.put(`/menu/admin/tags/${id}`, body);
      else    await api.post('/menu/admin/tags', body);
      toast.success(id ? 'Aktualisiert' : 'Erstellt');
      setEditing(null);
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
  }

  async function confirmDelete() {
    const t = confirmTag;
    setConfirmTag(null);
    setBusyId(t.id);
    try { await api.delete(`/menu/admin/tags/${t.id}`); toast.success('Gelöscht'); load(); }
    catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl">Tags ({tags.length})</h2>
        <button onClick={() => setEditing({})} className="btn-primary">+ Tag hinzufügen</button>
      </div>
      {loading ? <Spin /> : (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
          {tags.length === 0 ? <div className="p-6 text-white/40 text-center text-sm">Keine Tags</div> :
            tags.map((t) => (
              <div key={t.id} className="p-3 flex items-center gap-3">
                {/* 64×64 image */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-ink-700 shrink-0 flex items-center justify-center">
                  {t.imageUrl ? (
                    <img src={imgSrc(t.imageUrl)} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/20 text-xs">–</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{t.name}</div>
                  <div className="text-xs text-white/40">{t.slug}</div>
                </div>
                <button onClick={() => setEditing(t)} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-semibold">Bearbeiten</button>
                <button disabled={busyId === t.id} onClick={() => setConfirmTag(t)} className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold disabled:opacity-40">✕</button>
              </div>
            ))}
        </div>
      )}

      {/* Edit/Create modal */}
      {editing !== null && (
        <TagEditor tag={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={save} />
      )}

      {/* Delete confirm */}
      {confirmTag && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-ink-800 border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
              </div>
              <div>
                <p className="font-semibold text-white">Tag löschen</p>
                <p className="text-sm text-white/50 mt-0.5">„<span className="text-white/80">{confirmTag.name}</span>" wird dauerhaft gelöscht.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmTag(null)} className="btn-ghost flex-1 justify-center">Abbrechen</button>
              <button onClick={confirmDelete} className="btn-danger flex-1 justify-center">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TagEditor({ tag, onClose, onSave }) {
  const [name, setName] = useState(tag?.name || '');
  const [imageUrl, setImageUrl] = useState(tag?.imageUrl || '');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);
  const fileRef = useRef(null);

  const imgSrc = (url) => url?.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;

  function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (tag?.id) {
      // Editing existing tag — upload immediately
      setUploading(true);
      const fd = new FormData();
      fd.append('image', file);
      api.post(`/menu/admin/tags/${tag.id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(({ data }) => { setImageUrl(data.imageUrl); toast.success('Bild hochgeladen'); })
        .catch(() => toast.error('Upload fehlgeschlagen'))
        .finally(() => { setUploading(false); e.target.value = ''; });
    } else {
      // New tag — stage file locally, show preview
      setPendingFile(file);
      setLocalPreview(URL.createObjectURL(file));
      setImageUrl('');
      e.target.value = '';
    }
  }

  async function fetchUrl() {
    if (!urlInput.trim()) return;
    setImageUrl(urlInput.trim());
    setPendingFile(null);
    setLocalPreview(null);
    setUrlInput('');
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (!tag?.id && pendingFile) {
        // Create tag first, then upload image
        const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const { data: created } = await api.post('/menu/admin/tags', { name, slug, imageUrl: null });
        const fd = new FormData();
        fd.append('image', pendingFile);
        const { data: uploaded } = await api.post(`/menu/admin/tags/${created.id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Erstellt');
        await onSave({ name, imageUrl: uploaded.imageUrl }, created.id);
      } else {
        await onSave({ name, imageUrl: imageUrl || null }, tag?.id);
      }
    } catch (err) { toast.error(err.displayMessage || 'Fehler'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-ink-800 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
        <h3 className="font-display text-2xl">{tag ? 'Tag bearbeiten' : 'Neuer Tag'}</h3>

        {/* Name */}
        <label className="block">
          <span className="label">Name *</span>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Bestseller" />
        </label>

        {/* Image preview */}
        <div className="space-y-2">
          <span className="label">Bild (64×64)</span>
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-ink-700 shrink-0 flex items-center justify-center border border-white/10">
              {(imageUrl || localPreview) ? (
                <>
                  <img src={localPreview || imgSrc(imageUrl)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageUrl(''); setPendingFile(null); setLocalPreview(null); }}
                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition flex items-center justify-center text-white text-lg font-bold"
                    title="Bild entfernen"
                  >✕</button>
                </>
              ) : (
                <span className="text-white/20 text-xs">Kein</span>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full py-1.5 rounded-xl bg-white/8 hover:bg-white/14 text-white/70 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-40">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                {uploading ? 'Wird hochgeladen…' : 'Datei hochladen'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadFile} />
            </div>
          </div>
          {/* URL input */}
          <div className="flex gap-2">
            <input
              className="input text-xs py-2 flex-1"
              placeholder="Oder Bild-URL einfügen…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchUrl())}
            />
            <button type="button" onClick={fetchUrl} className="px-3 py-2 rounded-xl bg-brand-500/20 text-brand-300 text-xs font-medium hover:bg-brand-500/30 transition">OK</button>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
          <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spin /> : 'Speichern'}</button>
        </div>
      </form>
    </div>
  );
}

/* ── EXTRAS ───────────────────────────────────────── */
function ExtrasTab() {
  return <CrudList endpoint="/menu/admin/extras" title="Extras" fields={[
    { key: 'name', label: 'Name', required: true },
    { key: 'price', label: 'Preis (€)', type: 'number', required: true, step: '0.01' },
  ]} />;
}

function CrudList({ endpoint, title, fields, autoSlug }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const load = () => {
    setLoading(true);
    api.get(endpoint).then((r) => setRows(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, [endpoint]);

  async function save(form, id) {
    try {
      const body = {};
      fields.forEach((f) => {
        if (f.type === 'number') body[f.key] = form[f.key] === '' ? undefined : Number(form[f.key]);
        else if (f.type === 'checkbox') body[f.key] = !!form[f.key];
        else body[f.key] = form[f.key] || undefined;
      });
      if (autoSlug && form.name) body.slug = form.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (id) await api.put(`${endpoint}/${id}`, body);
      else    await api.post(endpoint, body);
      toast.success(id ? 'Aktualisiert' : 'Erstellt');
      setEditing(null);
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
  }
  async function remove(r) {
    setConfirmRow(r);
  }
  async function confirmDelete() {
    const r = confirmRow;
    setConfirmRow(null);
    setBusyId(r.id);
    try { await api.delete(`${endpoint}/${r.id}`); toast.success('Gelöscht'); load(); }
    catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl">{title} ({rows.length})</h2>
        <button onClick={() => setEditing({})} className="btn-primary">+ Hinzufügen</button>
      </div>
      {loading ? <Spin /> : (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
          {rows.length === 0 ? <div className="p-6 text-white/40 text-center text-sm">Keine Einträge</div> :
            rows.map((r) => (
              <div key={r.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.icon ? `${r.icon} ` : ''}{r.name}</div>
                  <div className="text-xs text-white/50 truncate">
                    {fields.filter((f) => f.key !== 'name' && r[f.key] != null && r[f.key] !== '' && r[f.key] !== false).map((f) => `${f.label}: ${r[f.key]}`).join(' • ')}
                  </div>
                </div>
                <button onClick={() => setEditing(r)} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-semibold">Bearbeiten</button>
                <button disabled={busyId === r.id} onClick={() => remove(r)} className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold disabled:opacity-40">✕</button>
              </div>
            ))}
        </div>
      )}
      {editing && <SimpleEditor row={editing.id ? editing : null} fields={fields} title={title} onClose={() => setEditing(null)} onSave={save} />}
      {confirmRow && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-ink-800 border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
              </div>
              <div>
                <p className="font-semibold text-white">Eintrag löschen</p>
                <p className="text-sm text-white/50 mt-0.5">"<span className="text-white/80">{confirmRow.name}</span>" wird dauerhaft gelöscht.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRow(null)} className="btn-ghost flex-1 justify-center">Abbrechen</button>
              <button onClick={confirmDelete} className="btn-danger flex-1 justify-center">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleEditor({ row, fields, title, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    const f = {};
    fields.forEach((fld) => { f[fld.key] = row?.[fld.key] ?? (fld.type === 'checkbox' ? true : ''); });
    return f;
  });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form, row?.id);
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-ink-900 border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="font-display text-2xl">{row ? `${title || ''} bearbeiten` : `${title || ''} hinzufügen`}</h3>
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="label">{f.label}{f.required ? ' *' : ''}</span>
            {f.type === 'checkbox' ? (
              <div className="pt-1"><input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} className="w-5 h-5 accent-brand-500" /></div>
            ) : (
              <input
                className="input"
                type={f.type || 'text'}
                step={f.step}
                placeholder={f.placeholder}
                required={f.required}
                value={form[f.key] ?? ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
          <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spin /> : 'Speichern'}</button>
        </div>
      </form>
    </div>
  );
}

/* ── COUPONS ──────────────────────────────────────── */
function CouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

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
    if (!window.confirm(`Gutschein "${c.code}" löschen?`)) return;
    setBusyId(c.id);
    try { await api.delete(`/coupons/${c.id}`); toast.success('Gelöscht'); load(); }
    catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl">Gutscheine ({coupons.length})</h2>
        <button onClick={() => setEditing({})} className="btn-primary">+ Gutschein</button>
      </div>
      {loading ? <div className="flex justify-center py-20"><Spin /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
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
                <tr><td colSpan={8} className="px-4 py-10 text-center text-white/40">Keine Gutscheine</td></tr>
              ) : coupons.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 font-mono font-semibold text-brand-300">{c.code}</td>
                  <td className="px-4 py-3">
                    <span className={`chip text-xs ${c.type === 'PERCENT' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {c.type === 'PERCENT' ? '%' : '€ FEST'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.type === 'PERCENT' ? `${Number(c.value)}%` : `€${Number(c.value).toFixed(2)}`}</td>
                  <td className="px-4 py-3">{Number(c.minOrder) > 0 ? `€${Number(c.minOrder).toFixed(2)}` : '–'}</td>
                  <td className="px-4 py-3 text-white/60">{c.validUntil ? new Date(c.validUntil).toLocaleDateString('de-AT') : '–'}</td>
                  <td className="px-4 py-3 text-white/60">{c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busyId === c.id}
                      onClick={() => toggleActive(c)}
                      className={`w-10 h-5 rounded-full transition-colors relative disabled:opacity-40 ${c.isActive ? 'bg-brand-500' : 'bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
      )}
      {editing !== null && (
        <CouponEditor
          coupon={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur p-4 overflow-y-auto">
      <form onSubmit={submit} className="w-full max-w-lg bg-ink-900 border border-white/10 rounded-2xl p-6 space-y-4 my-8">
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
    </div>
  );
}
