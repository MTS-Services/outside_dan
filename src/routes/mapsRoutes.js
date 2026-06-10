const router = require('express').Router();
const ctrl = require('../controllers/mapsController');

router.get('/config', ctrl.getConfig);

module.exports = router;
