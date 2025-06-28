const express = require('express');
const router = express.Router();
const precioresiduosController = require('../controllers/PrecioresiduosController');
const auth = require('../middlewares/auth');

// Rutas protegidas (requieren ser administrador)
router.get('/', auth.isAdmin, precioresiduosController.mostrarAdmin);
router.post('/eliminar', auth.isAdmin, precioresiduosController.eliminarResiduos);

// CRUD: Crear y editar residuos (solo admin)
router.post('/crear', auth.isAdmin, precioresiduosController.crearResiduo);
router.post('/editar/:id', auth.isAdmin, precioresiduosController.editarResiduo);

// Rutas públicas para cotizaciones
router.get('/listar', precioresiduosController.listarPrecios);

// Rutas públicas para cotizaciones (sin autenticación requerida)
router.get('/cotizar', precioresiduosController.mostrarFormularioCotizacion);
router.post('/cotizar', precioresiduosController.procesarCotizacion);

// Rutas para administración de UF
router.get('/uf', auth.isAdmin, precioresiduosController.mostrarFormularioUF);
router.post('/uf', auth.isAdmin, precioresiduosController.actualizarUF);

module.exports = router;
