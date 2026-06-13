const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authRequired } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const schemas = require('../utils/schemas');

router.post('/login', validateBody(schemas.login), ctrl.login);
router.post('/register', validateBody(schemas.register), ctrl.register);
router.post('/resend-verification', validateBody(schemas.resendVerification), ctrl.resendVerification);
router.post('/verify-email', validateBody(schemas.verifyEmail), ctrl.verifyEmail);
router.post('/forgot-password', validateBody(schemas.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validateBody(schemas.resetPassword), ctrl.resetPassword);
router.get('/me', authRequired, ctrl.me);
router.put('/me', authRequired, validateBody(schemas.profileUpdate), ctrl.updateProfile);
router.put('/me/password', authRequired, validateBody(schemas.passwordChange), ctrl.changePassword);
router.put('/me/notifications', authRequired, validateBody(schemas.notifPrefs), ctrl.updateNotificationPrefs);

module.exports = router;
