const router = require('express').Router();
const ctrl = require('../controllers/deliveryZoneController');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const s = require('../utils/schemas');

// Public
router.get('/check', ctrl.check);
router.get('/', ctrl.list);

// Admin only
router.post('/', [authRequired, requireAdmin], validateBody(s.deliveryZone), ctrl.create);
router.put('/:id', [authRequired, requireAdmin], validateBody(s.deliveryZone), ctrl.update);
router.delete('/:id', [authRequired, requireAdmin], ctrl.remove);

module.exports = router;
