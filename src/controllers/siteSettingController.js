const siteSettingService = require('../services/siteSettingService');

// GET /api/site-settings  — public, returns all as { key: value }
async function getAll(req, res, next) {
  try {
    res.json(await siteSettingService.getAllSettings());
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

module.exports = { getAll, upsertAll };
