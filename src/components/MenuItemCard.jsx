import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCart, useCartUI } from '../store/cart';
import { useOrderGuard } from '../store/siteSettings';
import ExtrasModal from './ExtrasModal';
import HtmlContent from './HtmlContent';
import { hasHtmlContent, stripHtml } from '../utils/html';

const imgSrc = (url) => url?.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${url}` : url;

const DESC_PREVIEW_CHARS = 160;

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
  const { canOrder, guardOrder } = useOrderGuard();
  const alreadyInCart = cartItems.some((i) => i.menuItemId === item.id);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const extras = (item.extras || [])
    .map((me) => me.extra ? me.extra : me)
    .filter((e) => e && e.isActive !== false);

  const hasDescription = hasHtmlContent(item.description);
  const hasLongDescription = stripHtml(item.description || '').length > DESC_PREVIEW_CHARS;

  const openModal = () => {
    if (!guardOrder()) return;
    setMounted(true);
    setOpen(true);
  };

  const addToCart = (selectedExtras = [], qty = 1, notes = '') => {
    if (!guardOrder()) return;
    add(
      { id: item.id, name: item.name, price: Number(item.price), imageUrl: item.imageUrl },
      selectedExtras,
      qty,
      notes
    );
    toast.success(`${item.name} zum Warenkorb hinzugefügt`);
    openCart();
  };

  return (
    <div className="menu-item-card card overflow-hidden group flex flex-col h-full">
      <div className="relative aspect-[4/3] overflow-hidden shrink-0 bg-ink-700">
        {item.imageUrl && !imgFailed ? (
          <img
            src={imgSrc(item.imageUrl)}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 items-center">
          {item.isVegetarian && <span className="chip bg-emerald-500/80 text-white text-xs">Vegetarisch</span>}
          {item.isSpicy && <span className="chip bg-red-500/80 text-white text-xs">Scharf</span>}
          {(item.tags || []).slice(0, 2).map((mt) => {
            const tag = mt.tag || mt;
            return <TagBadge key={tag.id} tag={tag} />;
          })}
        </div>
        <div className="absolute bottom-3 right-3 bg-brand-500 text-ink-900 font-bold px-3 py-1 rounded-full shadow-glow text-sm">
          € {Number(item.price).toFixed(2)}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-display text-xl tracking-wide leading-tight line-clamp-2 min-h-[3.25rem]">
          {item.name}
        </h3>

        <div className="mt-3 flex-1 flex flex-col">
          {hasDescription ? (
            <div className={`menu-card-desc-wrap ${hasLongDescription ? 'menu-card-desc-wrap--fade' : ''}`}>
              <HtmlContent html={item.description} className="menu-card-desc" />
            </div>
          ) : (
            <div className="menu-card-desc-spacer" aria-hidden="true" />
          )}

          {hasLongDescription && (
            <button
              type="button"
              onClick={openModal}
              className="mt-2 text-xs font-medium text-brand-400/90 hover:text-brand-300 transition text-left"
            >
              Alle Details anzeigen
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 pt-4 mt-auto border-t border-white/5 shrink-0">
        <button
          onClick={openModal}
          disabled={item.isAvailable === false || alreadyInCart || !canOrder}
          className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!canOrder
            ? 'Bestellungen pausiert'
            : item.isAvailable === false
              ? 'Nicht verfügbar'
              : alreadyInCart
                ? 'Bereits im Warenkorb'
                : 'In den Warenkorb'}
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
