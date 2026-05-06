const prisma = require('../config/prisma');
const { ApiError } = require('../middlewares/error');

async function list(req, res, next) {
  try {
    const zones = await prisma.deliveryZone.findMany({ orderBy: { postalCode: 'asc' } });
    res.json(zones);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const zone = await prisma.deliveryZone.create({ data: req.body });
    res.status(201).json(zone);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const zone = await prisma.deliveryZone.update({ where: { id: req.params.id }, data: req.body });
    res.json(zone);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    await prisma.deliveryZone.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// GET /api/delivery-zones/check?postalCode=1220 — public lookup
async function check(req, res, next) {
  try {
    const { postalCode } = req.query;
    if (!postalCode) return res.status(400).json({ error: 'postalCode erforderlich' });
    const zone = await prisma.deliveryZone.findFirst({
      where: { postalCode: postalCode.trim(), isActive: true },
    });
    if (!zone) return res.json({ available: false });
    res.json({
      available: true,
      deliveryFee: Number(zone.deliveryFee),
      minimumOrder: Number(zone.minimumOrder),
      label: zone.label || zone.postalCode,
    });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove, check };
