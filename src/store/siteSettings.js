import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from '../api/client';

export const ORDERS_CLOSED_MESSAGE = 'Wir nehmen derzeit keine Bestellungen entgegen.';

function parseBool(val, defaultValue = true) {
  if (val === true || val === 'true') return true;
  if (val === false || val === 'false' || val === '0') return false;
  return defaultValue;
}

export const useSiteSettings = create((set, get) => ({
  loaded: false,
  ordersAccepted: true,
  newsBannerEnabled: false,
  newsBannerText: '',

  load: async () => {
    try {
      const { data } = await api.get('/site-settings');
      set({
        loaded: true,
        ordersAccepted: parseBool(data?.orders_accepted, true),
        newsBannerEnabled: parseBool(data?.news_banner_enabled, false),
        newsBannerText: String(data?.news_banner_text || '').trim(),
      });
    } catch {
      set({ loaded: true });
    }
  },

  canOrder: () => get().ordersAccepted !== false,
}));

export function useOrderGuard() {
  const loaded = useSiteSettings((s) => s.loaded);
  const ordersAccepted = useSiteSettings((s) => s.ordersAccepted);

  const guardOrder = () => {
    if (loaded && !ordersAccepted) {
      toast.error(ORDERS_CLOSED_MESSAGE);
      return false;
    }
    return true;
  };

  return { loaded, ordersAccepted, canOrder: ordersAccepted !== false, guardOrder };
}
