const express = require('express');
const router = express.Router();
const canchaCtrl = require('../controllers/cancha.controller');

router.get('/', canchaCtrl.getCanchas);
router.get('/complejo/:complejoId', canchaCtrl.getCanchasPorComplejo);
router.get('/buscar', canchaCtrl.buscarCanchasPorNombre);
router.post('/', canchaCtrl.crearCancha);

module.exports = router;
