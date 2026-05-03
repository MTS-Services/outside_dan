import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCart, useCartUI } from '../store/cart';
import ExtrasModal from './ExtrasModal';

const imgSrc = (url) => url?.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;

function TagBadge({ tag }) {
  const [failed, setFailed] = useState(false);
  const tagImg = tag.imageUrl ? imgSrc(tag.imageUrl) : null;
  if (tagImg && !failed) {
    return (
      <img
        src={tagImg}
        alt={tag.name}
        title={tag.name}
        className="w-12 h-12 shrink-0 object-contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="chip text-xs font-semibold text-white bg-brand-500/80">
      {tag.name}
    </span>
  );
}

export default function MenuItemCard({ item }) {
  const add = useCart((s) => s.add);
  const cartItems = useCart((s) => s.items);
  const openCart = useCartUI((s) => s.openDrawer);
  const alreadyInCart = cartItems.some((i) => i.menuItemId === item.id);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const extras = (item.extras || [])
    .map((me) => me.extra ? me.extra : me)
    .filter((e) => e && e.isActive !== false);

  const addToCart = (selectedExtras = [], qty = 1, notes = '') => {
    add(
      { id: item.id, name: item.name, price: Number(item.price), imageUrl: item.imageUrl },
      selectedExtras,
      qty,
      notes
    );
    toast.success(`${item.name} zum Warenkorb hinzugefügt`);
    openCart();
  };

  const onAddClick = () => {
    setMounted(true);
    setOpen(true);
  };

  return (
    <div className="card overflow-hidden group flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden">
        {item.imageUrl && !imgFailed ? (
          <img
            src={imgSrc(item.imageUrl)}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-ink-700" />
        )}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 items-center">
          {item.isVegetarian && <span className="chip bg-emerald-500/80 text-white text-xs">Vegetarisch</span>}
          {item.isSpicy && <span className="chip bg-red-500/80 text-white text-xs">Scharf</span>}
          {(item.tags || []).slice(0, 2).map((mt) => {
            const tag = mt.tag || mt;
            return <TagBadge key={tag.id} tag={tag} />;
          })}
        </div>
        <div className="absolute bottom-3 right-3 bg-brand-500 text-white font-bold px-3 py-1 rounded-full shadow-glow">
          € {Number(item.price).toFixed(2)}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-display text-xl tracking-wide">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-white/60 mt-1 text-justify leading-relaxed">{item.description}</p>
        )}
        <button
          onClick={onAddClick}
          disabled={item.isAvailable === false || alreadyInCart}
          className="btn-primary mt-6 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {item.isAvailable === false ? 'Nicht verfügbar' : alreadyInCart ? 'Bereits im Warenkorb' : 'In den Warenkorb'}
        </button>
      </div>

      {mounted && (
        <ExtrasModal
          open={open}
          item={item}
          extras={extras}
          onClose={() => setOpen(false)}
          onConfirm={addToCart}
        />
      )}
    </div>
  );
}
