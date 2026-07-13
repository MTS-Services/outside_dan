import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from '../api/client';

export const ORDERS_CLOSED_MESSAGE = 'Wir nehmen derzeit keine Bestellungen entgegen.';
export const OUTSIDE_DELIVERY_HOURS_MESSAGE = 'Bestellungen sind derzeit nur innerhalb unserer Lieferzeiten möglich.';

export const DAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS_DE = {
  mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag',
  fri: 'Freitag', sat: 'Samstag', sun: 'Sonntag',
};

function parseBool(val, defaultValue = true) {
  if (val === true || val === 'true') return true;
  if (val === false || val === 'false' || val === '0') return false;
  return defaultValue;
}

export function normalizeDeliverySchedule(raw) {
  let input = raw;
  if (typeof input === 'string') {
    try { input = JSON.parse(input); } catch { input = []; }
  }
  if (!Array.isArray(input)) input = [];
  return DAY_CODES.map((day, i) => {
    const entry = input.find((e) => e && e.day === day) || input[i] || {};
    const windows = (Array.isArray(entry.windows) ? entry.windows : [])
      .filter((w) => w && /^\d{2}:\d{2}$/.test(w.from || '') && /^\d{2}:\d{2}$/.test(w.to || ''))
      .map((w) => ({ from: w.from, to: w.to }));
    return { day, enabled: entry.enabled !== false && windows.length > 0, windows };
  });
}

function isTimeInWindow(time, { from, to }) {
  if (from === to) return false;
  if (to < from) return time >= from || time < to; // spans midnight
  return time >= from && time < to;
}

/** Check the weekly delivery schedule against the current local time. */
export function isDeliveryOpenNow(scheduleEnabled, schedule) {
  if (!scheduleEnabled) return true;
  const now = new Date();
  const day = DAY_CODES[(now.getDay() + 6) % 7]; // JS: 0=Sunday → our list starts Monday
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = (schedule || []).find((d) => d.day === day);
  return Boolean(today && today.enabled && today.windows.some((w) => isTimeInWindow(time, w)));
}

export const useSiteSettings = create((set, get) => ({
  loaded: false,
  ordersAccepted: true,
  newsBannerEnabled: false,
  newsBannerText: '',
  deliveryScheduleEnabled: false,
  deliverySchedule: normalizeDeliverySchedule([]),

  load: async () => {
    try {
      const { data } = await api.get('/site-settings');
      set({
        loaded: true,
        ordersAccepted: parseBool(data?.orders_accepted, true),
        newsBannerEnabled: parseBool(data?.news_banner_enabled, false),
        newsBannerText: String(data?.news_banner_text || '').trim(),
        deliveryScheduleEnabled: parseBool(data?.delivery_schedule_enabled, false),
        deliverySchedule: normalizeDeliverySchedule(data?.delivery_schedule),
      });
    } catch {
      set({ loaded: true });
    }
  },

  canOrder: () => {
    const s = get();
    return s.ordersAccepted !== false
      && isDeliveryOpenNow(s.deliveryScheduleEnabled, s.deliverySchedule);
  },
}));

export function useOrderGuard() {
  const loaded = useSiteSettings((s) => s.loaded);
  const ordersAccepted = useSiteSettings((s) => s.ordersAccepted);
  const deliveryScheduleEnabled = useSiteSettings((s) => s.deliveryScheduleEnabled);
  const deliverySchedule = useSiteSettings((s) => s.deliverySchedule);

  const deliveryOpen = isDeliveryOpenNow(deliveryScheduleEnabled, deliverySchedule);
  const canOrder = ordersAccepted !== false && deliveryOpen;
  const closedMessage = ordersAccepted === false
    ? ORDERS_CLOSED_MESSAGE
    : OUTSIDE_DELIVERY_HOURS_MESSAGE;

  const guardOrder = () => {
    if (loaded && !canOrder) {
      toast.error(closedMessage);
      return false;
    }
    return true;
  };

  return { loaded, ordersAccepted, deliveryOpen, canOrder, closedMessage, guardOrder };
}
