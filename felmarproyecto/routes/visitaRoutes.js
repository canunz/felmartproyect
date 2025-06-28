// routes/visitaRoutes.js
const express = require('express');
const router = express.Router();
const visitaController = require('../controllers/visitaController');
const auth = require('../middlewares/auth');
const { validarRol } = require('../middlewares/validar-rol');

// Rutas para obtener datos (usar middleware de API)
router.get('/api/visitas', auth.isAuthenticatedApi, validarRol('administrador', 'operador'), visitaController.obtenerVisitas);
router.get('/api/visitas/estadisticas', auth.isAuthenticatedApi, validarRol('administrador', 'operador'), visitaController.obtenerEstadisticas);
router.get('/api/visitas/clientes', auth.isAuthenticatedApi, validarRol('administrador', 'operador'), visitaController.obtenerClientes);
router.get('/api/visitas/:id', auth.isAuthenticatedApi, validarRol('administrador', 'operador'), visitaController.obtenerVisitaPorId);

// Rutas para crear y modificar (usar middleware de API)
router.post('/api/visitas', auth.isAuthenticatedApi, validarRol('administrador', 'operador'), visitaController.crearVisita);
router.put('/api/visitas/:id', auth.isAuthenticatedApi, validarRol('administrador', 'operador'), visitaController.actualizarVisita);
router.delete('/api/visitas/:id', auth.isAuthenticatedApi, validarRol('administrador'), visitaController.eliminarVisita);

// Ruta para que el cliente responda a la visita
router.patch('/api/visitas/:id/responder', auth.isAuthenticatedApi, validarRol('cliente'), visitaController.responderVisita);

// Ruta para la vista de administración (usar middleware web)
router.get('/admin/visitas', auth.isAuthenticated, validarRol('administrador'), (req, res) => {
    res.render('admin/visitas', {
        titulo: 'Gestión de Visitas',
        currentPage: 'visitas'
    });
});

module.exports = router;