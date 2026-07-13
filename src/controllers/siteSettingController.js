const siteSettingService = require('../services/siteSettingService');

// GET /api/site-settings  — public, returns all non-secret settings as { key: value }
async function getAll(req, res, next) {
  try {
    res.json(await siteSettingService.getPublicSettings());
  } catch (err) {
    next(err);
  }
}

// PUT /api/site-settings  — admin, body: { key: value, ... }
async function upsertAll(req, res, next) {
  try {
    await siteSettingService.upsertMany(req.body || {});
    res.json(await siteSettingService.getAllSettings());
  } catch (err) {
    next(err);
  }
}

async function setOrdersAccepted(req, res, next) {
  try {
    const orders_accepted = req.body.orders_accepted !== false;
    await siteSettingService.upsertMany({ orders_accepted });
    res.json({ orders_accepted });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/site-settings/delivery-schedule — staff, body: { enabled, schedule }
async function setDeliverySchedule(req, res, next) {
  try {
    const delivery_schedule_enabled = req.body.enabled === true;
    const delivery_schedule = siteSettingService.normalizeDeliverySchedule(req.body.schedule);
    await siteSettingService.upsertMany({ delivery_schedule_enabled, delivery_schedule });
    res.json({ delivery_schedule_enabled, delivery_schedule });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, upsertAll, setOrdersAccepted, setDeliverySchedule };
