const prisma = require('../config/prisma');
const r2o = require('../services/r2oService');

async function list(req, res, next) {
  try {
    const [coupons, r2oCoupons] = await Promise.all([
      prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
      r2o.listCouponsFromR2o(),
    ]);
    // Attach r2oSynced flag so the frontend can show sync status
    const r2oIds = new Set(r2oCoupons.map(c => String(c.coupon_id || c.id)));
    const result = coupons.map(c => ({
      ...c,
      r2oSynced: c.r2oCouponId ? r2oIds.has(String(c.r2oCouponId)) : false,
    }));
    res.json(result);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, code: req.body.code.toUpperCase() };
    const coupon = await prisma.coupon.create({ data });
    // Sync to Ready2Order and store the returned ID
    const r2oCouponId = await r2o.createCouponInR2o(coupon);
    if (r2oCouponId) {
      await prisma.coupon.update({ where: { id: coupon.id }, data: { r2oCouponId: String(r2oCouponId) } });
      coupon.r2oCouponId = String(r2oCouponId);
    }
    res.status(201).json(coupon);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.code) data.code = data.code.toUpperCase();
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
    // Sync update to Ready2Order (best-effort)
    if (coupon.r2oCouponId) {
      r2o.updateCouponInR2o(coupon.r2oCouponId, coupon).catch(() => {});
    }
    res.json(coupon);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    await prisma.coupon.delete({ where: { id: req.params.id } });
    // Note: we intentionally do NOT delete from R2O because R2O soft-deletes (moves to trash)
    // and still reserves the identifier — deleting causes "already exists" errors on recreate.
    res.json({ ok: true });
  } catch (e) { next(e); }
}


async function update(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.code) data.code = data.code.toUpperCase();
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
    res.json(coupon);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// POST /api/coupons/validate  – public, but requires { code, orderAmount }
async function validate(req, res, next) {
  try {
    const { code, orderAmount } = req.body;
    if (!code) return res.status(400).json({ valid: false, error: 'code erforderlich' });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!coupon || !coupon.isActive) return res.json({ valid: false, error: 'Gutscheincode ungültig' });

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) return res.json({ valid: false, error: 'Gutschein noch nicht gültig' });
    if (coupon.validUntil && now > coupon.validUntil) return res.json({ valid: false, error: 'Gutschein abgelaufen' });
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return res.json({ valid: false, error: 'Gutschein aufgebraucht' });
    }

    const amount = parseFloat(orderAmount) || 0;
    if (amount < Number(coupon.minOrder)) {
      return res.json({ valid: false, error: `Mindestbestellung €${Number(coupon.minOrder).toFixed(2)} erforderlich` });
    }

    let discount = 0;
    if (coupon.type === 'FIXED') {
      discount = Math.min(Number(coupon.value), amount);
    } else {
      discount = Math.round((amount * Number(coupon.value) / 100) * 100) / 100;
    }

    res.json({ valid: true, discount, code: coupon.code, type: coupon.type, value: Number(coupon.value) });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove, validate };
