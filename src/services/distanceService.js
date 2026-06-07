/**
 * Estimate driving time between two addresses using OpenStreetMap (Nominatim + OSRM).
 * Free, no API key required. Results are cached briefly.
 */
const axios = require('axios');
const siteSettings = require('./siteSettingService');
const config = require('../config');

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();

const USER_AGENT = 'Tarantella-Restaurant-App/1.0';

function cacheKey(origin, destination) {
  return `${origin}||${destination}`;
}

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCache(key, value) {
  cache.set(key, { at: Date.now(), value });
}

async function geocode(address) {
  const q = `${address}, Österreich`;
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q,
    format: 'json',
    limit: '1',
    countrycodes: 'at',
  })}`;

  const { data } = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    timeout: 12000,
  });
  if (!data?.[0]) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    label: data[0].display_name,
  };
}

async function routeMinutes(from, to) {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
  const { data } = await axios.get(url, {
    headers: { Accept: 'application/json' },
    timeout: 12000,
  });
  if (data.code !== 'Ok' || !data.routes?.[0]) return null;
  const route = data.routes[0];
  return {
    minutes: Math.round(route.duration / 60),
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
  };
}

async function getRestaurantAddress() {
  const fromSettings = await siteSettings.getSetting('restaurant_address', '');
  return (fromSettings || config.restaurant.address || '').trim();
}

async function getMaxDeliveryMinutes() {
  const val = await siteSettings.getSetting('max_delivery_minutes', 45);
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : 45;
}

/**
 * @param {string} destinationAddress - full delivery address
 * @returns {Promise<{ minutes, distanceKm, maxMinutes, tooFar, origin, destination, mapsUrl } | { error }>}
 */
async function getDriveTimeTo(destinationAddress) {
  const origin = await getRestaurantAddress();
  const destination = (destinationAddress || '').trim();
  if (!origin) return { error: 'Restaurant-Adresse nicht konfiguriert' };
  if (!destination) return { error: 'Lieferadresse fehlt' };

  const key = cacheKey(origin, destination);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const [from, to] = await Promise.all([
      geocode(origin),
      geocode(destination),
    ]);
    if (!from) return { error: 'Restaurant-Adresse konnte nicht gefunden werden' };
    if (!to) return { error: 'Lieferadresse konnte nicht gefunden werden' };

    const route = await routeMinutes(from, to);
    if (!route) return { error: 'Fahrzeit konnte nicht berechnet werden' };

    const maxMinutes = await getMaxDeliveryMinutes();
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;

    const result = {
      minutes: route.minutes,
      distanceKm: route.distanceKm,
      maxMinutes,
      tooFar: route.minutes > maxMinutes,
      origin,
      destination,
      mapsUrl,
    };
    setCache(key, result);
    return result;
  } catch (err) {
    return { error: err.message || 'Fahrzeit konnte nicht berechnet werden' };
  }
}

function formatOrderAddress(order) {
  const parts = [order.street, order.postalCode, order.city].filter(Boolean);
  return parts.join(', ');
}

async function getDriveTimeForOrder(order) {
  return getDriveTimeTo(formatOrderAddress(order));
}

module.exports = {
  getDriveTimeTo,
  getDriveTimeForOrder,
  getMaxDeliveryMinutes,
  formatOrderAddress,
};
