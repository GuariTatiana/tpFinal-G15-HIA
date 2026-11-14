const express = require('express');
const router = express.Router();
const complejoCtrl = require('../controllers/complejo.controller');

router.post('/', complejoCtrl.createComplejo);
router.get('/', complejoCtrl.getComplejos);
router.get('/auth/mis-complejos', complejoCtrl.getMisComplejos);
router.get('/:id', complejoCtrl.getComplejoById);

module.exports = router;
