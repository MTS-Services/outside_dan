const router = require('express').Router();
const ctrl = require('../controllers/menuController');
const { authRequired, requireRole } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { upload } = require('../middlewares/upload');
const s = require('../utils/schemas');

// Public
router.get('/', ctrl.getPublicMenu);
router.get('/tags', ctrl.getPublicTags);
router.get('/home-categories', ctrl.getHomeCategories);
router.get('/slider-items', ctrl.getSliderItems);

// Admin + Subadmin (menu management)
const staff = [authRequired, requireRole('ADMIN', 'SUBADMIN')];

router.get('/admin/categories', staff, ctrl.getCategories);
router.post('/admin/categories', staff, validateBody(s.category), ctrl.createCategory);
router.put('/admin/categories/:id', staff, validateBody(s.category), ctrl.updateCategory);
router.delete('/admin/categories/:id', staff, ctrl.deleteCategory);

router.get('/admin/items', staff, ctrl.getMenuItems);
router.post('/admin/items', staff, validateBody(s.menuItem), ctrl.createMenuItem);
router.put('/admin/items/:id', staff, validateBody(s.menuItem), ctrl.updateMenuItem);
router.delete('/admin/items/:id', staff, ctrl.deleteMenuItem);
router.put('/admin/items/:id/availability', staff, ctrl.setItemAvailability);
router.put('/admin/items/:id/slider', staff, ctrl.setSliderItem);

router.get('/admin/tags', staff, ctrl.getTags);
router.post('/admin/tags', staff, validateBody(s.tag), ctrl.createTag);
router.put('/admin/tags/:id', staff, validateBody(s.tag), ctrl.updateTag);
router.delete('/admin/tags/:id', staff, ctrl.deleteTag);
router.post('/admin/tags/:id/image', staff, upload.single('image'), ctrl.uploadTagImage);

router.get('/admin/extras', staff, ctrl.getExtras);
router.post('/admin/extras', staff, validateBody(s.extra), ctrl.createExtra);
router.put('/admin/extras/:id', staff, validateBody(s.extra), ctrl.updateExtra);
router.delete('/admin/extras/:id', staff, ctrl.deleteExtra);

router.post('/admin/upload', staff, upload.single('image'), ctrl.uploadImage);
router.post('/admin/upload-url', staff, ctrl.uploadImageFromUrl);

module.exports = router;
