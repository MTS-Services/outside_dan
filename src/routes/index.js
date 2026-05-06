const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/menu', require('./menuRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/r2o', require('./r2oRoutes'));
router.use('/push', require('./pushRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/paypal', require('./paypalRoutes'));
router.use('/gallery', require('./galleryRoutes'));
router.use('/site-images', require('./siteImageRoutes'));
router.use('/site-settings', require('./siteSettingRoutes'));
router.use('/coupons', require('./couponRoutes'));
router.use('/delivery-zones', require('./deliveryZoneRoutes'));

router.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

module.exports = router;
