// routes/certificadoRoutes.js
const express = require('express');
const router = express.Router();
const certificadoController = require('../controllers/certificadoController');
const auth = require('../middlewares/auth');

// Rutas para la vista de certificados del cliente
router.get('/clientes/certificados', auth.isAuthenticated, certificadoController.listarCertificadosCliente);
router.get('/clientes/certificados/descargar/:id', auth.isAuthenticated, certificadoController.descargarPDF);

// Ruta API para obtener los datos de certificados
router.get('/api/certificados/cliente', auth.isAuthenticated, certificadoController.obtenerCertificadosCliente);

// Obtener certificados de un cliente por RUT
router.get('/api/certificados/cliente/:clienteId', certificadoController.obtenerPorCliente);

// Crear certificado desde visita (con archivo PDF)
router.post(
  '/api/certificados/crear-desde-visita',
  certificadoController.uploadMiddleware, // Para manejar el archivo PDF
  certificadoController.crearDesdeVisita
);

// Rutas administrativas
router.get('/admin/certificados', auth.isAuthenticated, certificadoController.listar);
router.get('/admin/certificados/descargar/:id', auth.isAuthenticated, certificadoController.descargarPDF);
router.get('/admin/certificados/crear', auth.hasRole(['administrador', 'operador']), certificadoController.mostrarCrear);
router.post('/admin/certificados/crear', auth.hasRole(['administrador', 'operador']), certificadoController.uploadMiddleware, certificadoController.crear);
router.get('/admin/certificados/editar/:id', auth.hasRole(['administrador', 'operador']), certificadoController.mostrarEditar);
router.post('/admin/certificados/editar/:id', auth.hasRole(['administrador', 'operador']), certificadoController.uploadMiddleware, certificadoController.editar);
router.post('/admin/certificados/eliminar/:id', auth.hasRole(['administrador', 'operador']), certificadoController.eliminar);

module.exports = router;