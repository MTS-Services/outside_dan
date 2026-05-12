const prisma = require('../config/prisma');

// GET /api/site-settings  — public, returns all as { key: value }
async function getAll(req, res, next) {
  try {
    const rows = await prisma.siteSetting.findMany();
    const out = {};
    for (const r of rows) {
      try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
    }
    res.json(out);
  } catch (err) { next(err); }
}

// PUT /api/site-settings  — admin, body: { key: value, ... }
async function upsertAll(req, res, next) {
  try {
    const entries = Object.entries(req.body || {});
    await Promise.all(entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: typeof value === 'string' ? value : JSON.stringify(value) },
        update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
      })
    ));
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { getAll, upsertAll };
