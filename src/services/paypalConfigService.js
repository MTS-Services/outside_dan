const fs = require('fs');
const path = require('path');
const siteSettingService = require('./siteSettingService');

const ENV_PATH = path.resolve(__dirname, '../../.env');

const cache = {
  clientId: '',
  clientSecret: '',
  mode: 'sandbox',
  currency: 'EUR',
  loaded: false,
};

function isKeyValid(value) {
  return Boolean(value) && !String(value).startsWith('your-') && String(value).length > 8;
}

function maskSecret(value) {
  if (!value || value.length < 12) return '';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function normalizeMode(mode) {
  const m = String(mode || 'sandbox').toLowerCase();
  return m === 'live' ? 'live' : 'sandbox';
}

function tryUpdateEnv(key, value) {
  try {
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    const line = `${key}=${value}`;
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(new RegExp(`^${key}=.*`, 'm'), line);
    } else {
      envContent += `\n${line}\n`;
    }
    fs.writeFileSync(ENV_PATH, envContent, 'utf8');
  } catch {
    // Optional — DB is the source of truth in production.
  }
}

async function ensureLoaded() {
  if (cache.loaded) return;

  const [clientId, clientSecret, mode, currency] = await Promise.all([
    siteSettingService.getSetting('paypal_client_id', ''),
    siteSettingService.getSetting('paypal_client_secret', ''),
    siteSettingService.getSetting('paypal_mode', ''),
    siteSettingService.getSetting('paypal_currency', ''),
  ]);

  cache.clientId = clientId || process.env.PAYPAL_CLIENT_ID || '';
  cache.clientSecret = clientSecret || process.env.PAYPAL_CLIENT_SECRET || '';
  cache.mode = normalizeMode(mode || process.env.PAYPAL_MODE);
  cache.currency = (currency || process.env.PAYPAL_CURRENCY || 'EUR').toUpperCase();

  if (!clientId && process.env.PAYPAL_CLIENT_ID) {
    await siteSettingService.setSetting('paypal_client_id', process.env.PAYPAL_CLIENT_ID);
    cache.clientId = process.env.PAYPAL_CLIENT_ID;
  }
  if (!clientSecret && process.env.PAYPAL_CLIENT_SECRET) {
    await siteSettingService.setSetting('paypal_client_secret', process.env.PAYPAL_CLIENT_SECRET);
    cache.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  }
  if (!mode && process.env.PAYPAL_MODE) {
    await siteSettingService.setSetting('paypal_mode', normalizeMode(process.env.PAYPAL_MODE));
    cache.mode = normalizeMode(process.env.PAYPAL_MODE);
  }
  if (!currency && process.env.PAYPAL_CURRENCY) {
    await siteSettingService.setSetting('paypal_currency', process.env.PAYPAL_CURRENCY.toUpperCase());
    cache.currency = process.env.PAYPAL_CURRENCY.toUpperCase();
  }

  process.env.PAYPAL_CLIENT_ID = cache.clientId;
  process.env.PAYPAL_CLIENT_SECRET = cache.clientSecret;
  process.env.PAYPAL_MODE = cache.mode;
  process.env.PAYPAL_CURRENCY = cache.currency;

  cache.loaded = true;
}

function reloadCache() {
  cache.loaded = false;
  return ensureLoaded();
}

function getClientIdSync() {
  return cache.clientId || process.env.PAYPAL_CLIENT_ID || '';
}

function getClientSecretSync() {
  return cache.clientSecret || process.env.PAYPAL_CLIENT_SECRET || '';
}

function getModeSync() {
  return normalizeMode(cache.mode || process.env.PAYPAL_MODE);
}

function getCurrencySync() {
  return (cache.currency || process.env.PAYPAL_CURRENCY || 'EUR').toUpperCase();
}

async function getClientId() {
  await ensureLoaded();
  return getClientIdSync();
}

async function getClientSecret() {
  await ensureLoaded();
  return getClientSecretSync();
}

async function getMode() {
  await ensureLoaded();
  return getModeSync();
}

async function getCurrency() {
  await ensureLoaded();
  return getCurrencySync();
}

async function setConfig({ clientId, clientSecret, mode, currency }) {
  const trimmedId = String(clientId || '').trim();
  const trimmedSecret = String(clientSecret || '').trim();
  const nextMode = normalizeMode(mode);
  const nextCurrency = String(currency || 'EUR').trim().toUpperCase() || 'EUR';

  if (!trimmedId || !trimmedSecret) {
    throw new Error('Client ID und Secret sind erforderlich');
  }

  await Promise.all([
    siteSettingService.setSetting('paypal_client_id', trimmedId),
    siteSettingService.setSetting('paypal_client_secret', trimmedSecret),
    siteSettingService.setSetting('paypal_mode', nextMode),
    siteSettingService.setSetting('paypal_currency', nextCurrency),
  ]);

  cache.clientId = trimmedId;
  cache.clientSecret = trimmedSecret;
  cache.mode = nextMode;
  cache.currency = nextCurrency;

  process.env.PAYPAL_CLIENT_ID = trimmedId;
  process.env.PAYPAL_CLIENT_SECRET = trimmedSecret;
  process.env.PAYPAL_MODE = nextMode;
  process.env.PAYPAL_CURRENCY = nextCurrency;

  tryUpdateEnv('PAYPAL_CLIENT_ID', trimmedId);
  tryUpdateEnv('PAYPAL_CLIENT_SECRET', trimmedSecret);
  tryUpdateEnv('PAYPAL_MODE', nextMode);
  tryUpdateEnv('PAYPAL_CURRENCY', nextCurrency);

  return getStatus();
}

async function clearConfig() {
  await Promise.all([
    siteSettingService.setSetting('paypal_client_id', ''),
    siteSettingService.setSetting('paypal_client_secret', ''),
    siteSettingService.setSetting('paypal_mode', 'sandbox'),
    siteSettingService.setSetting('paypal_currency', 'EUR'),
  ]);
  cache.clientId = '';
  cache.clientSecret = '';
  cache.mode = 'sandbox';
  cache.currency = 'EUR';
  process.env.PAYPAL_CLIENT_ID = '';
  process.env.PAYPAL_CLIENT_SECRET = '';
  process.env.PAYPAL_MODE = 'sandbox';
  process.env.PAYPAL_CURRENCY = 'EUR';
  return getStatus();
}

async function getStatus() {
  await ensureLoaded();
  const clientId = getClientIdSync();
  const clientSecret = getClientSecretSync();
  return {
    configured: isKeyValid(clientId) && isKeyValid(clientSecret),
    clientIdPreview: maskSecret(clientId),
    hasClientSecret: isKeyValid(clientSecret),
    mode: getModeSync(),
    currency: getCurrencySync(),
  };
}

module.exports = {
  ensureLoaded,
  reloadCache,
  getClientId,
  getClientSecret,
  getMode,
  getCurrency,
  getClientIdSync,
  getClientSecretSync,
  getModeSync,
  getCurrencySync,
  setConfig,
  clearConfig,
  getStatus,
  isKeyValid,
  maskSecret,
};
