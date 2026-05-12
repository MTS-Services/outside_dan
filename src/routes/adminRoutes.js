const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const s = require('../utils/schemas');

router.use(authRequired, requireAdmin);

// Subadmins
router.get('/subadmins', ctrl.listSubadmins);
router.post('/subadmins', validateBody(s.subadminCreate), ctrl.createSubadmin);
router.patch('/subadmins/:id', ctrl.updateSubadmin);
router.delete('/subadmins/:id', ctrl.deleteSubadmin);

// Customers
router.get('/customers', ctrl.listCustomers);
router.put('/customers/:id/block', validateBody(s.userBlock), ctrl.setUserBlocked);

// Notification settings
router.post('/notifications/test-email', ctrl.testEmailNotification);

module.exports = router;
