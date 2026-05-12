const router = require('express').Router();
const ctrl = require('../controllers/siteSettingController');
const { authRequired, requireAdmin } = require('../middlewares/auth');

// Public read
router.get('/', ctrl.getAll);

// Admin write
router.put('/', authRequired, requireAdmin, ctrl.upsertAll);

module.exports = router;
