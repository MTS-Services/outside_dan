/**
 * Google Maps Platform: Geocoding + Distance Matrix (driving time).
 */
const axios = require('axios');
const config = require('../config');

const BASE = 'https://maps.googleapis.com/maps/api';

function getApiKey() {
  const key = config.googleMaps?.apiKey?.trim();
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY nicht konfiguriert');
  return key;
}

function isConfigured() {
  return Boolean(config.googleMaps?.apiKey?.trim());
}

function parseAddressComponents(components = []) {
  const get = (type) => components.find((c) => c.types.includes(type))?.long_name || '';
  return {
    streetName: get('route') || get('premise') || get('subpremise'),
    houseNumber: get('street_number'),
    postalCode: get('postal_code'),
    city: get('locality') || get('postal_town') || get('administrative_area_level_3') || get('sublocality'),
  };
}

async function geocodeAddress(address) {
  const { data } = await axios.get(`${BASE}/geocode/json`, {
    params: {
      address: `${address}, Österreich`,
      key: getApiKey(),
      region: 'at',
      language: 'de',
    },
    timeout: 15000,
  });
  if (data.status !== 'OK' || !data.results?.[0]) return null;
  const r = data.results[0];
  const parsed = parseAddressComponents(r.address_components);
  return {
    lat: r.geometry.location.lat,
    lon: r.geometry.location.lng,
    label: r.formatted_address,
    ...parsed,
  };
}

async function reverseGeocode(lat, lon) {
  const { data } = await axios.get(`${BASE}/geocode/json`, {
    params: {
      latlng: `${lat},${lon}`,
      key: getApiKey(),
      region: 'at',
      language: 'de',
    },
    timeout: 15000,
  });
  if (data.status !== 'OK' || !data.results?.[0]) return null;
  const r = data.results[0];
  const parsed = parseAddressComponents(r.address_components);
  return {
    lat,
    lon,
    displayName: r.formatted_address,
    streetName: parsed.streetName,
    houseNumber: parsed.houseNumber,
    postalCode: parsed.postalCode,
    city: parsed.city,
  };
}

async function getDrivingRoute(origin, destination) {
  const { data } = await axios.get(`${BASE}/distancematrix/json`, {
    params: {
      origins: origin,
      destinations: destination,
      mode: 'driving',
      departure_time: Math.floor(Date.now() / 1000),
      traffic_model: 'best_guess',
      language: 'de',
      region: 'at',
      key: getApiKey(),
    },
    timeout: 15000,
  });
  if (data.status !== 'OK') return null;
  const el = data.rows?.[0]?.elements?.[0];
  if (!el || el.status !== 'OK') return null;
  const duration = el.duration_in_traffic || el.duration;
  return {
    minutes: Math.max(1, Math.round(duration.value / 60)),
    distanceKm: Math.round((el.distance.value / 1000) * 10) / 10,
    durationText: duration.text,
    distanceText: el.distance.text,
    withTraffic: Boolean(el.duration_in_traffic),
  };
}

async function getDrivingDirections(origin, destination) {
  const { data } = await axios.get(`${BASE}/directions/json`, {
    params: {
      origin,
      destination,
      mode: 'driving',
      departure_time: Math.floor(Date.now() / 1000),
      traffic_model: 'best_guess',
      language: 'de',
      region: 'at',
      key: getApiKey(),
    },
    timeout: 15000,
  });
  if (data.status !== 'OK' || !data.routes?.[0]?.legs?.[0]) {
    return {
      error: data.error_message || data.status || 'Route konnte nicht berechnet werden',
    };
  }
  const route = data.routes[0];
  const leg = route.legs[0];
  const duration = leg.duration_in_traffic || leg.duration;
  return {
    minutes: Math.max(1, Math.round(duration.value / 60)),
    distanceKm: Math.round((leg.distance.value / 1000) * 10) / 10,
    durationText: duration.text,
    distanceText: leg.distance.text,
    polyline: route.overview_polyline?.points || '',
    start: leg.start_location,
    end: leg.end_location,
    withTraffic: Boolean(leg.duration_in_traffic),
  };
}

function mapsDirectionsUrl(origin, destination) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

module.exports = {
  isConfigured,
  geocodeAddress,
  reverseGeocode,
  getDrivingRoute,
  getDrivingDirections,
  mapsDirectionsUrl,
  parseAddressComponents,
};
