const router = require('express').Router();
const ctrl = require('../controllers/galleryController');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

// Public
router.get('/', ctrl.list);

// Admin only
router.post('/', authRequired, requireAdmin, upload.single('image'), ctrl.create);
router.patch('/:id', authRequired, requireAdmin, ctrl.update);
router.delete('/:id', authRequired, requireAdmin, ctrl.remove);
router.put('/reorder', authRequired, requireAdmin, ctrl.reorder);

module.exports = router;
