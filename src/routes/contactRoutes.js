const router = require('express').Router();
const ctrl = require('../controllers/contactController');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const schemas = require('../utils/schemas');

router.get('/config', ctrl.getConfig);
router.post('/', validateBody(schemas.contactSubmit), ctrl.submit);

router.use(authRequired, requireAdmin);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.patch('/:id/read', validateBody(schemas.contactRead), ctrl.markRead);
router.delete('/:id', ctrl.remove);

module.exports = router;
