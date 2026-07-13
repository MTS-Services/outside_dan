const prisma = require('../config/prisma');

const DAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DEFAULT_DELIVERY_SCHEDULE = DAY_CODES.map((day) => ({
  day,
  enabled: true,
  windows: [{ from: '11:00', to: '22:00' }],
}));

const DEFAULTS = {
  orders_accepted: true,
  news_banner_enabled: false,
  news_banner_text: '',
  delivery_schedule_enabled: false,
  delivery_schedule: DEFAULT_DELIVERY_SCHEDULE,
};

// Never exposed through the public GET /api/site-settings endpoint.
const SECRET_KEYS = ['r2o_developer_token', 'r2o_api_key', 'paypal_client_secret'];

function serializeValue(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function deserializeValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseBool(val, defaultValue = true) {
  if (val === true || val === 'true') return true;
  if (val === false || val === 'false' || val === '0') return false;
  return defaultValue;
}

async function getSetting(key, defaultValue = null) {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (!row) return defaultValue;
  return deserializeValue(row.value);
}

async function setSetting(key, value) {
  const stored = serializeValue(value);
  return prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: stored },
    update: { value: stored },
  });
}

async function upsertMany(entries) {
  await Promise.all(
    Object.entries(entries).map(([key, value]) => setSetting(key, value)),
  );
}

async function getAllSettings() {
  const rows = await prisma.siteSetting.findMany();
  const out = { ...DEFAULTS };
  for (const row of rows) {
    out[row.key] = deserializeValue(row.value);
  }
  return out;
}

/** Same as getAllSettings but without credentials — safe for the public endpoint. */
async function getPublicSettings() {
  const out = await getAllSettings();
  for (const key of SECRET_KEYS) delete out[key];
  return out;
}

async function ensureDefaults() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    const existing = await prisma.siteSetting.findUnique({ where: { key } });
    if (!existing) {
      await setSetting(key, value);
    }
  }
}

async function areOrdersAccepted() {
  return parseBool(await getSetting('orders_accepted', DEFAULTS.orders_accepted), true);
}

// ─── Delivery schedule ───────────────────────────────────────────────────────

function normalizeDeliverySchedule(raw) {
  const input = Array.isArray(raw) ? raw : [];
  return DAY_CODES.map((day, i) => {
    const entry = input.find((e) => e && e.day === day) || input[i] || {};
    const windows = (Array.isArray(entry.windows) ? entry.windows : [])
      .filter((w) => w && /^\d{2}:\d{2}$/.test(w.from || '') && /^\d{2}:\d{2}$/.test(w.to || ''))
      .map((w) => ({ from: w.from, to: w.to }));
    return { day, enabled: entry.enabled !== false && windows.length > 0, windows };
  });
}

/** Current weekday code + "HH:mm" in the restaurant's timezone (Europe/Vienna). */
function nowInRestaurantTime() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  const day = get('weekday').toLowerCase().slice(0, 3); // 'mon' … 'sun'
  return { day, time: `${get('hour')}:${get('minute')}` };
}

function isTimeInWindow(time, { from, to }) {
  if (from === to) return false;
  // Window spanning midnight, e.g. 22:00 – 02:00
  if (to < from) return time >= from || time < to;
  return time >= from && time < to;
}

/**
 * Check whether delivery orders are currently allowed by the weekly schedule.
 * Returns { open, schedule, enabled }.
 */
async function getDeliveryScheduleStatus() {
  const enabled = parseBool(
    await getSetting('delivery_schedule_enabled', DEFAULTS.delivery_schedule_enabled),
    false,
  );
  const schedule = normalizeDeliverySchedule(
    await getSetting('delivery_schedule', DEFAULTS.delivery_schedule),
  );
  if (!enabled) return { open: true, enabled, schedule };

  const now = nowInRestaurantTime();
  const today = schedule.find((d) => d.day === now.day);
  const open = Boolean(today && today.enabled && today.windows.some((w) => isTimeInWindow(now.time, w)));
  return { open, enabled, schedule };
}

module.exports = {
  DEFAULTS,
  DAY_CODES,
  SECRET_KEYS,
  getSetting,
  setSetting,
  upsertMany,
  getAllSettings,
  getPublicSettings,
  ensureDefaults,
  parseBool,
  areOrdersAccepted,
  normalizeDeliverySchedule,
  getDeliveryScheduleStatus,
};
