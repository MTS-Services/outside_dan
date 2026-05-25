const router = require('express').Router();
const ctrl = require('../controllers/legalPageController');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const s = require('../utils/schemas');

router.get('/admin/all', authRequired, requireAdmin, ctrl.getAll);
router.post('/admin', authRequired, requireAdmin, validateBody(s.legalPage), ctrl.create);
router.put('/admin/:id', authRequired, requireAdmin, validateBody(s.legalPage), ctrl.update);
router.delete('/admin/:id', authRequired, requireAdmin, ctrl.remove);

router.get('/', ctrl.getPublicList);
router.get('/:slug', ctrl.getPublicPage);

module.exports = router;
