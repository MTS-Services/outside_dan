const router = require('express').Router();
const ctrl = require('../controllers/siteImageController');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

// Public — fetch current hero image for a given key
router.get('/:key', ctrl.getImage);

// Admin — upload / replace image for a key
router.post('/:key', authRequired, requireAdmin, upload.single('image'), ctrl.setImage);

module.exports = router;
