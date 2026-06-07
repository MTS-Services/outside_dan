const prisma = require('../config/prisma');
const { ApiError } = require('../middlewares/error');

function normalizeZoneData(body) {
  return {
    ...body,
    postalCode: body.postalCode?.trim(),
    label: (body.label || '').trim(),
  };
}

async function list(req, res, next) {
  try {
    const zones = await prisma.deliveryZone.findMany({
      orderBy: [{ postalCode: 'asc' }, { label: 'asc' }],
    });
    res.json(zones);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const zone = await prisma.deliveryZone.create({ data: normalizeZoneData(req.body) });
    res.status(201).json(zone);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const zone = await prisma.deliveryZone.update({
      where: { id: req.params.id },
      data: normalizeZoneData(req.body),
    });
    res.json(zone);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    await prisma.deliveryZone.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// GET /api/delivery-zones/check?deliveryZoneId=... or ?postalCode=1220&label=...
async function check(req, res, next) {
  try {
    const { deliveryZoneId, postalCode, label } = req.query;
    let zone = null;
    if (deliveryZoneId) {
      zone = await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
      if (zone && !zone.isActive) zone = null;
    } else if (postalCode) {
      zone = await prisma.deliveryZone.findFirst({
        where: {
          postalCode: postalCode.trim(),
          label: (label || '').trim(),
          isActive: true,
        },
      });
    } else {
      return res.status(400).json({ error: 'deliveryZoneId oder postalCode erforderlich' });
    }
    if (!zone) return res.json({ available: false });
    res.json({
      available: true,
      id: zone.id,
      postalCode: zone.postalCode,
      deliveryFee: Number(zone.deliveryFee),
      minimumOrder: Number(zone.minimumOrder),
      label: zone.label || zone.postalCode,
    });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove, check };
