const siteSettingService = require('./siteSettingService');

const KEYS = {
  clientId: 'paypal_client_id',
  clientSecret: 'paypal_client_secret',
  mode: 'paypal_mode',
  currency: 'paypal_currency',
};

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

async function ensureLoaded() {
  if (cache.loaded) return;

  const [clientId, clientSecret, mode, currency] = await Promise.all([
    siteSettingService.getSetting(KEYS.clientId, ''),
    siteSettingService.getSetting(KEYS.clientSecret, ''),
    siteSettingService.getSetting(KEYS.mode, 'sandbox'),
    siteSettingService.getSetting(KEYS.currency, 'EUR'),
  ]);

  cache.clientId = String(clientId || '').trim();
  cache.clientSecret = String(clientSecret || '').trim();
  cache.mode = normalizeMode(mode);
  cache.currency = String(currency || 'EUR').trim().toUpperCase() || 'EUR';
  cache.loaded = true;
}

function reloadCache() {
  cache.loaded = false;
  return ensureLoaded();
}

function getClientIdSync() {
  return cache.clientId;
}

function getClientSecretSync() {
  return cache.clientSecret;
}

function getModeSync() {
  return normalizeMode(cache.mode);
}

function getCurrencySync() {
  return (cache.currency || 'EUR').toUpperCase();
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
  await ensureLoaded();

  const trimmedId = String(clientId || '').trim();
  const trimmedSecret = String(clientSecret || '').trim();
  const nextMode = normalizeMode(mode ?? cache.mode);
  const nextCurrency = String(currency || cache.currency || 'EUR').trim().toUpperCase() || 'EUR';
  const secretToSave = trimmedSecret || cache.clientSecret;

  if (!trimmedId) {
    throw new Error('Client ID ist erforderlich');
  }
  if (!secretToSave) {
    throw new Error('Client Secret ist erforderlich');
  }

  await Promise.all([
    siteSettingService.setSetting(KEYS.clientId, trimmedId),
    siteSettingService.setSetting(KEYS.clientSecret, secretToSave),
    siteSettingService.setSetting(KEYS.mode, nextMode),
    siteSettingService.setSetting(KEYS.currency, nextCurrency),
  ]);

  cache.clientId = trimmedId;
  cache.clientSecret = secretToSave;
  cache.mode = nextMode;
  cache.currency = nextCurrency;

  return getStatus();
}

async function clearConfig() {
  await Promise.all([
    siteSettingService.setSetting(KEYS.clientId, ''),
    siteSettingService.setSetting(KEYS.clientSecret, ''),
    siteSettingService.setSetting(KEYS.mode, 'sandbox'),
    siteSettingService.setSetting(KEYS.currency, 'EUR'),
  ]);

  cache.clientId = '';
  cache.clientSecret = '';
  cache.mode = 'sandbox';
  cache.currency = 'EUR';

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
