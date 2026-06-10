const router = require('express').Router();
const ctrl = require('../controllers/geocodeController');

router.get('/zone-center', ctrl.zoneCenter);
router.get('/reverse', ctrl.reverse);
router.get('/drive-route', ctrl.driveRoute);

module.exports = router;
