const router = require('express').Router();
const ctrl = require('../controllers/couponController');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const s = require('../utils/schemas');

// Public: validate a coupon code
router.post('/validate', ctrl.validate);

// Admin only
router.get('/', [authRequired, requireAdmin], ctrl.list);
router.post('/', [authRequired, requireAdmin], validateBody(s.coupon), ctrl.create);
router.put('/:id', [authRequired, requireAdmin], validateBody(s.coupon), ctrl.update);
router.delete('/:id', [authRequired, requireAdmin], ctrl.remove);

module.exports = router;
