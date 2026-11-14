const express = require('express');
const router = express.Router();
const solicitudDuenioCtrl = require('../controllers/solicitud-duenio.controller');

router.post('/', solicitudDuenioCtrl.crearSolicitud);
router.get('/mis-solicitudes', solicitudDuenioCtrl.getMisSolicitudes);
router.get('/admin', solicitudDuenioCtrl.getSolicitudesAdmin);
router.patch('/admin/:id/aprobar', solicitudDuenioCtrl.aprobarSolicitud);
router.patch('/admin/:id/rechazar', solicitudDuenioCtrl.rechazarSolicitud);

module.exports = router;
