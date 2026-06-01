const fs = require('fs');
const path = require('path');
const config = require('../config');
const siteSettingService = require('./siteSettingService');

const ENV_PATH = path.resolve(__dirname, '../../.env');

const cache = {
  developerToken: '',
  apiKey: '',
  loaded: false,
};

function isKeyValid(key) {
  return Boolean(key) && !key.startsWith('your-') && key.length > 10;
}

function maskToken(token) {
  if (!token || token.length < 12) return '';
  return `${token.slice(0, 8)}…${token.slice(-6)}`;
}

function getCallbackUri() {
  return `${config.apiUrl}/api/r2o/callback`;
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
  const [dev, api] = await Promise.all([
    siteSettingService.getSetting('r2o_developer_token', ''),
    siteSettingService.getSetting('r2o_api_key', ''),
  ]);
  cache.developerToken = dev || process.env.R2O_DEVELOPER_TOKEN || '';
  cache.apiKey = api || process.env.R2O_API_KEY || '';

  if (!dev && process.env.R2O_DEVELOPER_TOKEN) {
    await siteSettingService.setSetting('r2o_developer_token', process.env.R2O_DEVELOPER_TOKEN);
    cache.developerToken = process.env.R2O_DEVELOPER_TOKEN;
  }
  if (!api && process.env.R2O_API_KEY) {
    await siteSettingService.setSetting('r2o_api_key', process.env.R2O_API_KEY);
    cache.apiKey = process.env.R2O_API_KEY;
  }

  cache.loaded = true;
}

function reloadCache() {
  cache.loaded = false;
  return ensureLoaded();
}

function getDeveloperTokenSync() {
  return cache.developerToken || process.env.R2O_DEVELOPER_TOKEN || '';
}

function getApiKeySync() {
  return cache.apiKey || process.env.R2O_API_KEY || '';
}

async function getDeveloperToken() {
  await ensureLoaded();
  return getDeveloperTokenSync();
}

async function getApiKey() {
  await ensureLoaded();
  return getApiKeySync();
}

async function setDeveloperToken(token) {
  const trimmed = String(token || '').trim();
  await siteSettingService.setSetting('r2o_developer_token', trimmed);
  cache.developerToken = trimmed;
  process.env.R2O_DEVELOPER_TOKEN = trimmed;
  if (trimmed) tryUpdateEnv('R2O_DEVELOPER_TOKEN', trimmed);
  return trimmed;
}

async function setApiKey(token) {
  const trimmed = String(token || '').trim();
  await siteSettingService.setSetting('r2o_api_key', trimmed);
  cache.apiKey = trimmed;
  process.env.R2O_API_KEY = trimmed;
  if (trimmed) tryUpdateEnv('R2O_API_KEY', trimmed);
  return trimmed;
}

async function clearApiKey() {
  await siteSettingService.setSetting('r2o_api_key', '');
  cache.apiKey = '';
  process.env.R2O_API_KEY = '';
}

async function getStatus() {
  await ensureLoaded();
  const apiKey = getApiKeySync();
  const developerToken = getDeveloperTokenSync();
  return {
    configured: isKeyValid(apiKey),
    hasDeveloperToken: isKeyValid(developerToken),
    apiKeyPreview: maskToken(apiKey),
    developerTokenPreview: maskToken(developerToken),
    callbackUri: getCallbackUri(),
    baseUrl: config.r2o.baseUrl,
  };
}

module.exports = {
  ensureLoaded,
  reloadCache,
  getCallbackUri,
  getDeveloperToken,
  getDeveloperTokenSync,
  getApiKey,
  getApiKeySync,
  setDeveloperToken,
  setApiKey,
  clearApiKey,
  getStatus,
  isKeyValid,
  maskToken,
};
