const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');

router.post('/login', authCtrl.login);
router.post('/google-login', authCtrl.loginWithGoogle);
router.get('/me', authCtrl.checkAuthStatus);
router.post('/logout', authCtrl.logout);
router.post('/register', authCtrl.register);
router.get('/perfil', authCtrl.getPerfil);
router.patch('/perfil/foto', authCtrl.actualizarFotoPerfil);
router.get('/', authCtrl.getUsuarios);

module.exports = router;
