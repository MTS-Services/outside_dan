import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Build a stable line key from menuItemId + selected extras (sorted ids) + notes. */
function makeLineId(menuItemId, extras = [], notes = '') {
  const ek = (extras || []).map((e) => e.id).sort().join(',');
  const nk = notes ? `::${notes.substring(0, 20)}` : '';
  const base = ek ? `${menuItemId}::${ek}` : menuItemId;
  return `${base}${nk}`;
}

/** Sum of unit-extras prices. */
function extrasUnitPrice(extras = []) {
  return (extras || []).reduce((s, e) => s + Number(e.price || 0), 0);
}

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      // item: { id (menuItemId), name, price, imageUrl }
      // extras: [{ id, name, price }]
      add(item, extras = [], qty = 1, notes = '') {
        const lineId = makeLineId(item.id, extras, notes);
        const items = [...get().items];
        const existing = items.find((i) => i.lineId === lineId);
        if (existing) {
          existing.quantity += qty;
        } else {
          items.push({
            lineId,
            menuItemId: item.id,
            name: item.name,
            price: Number(item.price),
            imageUrl: item.imageUrl,
            notes: notes || '',
            extras: (extras || []).map((e) => ({ id: e.id, name: e.name, price: Number(e.price || 0) })),
            quantity: qty,
          });
        }
        set({ items });
      },
      remove(lineId) {
        set({ items: get().items.filter((i) => i.lineId !== lineId) });
      },
      setQty(lineId, qty) {
        if (qty <= 0) return get().remove(lineId);
        set({ items: get().items.map((i) => (i.lineId === lineId ? { ...i, quantity: qty } : i)) });
      },
      setNotes(lineId, notes) {
        set({ items: get().items.map((i) => (i.lineId === lineId ? { ...i, notes } : i)) });
      },
      modifyExtraQty(lineId, extraId, delta) {
        set({
          items: get().items.map((i) => {
            if (i.lineId === lineId) {
              const newExtras = [...(i.extras || [])];
              if (delta > 0) {
                const ext = newExtras.find((e) => e.id === extraId || e.name === extraId);
                if (ext) newExtras.push({ ...ext });
              } else if (delta < 0) {
                const reverseIdx = [...newExtras]
                  .reverse()
                  .findIndex((e) => e.id === extraId || e.name === extraId);
                if (reverseIdx !== -1) {
                  newExtras.splice(newExtras.length - 1 - reverseIdx, 1);
                }
              }
              return { ...i, extras: newExtras };
            }
            return i;
          }),
        });
      },
      clear() { set({ items: [] }); },
      lineUnitPrice(line) {
        return Number(line.price) + extrasUnitPrice(line.extras);
      },
      lineTotal(line) {
        return (Number(line.price) + extrasUnitPrice(line.extras)) * line.quantity;
      },
      subtotal() {
        return get().items.reduce(
          (s, i) => s + (Number(i.price) + extrasUnitPrice(i.extras)) * i.quantity,
          0,
        );
      },
    }),
    {
      name: 'rr-cart',
      // Migrate any legacy entries that lack lineId/extras
      migrate: (state) => {
        if (!state || !state.items) return state;
        return {
          ...state,
          items: state.items.map((i) => ({
            lineId: i.lineId || makeLineId(i.id || i.menuItemId, [], i.notes || ''),
            menuItemId: i.menuItemId || i.id,
            name: i.name,
            price: Number(i.price),
            imageUrl: i.imageUrl,
            notes: i.notes || '',
            extras: i.extras || [],
            quantity: i.quantity || 1,
          })),
        };
      },
      version: 2,
    },
  ),
);

// UI-only state for the slide-in cart drawer (kept separate so persistence stays clean).
export const useCartUI = create((set) => ({
  open: false,
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
  toggleDrawer: () => set((s) => ({ open: !s.open })),
}));
