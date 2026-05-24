const router = require('express').Router();
const ctrl = require('../controllers/menuController');
const { authRequired, requireRole, requireAdmin } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { upload } = require('../middlewares/upload');
const s = require('../utils/schemas');

// Public
router.get('/', ctrl.getPublicMenu);
router.get('/tags', ctrl.getPublicTags);
router.get('/home-categories', ctrl.getHomeCategories);
router.get('/slider-items', ctrl.getSliderItems);

// Admin (CRUD) — Subadmin can view but only Admin can mutate menu
const staff = [authRequired, requireRole('ADMIN', 'SUBADMIN')];
const adminOnly = [authRequired, requireAdmin];

router.get('/admin/categories', staff, ctrl.getCategories);
router.post('/admin/categories', adminOnly, validateBody(s.category), ctrl.createCategory);
router.put('/admin/categories/:id', adminOnly, validateBody(s.category), ctrl.updateCategory);
router.delete('/admin/categories/:id', adminOnly, ctrl.deleteCategory);

router.get('/admin/items', staff, ctrl.getMenuItems);
router.post('/admin/items', adminOnly, validateBody(s.menuItem), ctrl.createMenuItem);
router.put('/admin/items/:id', adminOnly, validateBody(s.menuItem), ctrl.updateMenuItem);
router.delete('/admin/items/:id', adminOnly, ctrl.deleteMenuItem);
router.put('/admin/items/:id/availability', adminOnly, ctrl.setItemAvailability);
router.put('/admin/items/:id/slider', adminOnly, ctrl.setSliderItem);

router.get('/admin/tags', staff, ctrl.getTags);
router.post('/admin/tags', adminOnly, validateBody(s.tag), ctrl.createTag);
router.put('/admin/tags/:id', adminOnly, validateBody(s.tag), ctrl.updateTag);
router.delete('/admin/tags/:id', adminOnly, ctrl.deleteTag);
router.post('/admin/tags/:id/image', adminOnly, upload.single('image'), ctrl.uploadTagImage);

router.get('/admin/extras', staff, ctrl.getExtras);
router.post('/admin/extras', adminOnly, validateBody(s.extra), ctrl.createExtra);
router.put('/admin/extras/:id', adminOnly, validateBody(s.extra), ctrl.updateExtra);
router.delete('/admin/extras/:id', adminOnly, ctrl.deleteExtra);

// Image upload: file or fetch by URL
router.post('/admin/upload', adminOnly, upload.single('image'), ctrl.uploadImage);
router.post('/admin/upload-url', adminOnly, ctrl.uploadImageFromUrl);

module.exports = router;
