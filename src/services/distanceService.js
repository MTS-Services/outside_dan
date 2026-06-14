/**
 * Delivery drive-time via Google Maps (Geocoding + Distance Matrix).
 */
const googleMaps = require('./googleMapsService');
const siteSettings = require('./siteSettingService');
const config = require('../config');

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();

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

let restaurantCoordsCache = null;

async function getRestaurantAddress() {
  const fromSettings = await siteSettings.getSetting('restaurant_address', '');
  return (fromSettings || config.restaurant.address || '').trim();
}

async function getRestaurantCoords() {
  if (restaurantCoordsCache) return restaurantCoordsCache;
  const address = await getRestaurantAddress();
  if (!address) return null;
  const hit = await googleMaps.geocodeAddress(address);
  if (!hit) return null;
  restaurantCoordsCache = { lat: hit.lat, lon: hit.lon, label: hit.label || address };
  return restaurantCoordsCache;
}

function buildDestinationQuery({ street, houseNumber, postalCode, city, label }) {
  const line = [street, houseNumber].filter(Boolean).join(' ').trim();
  const locality = (city || label || '').trim();
  const parts = [line];
  if (postalCode && locality) parts.push(`${postalCode} ${locality}`);
  else if (postalCode) parts.push(postalCode);
  else if (locality) parts.push(locality);
  return parts.join(', ');
}

async function resolveRouteEndpoints({ lat, lon, street, houseNumber, postalCode, city, label }) {
  const restaurant = await getRestaurantCoords();
  if (!restaurant) return { error: 'Restaurant-Adresse nicht konfiguriert' };

  const origin = `${restaurant.lat},${restaurant.lon}`;
  let dest = `${lat},${lon}`;
  let end = { lat, lng: lon };
  let destinationLabel = null;

  const addressQuery = buildDestinationQuery({ street, houseNumber, postalCode, city, label });
  if (addressQuery) {
    const geocoded = await googleMaps.geocodeAddress(addressQuery);
    if (geocoded) {
      dest = `${geocoded.lat},${geocoded.lon}`;
      end = { lat: geocoded.lat, lng: geocoded.lon };
      destinationLabel = geocoded.label;
    }
  }

  return {
    origin,
    dest,
    end,
    restaurantStart: { lat: restaurant.lat, lng: restaurant.lon },
    originAddress: restaurant.label,
    destinationLabel,
  };
}

async function getMaxDeliveryMinutes() {
  const val = await siteSettings.getSetting('max_delivery_minutes', 45);
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : 45;
}

function formatOrderAddress(order) {
  const parts = [order.street, order.postalCode, order.city].filter(Boolean);
  return parts.join(', ');
}

function geocodeCandidates(order) {
  const street = (order.street || '').trim();
  const postalCode = (order.postalCode || '').trim();
  const city = (order.city || '').trim();
  const list = [];
  if (street && postalCode && city) list.push(`${street}, ${postalCode} ${city}`);
  if (street && postalCode) list.push(`${street}, ${postalCode}`);
  if (postalCode && city) list.push(`${postalCode} ${city}`);
  if (postalCode) list.push(postalCode);
  return [...new Set(list)];
}

async function geocodeFirst(candidates) {
  for (const q of candidates) {
    const hit = await googleMaps.geocodeAddress(q);
    if (hit) return { ...hit, query: q };
  }
  return null;
}

async function getDriveTimeForOrder(order) {
  if (!googleMaps.isConfigured()) {
    return { error: 'Google Maps API nicht konfiguriert (GOOGLE_MAPS_API_KEY)' };
  }

    const originAddr = await getRestaurantAddress();
    if (!originAddr) return { error: 'Restaurant-Adresse nicht konfiguriert' };

    const restaurant = await getRestaurantCoords();
    const origin = restaurant ? `${restaurant.lat},${restaurant.lon}` : originAddr;

  const destination = formatOrderAddress(order);
  const lat = order.deliveryLat != null ? Number(order.deliveryLat) : null;
  const lon = order.deliveryLon != null ? Number(order.deliveryLon) : null;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  const key = cacheKey(origin, hasCoords ? `${lat},${lon}` : destination);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    let destTarget;
    let approximate = false;
    let geocodedAs = null;

    if (hasCoords) {
      destTarget = `${lat},${lon}`;
      geocodedAs = `${destination} (Google Maps Pin)`;
    } else {
      const candidates = geocodeCandidates(order);
      const hit = await geocodeFirst(candidates);
      if (!hit) {
        return {
          error: 'Lieferadresse konnte nicht gefunden werden',
          hint: 'Bitte Adresse auf der Google-Karte wählen.',
        };
      }
      destTarget = `${hit.lat},${hit.lon}`;
      geocodedAs = hit.query;
      approximate = hit.query !== candidates[0];
    }

    const route = await googleMaps.getDrivingRoute(origin, destTarget);
    if (!route) return { error: 'Fahrzeit konnte nicht berechnet werden' };

    const maxMinutes = await getMaxDeliveryMinutes();
    const mapsUrl = googleMaps.mapsDirectionsUrl(originAddr, destination);

    const result = {
      minutes: route.minutes,
      rawMinutes: route.minutes,
      distanceKm: route.distanceKm,
      durationText: route.durationText,
      distanceText: route.distanceText,
      maxMinutes,
      tooFar: route.minutes > maxMinutes,
      origin: originAddr,
      destination,
      mapsUrl,
      geocodedAs,
      approximate,
      provider: 'google',
    };
    setCache(key, result);
    return result;
  } catch (err) {
    return { error: err.message || 'Fahrzeit konnte nicht berechnet werden' };
  }
}

async function getDriveTimeTo(destinationAddress) {
  return getDriveTimeForOrder({ street: destinationAddress, postalCode: '', city: '' });
}

async function geocodeZoneCenter(postalCode, label = '') {
  const plz = (postalCode || '').trim();
  const area = (label || '').trim();
  const q = area ? `${plz} ${area}` : plz;
  const hit = await googleMaps.geocodeAddress(q);
  if (!hit) return null;
  return { lat: hit.lat, lon: hit.lon, label: hit.label };
}

async function reverseGeocode(lat, lon) {
  if (!googleMaps.isConfigured()) {
    return { error: 'Google Maps API nicht konfiguriert' };
  }
  const hit = await googleMaps.reverseGeocode(lat, lon);
  if (!hit) return null;
  return hit;
}

module.exports = {
  getDriveTimeTo,
  getDriveTimeForOrder,
  getRestaurantAddress,
  getRestaurantCoords,
  resolveRouteEndpoints,
  getMaxDeliveryMinutes,
  formatOrderAddress,
  geocodeZoneCenter,
  reverseGeocode,
};
