const router = require('express').Router();
const ctrl = require('../controllers/siteSettingController');
const { authRequired, requireAdmin, requireStaff } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const s = require('../utils/schemas');

// Public read
router.get('/', ctrl.getAll);

// Subadmin + Admin: toggle online orders on/off
router.patch('/orders-accepted', authRequired, requireStaff, validateBody(s.ordersAccepted), ctrl.setOrdersAccepted);

// Admin write (all settings)
router.put('/', authRequired, requireAdmin, ctrl.upsertAll);

module.exports = router;
