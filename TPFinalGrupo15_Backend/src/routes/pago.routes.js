const express = require('express');
const router = express.Router();
const pagoCtrl = require('../controllers/pago.controller');

router.post('/crear-preferencia', pagoCtrl.crearPreferencia);

module.exports = router;
