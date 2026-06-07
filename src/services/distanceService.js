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

/** Fallback queries when the full street address cannot be geocoded in Austria. */
function deliveryGeocodeCandidates(order) {
  const street = (order.street || '').trim();
  const postalCode = (order.postalCode || '').trim();
  const city = (order.city || '').trim();
  const candidates = [];
  if (street && postalCode && city) candidates.push(`${street}, ${postalCode} ${city}`);
  if (postalCode && city) candidates.push(`${postalCode} ${city}`);
  if (postalCode) candidates.push(postalCode);
  return [...new Set(candidates)];
}

async function geocodeFirst(queries) {
  for (const q of queries) {
    const hit = await geocode(q);
    if (hit) return { ...hit, query: q };
  }
  return null;
}

async function getDriveTimeForOrder(order) {
  const origin = await getRestaurantAddress();
  if (!origin) return { error: 'Restaurant-Adresse nicht konfiguriert' };

  const candidates = deliveryGeocodeCandidates(order);
  if (!candidates.length) return { error: 'Lieferadresse fehlt' };

  const key = cacheKey(origin, candidates.join('|'));
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const from = await geocode(origin);
    if (!from) return { error: 'Restaurant-Adresse konnte nicht gefunden werden' };

    const to = await geocodeFirst(candidates);
    if (!to) {
      return {
        error: 'Lieferadresse konnte nicht gefunden werden',
        hint: 'Straße scheint ungültig (z. B. Testadresse). Bitte Lieferzone und Straße prüfen.',
      };
    }

    const route = await routeMinutes(from, to);
    if (!route) return { error: 'Fahrzeit konnte nicht berechnet werden' };

    const maxMinutes = await getMaxDeliveryMinutes();
    const destination = formatOrderAddress(order);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    const usedFallback = to.query !== candidates[0];

    const result = {
      minutes: route.minutes,
      distanceKm: route.distanceKm,
      maxMinutes,
      tooFar: route.minutes > maxMinutes,
      origin,
      destination,
      geocodedAs: to.query,
      approximate: usedFallback,
      mapsUrl,
    };
    setCache(key, result);
    return result;
  } catch (err) {
    return { error: err.message || 'Fahrzeit konnte nicht berechnet werden' };
  }
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'json',
    addressdetails: '1',
  })}`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    timeout: 12000,
  });
  const addr = data?.address || {};
  const streetName = addr.road || addr.pedestrian || addr.footway || addr.hamlet || addr.suburb || '';
  return {
    streetName,
    houseNumber: addr.house_number || '',
    postalCode: addr.postcode || '',
    city: addr.village || addr.town || addr.city || addr.municipality || '',
    displayName: data?.display_name || '',
    lat,
    lon,
  };
}

async function geocodeZoneCenter(postalCode, label = '') {
  const candidates = [];
  const plz = (postalCode || '').trim();
  const area = (label || '').trim();
  if (plz && area) candidates.push(`${plz} ${area}`);
  if (plz) candidates.push(plz);
  const hit = await geocodeFirst(candidates);
  if (!hit) return null;
  return { lat: hit.lat, lon: hit.lon, label: hit.label };
}

module.exports = {
  geocode,
  geocodeFirst,
  reverseGeocode,
  geocodeZoneCenter,
  getDriveTimeTo,
  getDriveTimeForOrder,
  getMaxDeliveryMinutes,
  formatOrderAddress,
};
