import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const TABS = [
  { id: 'home-cats', label: 'Lust auf was?' },
  { id: 'slider',    label: 'Startseiten-Slider' },
];

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
function imgSrc(url) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API}${url}` : url;
}

function Spin() {
  return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}

export default function AdminHomeCategories() {
  const [tab, setTab] = useState('home-cats');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-wide">Startseite verwalten</h1>
        <p className="text-white/40 text-sm mt-1">Steuere welche Inhalte auf der Startseite angezeigt werden.</p>
      </div>
      <div className="flex gap-2 mb-8 border-b border-white/5">
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
      {tab === 'home-cats' && <HomeCatsTab />}
      {tab === 'slider'    && <SliderTab />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 1 — "Lust auf was?" category cards
───────────────────────────────────────────────────────────── */
function HomeCatsTab() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(null);   // opens PickProductModal

  const load = useCallback(() => {
    setLoading(true);
    api.get('/menu/admin/categories').then((r) => setCats(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const homeCats  = cats.filter((c) => c.showOnHome).sort((a, b) => a.sortOrder - b.sortOrder);
  const otherCats = cats.filter((c) => !c.showOnHome);

  async function removeFromHome(cat) {
    try {
      await api.put(`/menu/admin/categories/${cat.id}`, {
        name: cat.name, slug: cat.slug,
        description: cat.description ?? '',
        imageUrl: cat.imageUrl ?? '',
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        showOnHome: false,
        homeImageUrl: '',
      });
      toast.success('Von Startseite entfernt');
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
  }

  return (
    <div className="max-w-5xl">
      <p className="text-white/50 text-sm mb-6">
        Wähle Kategorien für die Startseite. Beim Hinzufügen wähle ein Produktbild das auf der Karte erscheinen soll.
      </p>

      <section className="mb-10">
        <h2 className="font-semibold text-sm uppercase tracking-widest text-brand-400 mb-4">
          Aktive Karten ({homeCats.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-10"><Spin /></div>
        ) : homeCats.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-dashed border-white/10 p-8 text-white/30 text-center text-sm">
            Noch keine Kategorien auf der Startseite — füge unten welche hinzu.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {homeCats.map((cat) => (
              <HomeCatCard key={cat.id} cat={cat} onRemove={() => removeFromHome(cat)} onEdit={() => setPicking(cat)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-sm uppercase tracking-widest text-white/40 mb-4">
          Weitere Kategorien ({otherCats.length})
        </h2>
        {!loading && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
            {otherCats.length === 0 ? (
              <div className="p-4 text-white/30 text-sm text-center">Alle Kategorien sind bereits aktiv.</div>
            ) : otherCats.map((cat) => (
              <div key={cat.id} className="flex items-center gap-4 p-4">
                {/* letter avatar — no category image used here */}
                <div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center shrink-0 text-white/60 font-bold text-sm">
                  {cat.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{cat.name}</div>
                  <div className="text-xs text-white/40">{cat.slug}</div>
                </div>
                <button
                  onClick={() => setPicking(cat)}
                  className="px-4 py-2 rounded-xl bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-xs font-bold shrink-0 transition"
                >
                  + Startseite
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {picking && <PickProductModal cat={picking} onClose={() => setPicking(null)} onSaved={() => { setPicking(null); load(); }} />}
    </div>
  );
}

function HomeCatCard({ cat, onRemove, onEdit }) {
  const img = imgSrc(cat.homeImageUrl || cat.imageUrl);
  return (
    <div className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/5 group">
      <div className="aspect-[3/4] relative">
        {img
          ? <img src={img} alt={cat.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-ink-800 grid place-items-center text-white/20 text-sm">Kein Bild</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="font-display text-xl tracking-wide">{cat.name}</div>
          <div className="text-xs text-brand-400 mt-0.5">Reihenfolge: {cat.sortOrder}</div>
        </div>
        {/* Action buttons — always visible at bottom */}
        <div className="absolute inset-x-0 top-0 flex justify-between p-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg bg-black/70 text-white hover:bg-brand-500/80 text-xs font-semibold backdrop-blur-sm"
          >
            Bild ändern
          </button>
          <button
            onClick={onRemove}
            className="px-3 py-1.5 rounded-lg bg-black/70 text-red-400 hover:bg-red-500/70 hover:text-white text-xs font-semibold backdrop-blur-sm"
          >
            Entfernen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Modal: pick a product image when adding category to homepage
───────────────────────────────────────────────────────────── */
function PickProductModal({ cat, onClose, onSaved }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { id, imageUrl, name }
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.get('/menu/admin/items', { params: { categoryId: cat.id } })
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  }, [cat.id]);

  async function confirm() {
    setSaving(true);
    try {
      await api.put(`/menu/admin/categories/${cat.id}`, {
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? '',
        imageUrl: cat.imageUrl ?? '',
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        showOnHome: true,
        homeImageUrl: selected?.imageUrl ?? '',
      });
      toast.success(`${cat.name} zur Startseite hinzugefügt`);
      onSaved();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <div>
            <h3 className="font-display text-xl">Produktbild wählen</h3>
            <p className="text-white/40 text-xs mt-0.5">
              Kategorie: <span className="text-white/70 font-semibold">{cat.name}</span> — wähle welches Produktbild auf der Startseiten-Karte erscheint.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 grid place-items-center text-white/60 ml-4 shrink-0">✕</button>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-10"><Spin /></div>
          ) : items.length === 0 ? (
            <div className="text-white/30 text-sm text-center py-10">
              Keine Produkte in dieser Kategorie gefunden.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((it) => {
                const isSelected = selected?.id === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={!it.imageUrl}
                    onClick={() => setSelected(isSelected ? null : it)}
                    className={`group relative rounded-2xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-brand-500 scale-[1.03] shadow-lg shadow-brand-500/30'
                        : 'border-white/10 hover:border-white/30'
                    } disabled:opacity-25 disabled:cursor-not-allowed`}
                  >
                    <div className="aspect-square w-full bg-ink-800">
                      {it.imageUrl
                        ? <img src={imgSrc(it.imageUrl)} alt={it.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full grid place-items-center text-white/20 text-xs p-2">{it.name}</div>}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-[11px] font-semibold leading-tight truncate">{it.name}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-500 grid place-items-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected preview + confirm */}
        <div className="p-5 border-t border-white/5 shrink-0 flex items-center gap-4">
          {selected ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                <img src={imgSrc(selected.imageUrl)} alt={selected.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/40">Gewählt:</p>
                <p className="text-sm font-semibold truncate">{selected.name}</p>
              </div>
            </div>
          ) : (
            <p className="text-white/30 text-sm flex-1">Kein Produkt gewählt — Kategorie wird ohne Bild hinzugefügt.</p>
          )}
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Abbrechen</button>
            <button
              type="button"
              disabled={saving}
              onClick={confirm}
              className="btn-primary px-5 py-2 text-sm"
            >
              {saving ? <Spin /> : 'Zur Startseite hinzufügen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CatEditModal({ cat, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: cat.name ?? '',
    slug: cat.slug ?? '',
    description: cat.description ?? '',
    imageUrl: cat.imageUrl ?? '',
    homeImageUrl: cat.homeImageUrl ?? '',
    sortOrder: cat.sortOrder ?? 0,
    isActive: cat.isActive ?? true,
    showOnHome: cat.showOnHome ?? false,
  });
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setLoadingItems(true);
    api.get('/menu/admin/items', { params: { categoryId: cat.id } })
      .then((r) => setItems(r.data))
      .finally(() => setLoadingItems(false));
  }, [cat.id]);

  async function uploadFromUrl(field) {
    const url = prompt('Bild-URL eingeben:');
    if (!url) return;
    setUploading(true);
    try {
      const r = await api.post('/menu/admin/upload-url', { url });
      setForm((f) => ({ ...f, [field]: r.data.url }));
      toast.success('Bild geladen');
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setUploading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/menu/admin/categories/${cat.id}`, {
        ...form,
        sortOrder: Number(form.sortOrder),
        imageUrl: form.imageUrl || undefined,
        homeImageUrl: form.homeImageUrl || undefined,
        description: form.description || undefined,
      });
      toast.success('Gespeichert');
      onSaved();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setSaving(false); }
  }

  const previewImg = form.homeImageUrl || form.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="font-display text-xl">Kategorie — {cat.name}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 grid place-items-center text-white/60">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* ── Product image picker — shown first & prominently ── */}
          <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
            <span className="label block mb-3 text-brand-400">Welches Produktbild soll auf der Karte erscheinen?</span>
            {loadingItems ? (
              <div className="flex justify-center py-4"><Spin /></div>
            ) : items.length === 0 ? (
              <p className="text-white/30 text-xs">Keine Produkte in dieser Kategorie gefunden.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                {items.map((it) => {
                  const selected = !!it.imageUrl && form.homeImageUrl === it.imageUrl;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      disabled={!it.imageUrl}
                      onClick={() => setForm((f) => ({ ...f, homeImageUrl: it.imageUrl || '' }))}
                      title={it.name}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition ${selected ? 'border-brand-500 scale-105 shadow-lg shadow-brand-500/30' : 'border-white/10 hover:border-white/40'} disabled:opacity-25 disabled:cursor-not-allowed`}
                    >
                      {it.imageUrl
                        ? <img src={imgSrc(it.imageUrl)} alt={it.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-ink-800 grid place-items-center text-white/20 text-[10px]">–</div>}
                      {selected && (
                        <div className="absolute inset-0 bg-brand-500/30 grid place-items-center">
                          <span className="text-white text-2xl drop-shadow">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {(form.homeImageUrl) && (
              <div className="mt-3 h-28 rounded-xl overflow-hidden">
                <img src={imgSrc(form.homeImageUrl)} alt="Vorschau" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* ── Or paste a custom URL ── */}
          <label className="block">
            <span className="label">Oder eigene Bild-URL eingeben <span className="text-white/30 font-normal">(optional)</span></span>
            <div className="flex gap-2">
              <input className="input flex-1" value={form.homeImageUrl} placeholder="https://… (leer = Speisekarte-Bild)" onChange={(e) => setForm({ ...form, homeImageUrl: e.target.value })} />
              <button type="button" disabled={uploading} onClick={() => uploadFromUrl('homeImageUrl')} className="btn-outline shrink-0 text-xs px-3">
                {uploading ? <Spin /> : 'URL laden'}
              </button>
            </div>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Name *</span>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Reihenfolge</span>
              <input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </label>
          </div>


          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-brand-500" />
              Kategorie aktiv
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.showOnHome} onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })} className="w-4 h-4 accent-brand-500" />
              Auf Startseite anzeigen
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Abbrechen</button>
            <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spin /> : 'Speichern'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 2 — "Scroll Eat & Repeat" slider items
───────────────────────────────────────────────────────────── */
function SliderTab() {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/menu/admin/items').then((r) => setAllItems(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const sliderItems = allItems.filter((it) => it.showInSlider).sort((a, b) => a.sliderSortOrder - b.sliderSortOrder);
  const otherItems  = allItems.filter((it) => !it.showInSlider);

  const filtered = search.trim()
    ? otherItems.filter((it) =>
        it.name.toLowerCase().includes(search.toLowerCase()) ||
        it.category?.name?.toLowerCase().includes(search.toLowerCase()))
    : otherItems;

  async function toggleSlider(item) {
    setBusyId(item.id);
    try {
      await api.put(`/menu/admin/items/${item.id}/slider`, {
        showInSlider: !item.showInSlider,
        sliderSortOrder: item.showInSlider ? 0 : sliderItems.length,
      });
      toast.success(!item.showInSlider ? 'Zum Slider hinzugefügt' : 'Vom Slider entfernt');
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
    finally { setBusyId(null); }
  }

  async function saveOrder(item, newOrder) {
    try {
      await api.put(`/menu/admin/items/${item.id}/slider`, { showInSlider: true, sliderSortOrder: Number(newOrder) });
      toast.success('Reihenfolge gespeichert');
      setEditingOrder(null);
      load();
    } catch (e) { toast.error(e.displayMessage || 'Fehler'); }
  }

  return (
    <div className="max-w-5xl">
      <p className="text-white/50 text-sm mb-6">
        Wähle Produkte die im horizontalen Scroll-Slider auf der Startseite angezeigt werden. Klicke auf die Nummer um die Reihenfolge zu ändern.
      </p>

      <section className="mb-10">
        <h2 className="font-semibold text-sm uppercase tracking-widest text-brand-400 mb-4">
          Im Slider ({sliderItems.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-10"><Spin /></div>
        ) : sliderItems.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-dashed border-white/10 p-8 text-white/30 text-center text-sm">
            Noch keine Produkte im Slider — wähle unten welche aus.
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
            {sliderItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-4 p-4">
                <div className="w-7 h-7 shrink-0 rounded-lg bg-brand-500/20 text-brand-400 font-display text-sm grid place-items-center">
                  {idx + 1}
                </div>
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-ink-800 shrink-0">
                  {item.imageUrl
                    ? <img src={imgSrc(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center text-white/20 text-xs">–</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{item.name}</div>
                  <div className="text-xs text-white/40">{item.category?.name} • € {Number(item.price).toFixed(2)}</div>
                </div>
                {editingOrder?.id === item.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      className="input w-20 py-1 text-sm"
                      value={editingOrder.sliderSortOrder}
                      onChange={(e) => setEditingOrder({ ...editingOrder, sliderSortOrder: e.target.value })}
                    />
                    <button onClick={() => saveOrder(item, editingOrder.sliderSortOrder)} className="px-3 py-1 rounded-lg bg-brand-500 text-white text-xs font-semibold">OK</button>
                    <button onClick={() => setEditingOrder(null)} className="px-3 py-1 rounded-lg bg-white/10 text-xs">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingOrder({ id: item.id, sliderSortOrder: item.sliderSortOrder })}
                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs shrink-0"
                    title="Reihenfolge ändern"
                  >
                    #{item.sliderSortOrder}
                  </button>
                )}
                <button
                  disabled={busyId === item.id}
                  onClick={() => toggleSlider(item)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-semibold shrink-0 disabled:opacity-40"
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-white/40 shrink-0">
            Produkte hinzufügen ({filtered.length})
          </h2>
          <input
            className="input max-w-xs py-2 text-sm"
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/[0.03] border border-white/5 flex gap-3 p-3 items-center">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-ink-800 shrink-0">
                  {item.imageUrl
                    ? <img src={imgSrc(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center text-white/20 text-xs">–</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{item.name}</div>
                  <div className="text-xs text-white/40 truncate">{item.category?.name} • € {Number(item.price).toFixed(2)}</div>
                </div>
                <button
                  disabled={busyId === item.id}
                  onClick={() => toggleSlider(item)}
                  className="px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-xs font-semibold shrink-0 disabled:opacity-40"
                >
                  {busyId === item.id ? <Spin /> : '+ Slider'}
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-white/30 text-sm text-center py-6">Keine Produkte gefunden.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}


