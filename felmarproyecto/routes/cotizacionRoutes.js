// routes/cotizacionRoutes.js
const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const auth = require('../middlewares/auth');

// Rutas administrativas (requieren autenticación)
router.get('/', auth.isAuthenticated, cotizacionController.listar);
router.get('/detalles/:id', auth.isAuthenticated, cotizacionController.detalles);
router.get('/:id/descargar-pdf', auth.isAuthenticated, cotizacionController.descargarPdf);
router.get('/crear', auth.isAuthenticated, cotizacionController.mostrarCrear);
router.post('/crear', auth.isAuthenticated, cotizacionController.crear);
router.post('/aceptar/:id', auth.isAuthenticated, cotizacionController.aceptar);
router.post('/rechazar/:id', auth.isAuthenticated, cotizacionController.rechazar);

// ========== NUEVAS RUTAS API ==========
// API para el frontend de gestión
router.get('/api/listar', auth.isAuthenticated, cotizacionController.listarAPI);
router.get('/api/:id', auth.isAuthenticated, cotizacionController.obtenerAPI);
router.put('/api/:id/estado', auth.isAuthenticated, cotizacionController.actualizarEstadoAPI);
router.delete('/api/:id', auth.isAuthenticated, cotizacionController.eliminarAPI);

// Ruta pública de cotización (sin autenticación)
router.get('/cotizar', cotizacionController.mostrarCotizador);
router.post('/cotizar', cotizacionController.procesarCotizacionPublica);

router.get('/api/precios-residuos', cotizacionController.listarPreciosResiduos);

module.exports = router;