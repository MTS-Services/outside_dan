const prisma = require('../config/prisma');

const DEFAULTS = {
  orders_accepted: true,
  news_banner_enabled: false,
  news_banner_text: '',
};

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

module.exports = {
  DEFAULTS,
  getSetting,
  setSetting,
  upsertMany,
  getAllSettings,
  ensureDefaults,
  parseBool,
  areOrdersAccepted,
};
