const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const { authRequired, requireRole } = require('../middlewares/auth');
const { optionalAuth } = require('../middlewares/optionalAuth');
const { validateBody } = require('../middlewares/validate');
const s = require('../utils/schemas');

const staff = [authRequired, requireRole('ADMIN', 'SUBADMIN')];

// Public: place a new order (auth optional)
router.post('/', optionalAuth, validateBody(s.orderCreate), ctrl.create);

// Customer dashboard: my orders
router.get('/mine/list', authRequired, ctrl.mine);

// Staff/admin
router.get('/', staff, ctrl.list);
router.get('/admin/dashboard', staff, ctrl.dashboard);

router.get('/:id/drive-time', staff, ctrl.driveTime);

// Public single order view (used for tracking link). Keep last among GETs.
router.get('/:id', ctrl.getOne);

router.post('/:id/accept', staff, validateBody(s.orderAccept), ctrl.accept);
router.post('/:id/decline', staff, validateBody(s.orderDecline), ctrl.decline);
router.post('/:id/status', staff, validateBody(s.orderStatus), ctrl.setStatus);
router.post('/:id/print', staff, ctrl.reprint);
// Edit endpoint accepts auth (staff or owner customer)
router.put('/:id', authRequired, validateBody(s.orderEdit), ctrl.edit);

module.exports = router;
