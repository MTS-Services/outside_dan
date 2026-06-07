const distanceService = require('../services/distanceService');

async function zoneCenter(req, res, next) {
  try {
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
    if (!result.streetName) {
      return res.status(404).json({ error: 'Keine Straße an dieser Position gefunden. Bitte Pin näher an eine Straße setzen.' });
    }
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = { zoneCenter, reverse };
