const router = require('express').Router();
const ctrl = require('../controllers/paypalController');
const { validateBody } = require('../middlewares/validate');
const s = require('../utils/schemas');

router.get('/config', ctrl.config);
router.post('/create-order', validateBody(s.paypalCreate), ctrl.createOrder);
router.post('/capture-order', ctrl.captureOrder);

module.exports = router;
