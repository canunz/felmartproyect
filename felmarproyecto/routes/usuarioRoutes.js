// routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { isAuthenticated, hasRole } = require('../middlewares/auth');
const { loginLimiter } = require('../middlewares/rateLimiter');

// ==================== RUTAS PÚBLICAS ====================

// Registro
router.get('/registro', usuarioController.mostrarRegistro);
router.post('/registro', usuarioController.registrar);

// Login y Logout
router.get('/login', usuarioController.mostrarLogin);
router.post('/login', loginLimiter, usuarioController.login);
router.get('/logout', usuarioController.logout);

// Recuperación de contraseña
router.get('/olvide-password', usuarioController.mostrarOlvidePassword);
router.post('/olvide-password', usuarioController.enviarResetPassword);
router.get('/reset-password/:token', usuarioController.mostrarResetPassword);
router.post('/reset-password/:token', usuarioController.resetPassword);

// ==================== RUTAS PROTEGIDAS ====================

// Cambiar contraseña (requiere estar logueado)
router.get('/cambiar-password', isAuthenticated, usuarioController.mostrarCambiarPassword);
router.post('/cambiar-password', isAuthenticated, usuarioController.cambiarPassword);

// ==================== RUTAS DE ADMINISTRACIÓN ====================
// Solo administradores pueden gestionar usuarios

// Listar usuarios
router.get('/', hasRole(['administrador']), usuarioController.listarUsuarios);

// Crear usuario
router.get('/crear', hasRole(['administrador']), usuarioController.mostrarCrearUsuario);
router.post('/crear', hasRole(['administrador']), usuarioController.crearUsuario);

// Editar usuario
router.get('/editar/:id', hasRole(['administrador']), usuarioController.mostrarEditarUsuario);
router.post('/editar/:id', hasRole(['administrador']), usuarioController.editarUsuario);

// Eliminar usuario
router.post('/eliminar/:id', hasRole(['administrador']), usuarioController.eliminarUsuario); // Cambié a POST por seguridad

module.exports = router;