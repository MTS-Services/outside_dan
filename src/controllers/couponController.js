const prisma = require('../config/prisma');
const r2o = require('../services/r2oService');

async function list(req, res, next) {
  try {
    const [coupons, r2oDiscounts] = await Promise.all([
      prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
      r2o.listDiscountsFromR2o(),
    ]);
    // Attach r2oSynced flag so the frontend can show discount sync status
    const r2oIds = new Set(r2oDiscounts.map(d => String(d.discount_id || d.id)));
    const result = coupons.map(c => ({
      ...c,
      r2oSynced: c.r2oDiscountId ? r2oIds.has(String(c.r2oDiscountId)) : false,
    }));
    res.json(result);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, code: req.body.code.toUpperCase() };
    const coupon = await prisma.coupon.create({ data });
    // Sync to Ready2Order as a discount and store the returned discount_id
    const r2oDiscountId = await r2o.createDiscountInR2o(coupon);
    if (r2oDiscountId) {
      await prisma.coupon.update({ where: { id: coupon.id }, data: { r2oDiscountId: String(r2oDiscountId) } });
      coupon.r2oDiscountId = String(r2oDiscountId);
    }
    res.status(201).json(coupon);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.code) data.code = data.code.toUpperCase();
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
    // Sync update to Ready2Order discount (best-effort)
    if (coupon.r2oDiscountId) {
      r2o.updateDiscountInR2o(coupon.r2oDiscountId, coupon).catch(() => {});
    }
    res.json(coupon);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    await prisma.coupon.delete({ where: { id: req.params.id } });
    // Delete the corresponding R2O discount so it can be recreated with the same name
    if (coupon?.r2oDiscountId) {
      r2o.deleteDiscountInR2o(coupon.r2oDiscountId).catch(() => {});
    }
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

