const express = require('express');
const router = express.Router();
const reservaCtrl = require('../controllers/reserva.controller');

router.get('/cancha/:canchaId/horarios', reservaCtrl.getHorariosDisponibles);
router.post('/', reservaCtrl.crearReserva);
router.get('/mis-reservas', reservaCtrl.getMisReservas);
router.get('/complejo/:complejoId', reservaCtrl.getReservasPorComplejo);
router.get('/', reservaCtrl.getReservas);

module.exports = router;
