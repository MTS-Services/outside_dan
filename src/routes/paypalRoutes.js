const router = require('express').Router();
const ctrl = require('../controllers/paypalController');
const { validateBody } = require('../middlewares/validate');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const s = require('../utils/schemas');

router.get('/config', ctrl.config);
router.post('/create-order', validateBody(s.paypalCreate), ctrl.createOrder);
router.post('/capture-order', ctrl.captureOrder);

router.get('/status', authRequired, requireAdmin, ctrl.status);
router.put('/config', authRequired, requireAdmin, validateBody(s.paypalConfig), ctrl.saveConfig);
router.delete('/disconnect', authRequired, requireAdmin, ctrl.disconnect);

module.exports = router;
