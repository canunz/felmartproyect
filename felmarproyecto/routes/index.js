// routes/index.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const dashboardController = require('../controllers/dashboardController');
const clienteController = require('../controllers/clienteController');
const PrecioResiduo = require('../models/PrecioResiduo');

// Importar rutas necesarias
const dashboardRoutes = require('./dashboardRoutes');
const clienteRoutes = require('./clienteRoutes');
const apiRoutes = require('./api');
const usuarioRoutes = require('./usuarioRoutes');
const precioresiduosRoutes = require('./precioresiduosRoutes');
const visitaRoutes = require('./visitaRoutes');

// Rutas de cotizaciones
const cotizacionesRoutes = require('./cotizacionRoutes');

// En tu controlador o route handler
router.get('/', (req, res) => {
  res.render('home', {
    titulo: 'Felmart - Gestión de Residuos',
    error: req.flash('error'),
    success: req.flash('success'),
    layout: false  // Esto desactiva el layout para esta vista específica
  });
});

// routes/index.js o el archivo donde tengas tus rutas
router.get('/sobre-nosotros', (req, res) => {
  res.render('sobre-nosotros', {
    titulo: 'Sobre Nosotros - Felmart'
  });
});

// Rutas de autenticación
router.get('/registro', usuarioController.mostrarRegistro);
router.post('/registro', usuarioController.registrar);
router.get('/login', usuarioController.mostrarLogin);
router.post('/login', usuarioController.login);
router.get('/logout', usuarioController.logout);

// Ruta del dashboard
router.get('/dashboard', (req, res) => {
  // Protección restaurada: redirige a login si no hay sesión
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  
  // Redirigir según el rol como estaba originalmente
  switch (req.session.usuario.rol) {
    case 'administrador':
      return dashboardController.renderAdminDashboard(req, res);
    case 'operador':
      return res.render('dashboard/operador', {
        titulo: 'Panel de Control - Operador',
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    case 'cliente':
      return clienteController.renderDashboard(req, res);
    default:
      req.flash('error', 'Rol de usuario no válido');
      return res.redirect('/logout'); 
  }
});

// Ruta pública de residuos y precios
router.get('/residuos', async (req, res) => {
  try {
    const residuos = await PrecioResiduo.findAll();
    res.render('residuos', { residuos });
  } catch (error) {
    res.render('residuos', { residuos: [] });
  }
});

// Rutas de la aplicación
router.use('/dashboard', dashboardRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/residuos', precioresiduosRoutes);

// Rutas de clientes
router.use('/clientes', clienteRoutes);

// Rutas de visitas
router.use('/visitas', visitaRoutes);

// Rutas de la API
router.use('/api', apiRoutes);

// Rutas de cotizaciones
router.use('/cotizaciones/api', cotizacionesRoutes);

module.exports = router;