import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

const HERO_SLOTS = [
  { key: 'home_hero',    label: 'Startseite Hero' },
  { key: 'about_hero',   label: 'Über uns Hero' },
  { key: 'about_story',  label: 'Über uns Story' },
  { key: 'about_founder', label: 'Gründer Foto' },
  { key: 'contact_hero', label: 'Kontakt Hero' },
  { key: 'menu_hero',    label: 'Speisekarte Hero' },
];

function siteImgSrc(url) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;
}

export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editAlt, setEditAlt] = useState('');
  const fileRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // img object to delete

  // Site hero images
  const [heroImages, setHeroImages] = useState({});
  const [heroUploading, setHeroUploading] = useState({});
  const heroRefs = useRef({});

  async function loadHeroImages() {
    const results = await Promise.allSettled(
      HERO_SLOTS.map((s) => api.get(`/site-images/${s.key}`))
    );
    const map = {};
    HERO_SLOTS.forEach((s, i) => {
      const r = results[i];
      map[s.key] = r.status === 'fulfilled' ? r.value.data?.url || null : null;
    });
    setHeroImages(map);
  }

  async function handleHeroUpload(key, e) {
    const file = e.target.files[0];
    if (!file) return;
    setHeroUploading((p) => ({ ...p, [key]: true }));
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post(`/site-images/${key}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHeroImages((p) => ({ ...p, [key]: data.url }));
      toast.success('Hero-Bild gespeichert');
    } catch {
      toast.error('Upload fehlgeschlagen');
    } finally {
      setHeroUploading((p) => ({ ...p, [key]: false }));
      e.target.value = '';
    }
  }

  async function load() {
    try {
      const { data } = await api.get('/gallery');
      setImages(data);
    } catch {
      toast.error('Fehler beim Laden der Galerie');
    }
  }

  useEffect(() => {
    load();
    loadHeroImages();
  }, []);

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      let nextOrder = images.length + 1;
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('alt', file.name.replace(/\.[^.]+$/, ''));
        fd.append('sortOrder', nextOrder++);
        await api.post('/gallery', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      toast.success(`${files.length} Bild${files.length > 1 ? 'er' : ''} hochgeladen`);
      await load();
    } catch {
      toast.error('Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const HOME_LIMIT = 3;

  async function toggleHome(img) {
    if (!img.showOnHome && homeCount >= HOME_LIMIT) {
      toast.error(`Maximal ${HOME_LIMIT} Bilder auf der Startseite erlaubt.`);
      return;
    }
    try {
      const updated = await api.patch(`/gallery/${img.id}`, { showOnHome: !img.showOnHome });
      setImages((prev) => prev.map((i) => (i.id === img.id ? updated.data : i)));
    } catch {
      toast.error('Fehler');
    }
  }

  async function saveAlt(img) {
    try {
      const updated = await api.patch(`/gallery/${img.id}`, { alt: editAlt });
      setImages((prev) => prev.map((i) => (i.id === img.id ? updated.data : i)));
      setEditId(null);
      toast.success('Beschriftung gespeichert');
    } catch {
      toast.error('Fehler');
    }
  }

  async function handleDelete(img) {
    setConfirmDelete(img);
  }

  async function confirmDeleteNow() {
    const img = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/gallery/${img.id}`);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      toast.success('Bild gelöscht');
    } catch {
      toast.error('Fehler beim Löschen');
    }
  }

  const homeCount = images.filter((i) => i.showOnHome).length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-display text-xl mb-2">Bild löschen?</h3>
            <p className="text-white/50 text-sm mb-6">
              „<span className="text-white/80">{confirmDelete.alt || confirmDelete.id}</span>" wird dauerhaft gelöscht.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold transition"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDeleteNow}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-brand-400 text-xs font-semibold tracking-[0.2em] uppercase mb-1">Verwaltung</p>
          <h1 className="font-display text-2xl sm:text-3xl tracking-wider text-white">Galerie</h1>
          <p className="text-white/35 text-sm mt-1">
            {images.length} Bild{images.length !== 1 ? 'er' : ''} · {homeCount} / 3 auf Startseite
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all duration-200 disabled:opacity-50 shrink-0"
        >
          <UploadIcon />
          {uploading ? 'Hochladen…' : 'Bilder hochladen'}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
      </div>

      {/* ── HERO SLOTS ────────────────────────────────────────── */}
      <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-brand-500 shrink-0" />
          <h2 className="text-white/80 text-sm font-semibold tracking-widest uppercase">Seiten-Heros</h2>
          <span className="text-white/25 text-xs">Bild das oben auf jeder Seite erscheint</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {HERO_SLOTS.map(({ key, label }) => {
            const currentUrl = siteImgSrc(heroImages[key]);
            const busy = heroUploading[key];
            return (
              <div key={key} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-ink-800 cursor-pointer"
                onClick={() => {
                  if (!heroRefs.current[key]) {
                    heroRefs.current[key] = document.createElement('input');
                    heroRefs.current[key].type = 'file';
                    heroRefs.current[key].accept = 'image/png,image/jpeg,image/webp';
                    heroRefs.current[key].onchange = (e) => handleHeroUpload(key, e);
                  }
                  heroRefs.current[key].click();
                }}
              >
                <div className="relative h-32">
                  {currentUrl ? (
                    <img src={currentUrl} alt={label} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/20">
                        <UploadIcon />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 transition duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                    <span className="text-white text-xs font-semibold drop-shadow">{label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${currentUrl ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {busy ? '…' : currentUrl ? 'Aktiv' : 'Leer'}
                    </span>
                  </div>
                </div>
                <div className="px-3 py-2 flex items-center gap-2 bg-white/[0.03] border-t border-white/8">
                  <UploadIcon />
                  <span className="text-white/50 group-hover:text-white/80 text-xs transition duration-200">
                    {busy ? 'Wird hochgeladen…' : currentUrl ? 'Ersetzen' : 'Hochladen'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GALLERY GRID ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-white/20 shrink-0" />
          <h2 className="text-white/80 text-sm font-semibold tracking-widest uppercase">Galerie-Bilder</h2>
          <span className="text-white/25 text-xs">Startseite-Symbol aktivieren um Bild auf der Startseite anzuzeigen (max. 3)</span>
        </div>

        {images.length === 0 ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-3xl h-56 flex flex-col items-center justify-center gap-3 text-white/25 cursor-pointer hover:border-brand-500/30 hover:text-white/50 hover:bg-brand-500/5 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl border border-dashed border-white/20 flex items-center justify-center">
              <UploadIcon />
            </div>
            <span className="text-sm">Klicken zum Hochladen</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img) => (
              <div key={img.id} className="group relative rounded-2xl overflow-hidden bg-ink-800 border border-white/[0.06] shadow-sm hover:border-white/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-300">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={img.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${img.url}` : img.url}
                    alt={img.alt || ''}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700 ease-out"
                  />
                </div>

                {/* Always-visible bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                {/* Home badge */}
                {img.showOnHome && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-brand-500 rounded-full px-2 py-0.5 shadow-md pointer-events-none">
                    <HomeIcon active />
                    <span className="text-white text-[10px] font-semibold">Home</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/40 to-ink-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-2">
                  {editId === img.id ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveAlt(img)}
                        className="flex-1 min-w-0 bg-black/60 border border-white/20 rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-500 backdrop-blur-sm"
                        placeholder="Bildbeschriftung…"
                      />
                      <button onClick={() => saveAlt(img)} className="px-2 py-1 bg-brand-500 rounded-xl text-xs text-white shrink-0 hover:bg-brand-400 transition">✓</button>
                      <button onClick={() => setEditId(null)} className="px-2 py-1 bg-white/15 rounded-xl text-xs text-white shrink-0 hover:bg-white/25 transition">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditId(img.id); setEditAlt(img.alt || ''); }}
                      className="text-left text-xs text-white/60 hover:text-white truncate transition"
                      title="Beschriftung bearbeiten"
                    >
                      {img.alt || <span className="italic text-white/25">Kein Titel</span>}
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleHome(img)}
                      title={img.showOnHome ? 'Von Startseite entfernen' : 'Auf Startseite zeigen'}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all duration-200 ${
                        img.showOnHome
                          ? 'bg-brand-500/40 text-brand-200 border border-brand-500/50 shadow-sm shadow-brand-500/20'
                          : 'bg-white/10 text-white/50 border border-white/10 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      <HomeIcon active={img.showOnHome} />
                      Startseite
                    </button>
                    <button
                      onClick={() => handleDelete(img)}
                      className="ml-auto p-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 transition-all duration-200 border border-red-500/20"
                      title="Bild löschen"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Upload tile */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-brand-500/40 hover:bg-brand-500/5 flex flex-col items-center justify-center gap-3 text-white/25 hover:text-white/60 transition-all duration-300 disabled:opacity-40 group"
            >
              <div className="w-10 h-10 rounded-xl border border-dashed border-white/20 group-hover:border-brand-500/40 flex items-center justify-center transition-all duration-300">
                <UploadIcon />
              </div>
              <span className="text-xs font-medium">Hochladen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
