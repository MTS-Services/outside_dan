/**
 * Push subscription endpoints.
 *   GET  /api/push/public-key      → returns VAPID public key
 *   POST /api/push/subscribe       → save sub (optional auth → linked to user)
 *   POST /api/push/subscribe-kitchen → admin/staff only, marks sub as kitchen
 *   POST /api/push/unsubscribe     → remove sub by endpoint
 *   POST /api/push/test            → send test push to current user (or kitchen)
 */
const router = require('express').Router();
const push = require('../services/pushService');
const { authRequired, requireRole } = require('../middlewares/auth');
const { optionalAuth } = require('../middlewares/optionalAuth');

router.get('/public-key', (req, res) => {
  res.json({ publicKey: push.getPublicKey() });
});

router.post('/subscribe', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub || null;
    const deviceName = req.body.deviceName || null;
    await push.saveSubscription({ subscription: req.body.subscription, userId, deviceName });
    // Also flip pushEnabled=true on the user so pushToUser() doesn't skip them
    if (userId) {
      const prisma = require('../config/prisma');
      await prisma.user.update({ where: { id: userId }, data: { pushEnabled: true } });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post(
  '/subscribe-kitchen',
  authRequired,
  requireRole('ADMIN', 'SUBADMIN', 'STAFF'),
  async (req, res, next) => {
    try {
      await push.saveSubscription({
        subscription: req.body.subscription,
        userId: req.user.sub,
        isKitchen: true,
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  },
);

router.post('/unsubscribe', async (req, res, next) => {
  try {
    if (req.body.endpoint) await push.removeSubscription(req.body.endpoint);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// List all push subscriptions for the logged-in user
router.get('/subscriptions', authRequired, async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: req.user.sub, isKitchen: false },
      select: { id: true, deviceName: true, createdAt: true, endpoint: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subs);
  } catch (e) { next(e); }
});

// Delete a specific push subscription by id (only owner can delete)
router.delete('/subscriptions/:id', authRequired, async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const sub = await prisma.pushSubscription.findUnique({ where: { id: req.params.id } });
    if (!sub || sub.userId !== req.user.sub) {
      return res.status(404).json({ error: 'Not found' });
    }
    await prisma.pushSubscription.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/test', authRequired, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUBADMIN' || req.user.role === 'STAFF') {
      await push.pushToKitchen({
        title: 'Tarantella – Test',
        body: 'Push-Benachrichtigungen funktionieren ✓',
        icon: '/uploads/logo.png',
        url: '/admin',
      });
    } else {
      await push.pushToUser(req.user.sub, {
        title: 'Tarantella – Test',
        body: 'Push-Benachrichtigungen funktionieren ✓',
        icon: '/uploads/logo.png',
        url: '/account',
      });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
