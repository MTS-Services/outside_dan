const router = require('express').Router();
const ctrl = require('../controllers/deliveryZoneController');
const { authRequired, requireRole } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const s = require('../utils/schemas');

const staff = [authRequired, requireRole('ADMIN', 'SUBADMIN')];

// Public
router.get('/check', ctrl.check);
router.get('/', ctrl.list);

// Admin + Subadmin
router.post('/', staff, validateBody(s.deliveryZone), ctrl.create);
router.put('/:id', staff, validateBody(s.deliveryZone), ctrl.update);
router.delete('/:id', staff, ctrl.remove);

module.exports = router;
