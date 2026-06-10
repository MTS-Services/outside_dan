const config = require('../config');
const distanceService = require('../services/distanceService');

async function getConfig(req, res, next) {
  try {
    const apiKey = config.googleMaps?.apiKey?.trim();
    if (!apiKey) {
      return res.status(503).json({ error: 'Google Maps nicht konfiguriert' });
    }
    const restaurantAddress = await distanceService.getRestaurantAddress();
    const maxDeliveryMinutes = await distanceService.getMaxDeliveryMinutes();
    res.json({
      apiKey,
      restaurantAddress: restaurantAddress || config.restaurant.address || 'Sonnenweg 11, 8793 Trofaiach',
      maxDeliveryMinutes,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { getConfig };
