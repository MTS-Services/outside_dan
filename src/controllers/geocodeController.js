const distanceService = require('../services/distanceService');
const googleMaps = require('../services/googleMapsService');

async function zoneCenter(req, res, next) {
  try {
    if (!googleMaps.isConfigured()) {
      return res.status(503).json({ error: 'Google Maps API nicht konfiguriert' });
    }
    const { postalCode, label } = req.query;
    if (!postalCode) return res.status(400).json({ error: 'postalCode erforderlich' });
    const center = await distanceService.geocodeZoneCenter(postalCode, label || '');
    if (!center) return res.status(404).json({ error: 'Gebiet konnte nicht auf der Karte gefunden werden' });
    res.json(center);
  } catch (e) { next(e); }
}

async function reverse(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat und lon erforderlich' });
    }
    const result = await distanceService.reverseGeocode(lat, lon);
    if (!result) {
      return res.status(404).json({ error: 'Keine Straße an dieser Position gefunden. Bitte Pin näher an eine Straße setzen.' });
    }
    if (result.error) return res.status(503).json({ error: result.error });
    if (!result.streetName) {
      return res.status(404).json({ error: 'Keine Straße an dieser Position gefunden. Bitte Pin näher an eine Straße setzen.' });
    }
    res.json(result);
  } catch (e) { next(e); }
}

async function driveRoute(req, res, next) {
  try {
    if (!googleMaps.isConfigured()) {
      return res.status(503).json({ error: 'Google Maps API nicht konfiguriert' });
    }
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat und lon erforderlich' });
    }

    const resolved = await distanceService.resolveRouteEndpoints({
      lat,
      lon,
      street: req.query.street,
      houseNumber: req.query.houseNumber,
      postalCode: req.query.postalCode,
      city: req.query.city,
      label: req.query.label,
    });
    if (resolved.error) return res.status(503).json({ error: resolved.error });

    const { origin, dest, end, restaurantStart, originAddress, destinationLabel } = resolved;
    let route = await googleMaps.getDrivingDirections(origin, dest);

    if (route?.error || !route?.polyline) {
      const matrix = await googleMaps.getDrivingRoute(origin, dest);
      if (!matrix) {
        return res.status(502).json({
          error: route?.error?.includes('REQUEST_DENIED')
            ? 'Directions API nicht aktiviert. Bitte in Google Cloud Console aktivieren.'
            : (route?.error || 'Route konnte nicht berechnet werden'),
        });
      }
      route = {
        ...matrix,
        polyline: '',
        start: restaurantStart,
        end,
      };
    } else {
      route.start = route.start || restaurantStart;
      route.end = end;
    }

    const maxMinutes = await distanceService.getMaxDeliveryMinutes();
    res.json({
      ...route,
      maxMinutes,
      tooFar: route.minutes > maxMinutes,
      origin: originAddress,
      destination: destinationLabel,
    });
  } catch (e) { next(e); }
}

module.exports = { zoneCenter, reverse, driveRoute };
