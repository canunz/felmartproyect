// routes/clienteRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { Cliente, SolicitudRetiro, Usuario } = require('../models');
const bcrypt = require('bcrypt');
const pool = require('../config/database');

// Middleware de autenticación simple
const requireAuth = (req, res, next) => {
  if (!req.session.usuario) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }
  next();
};

// Middleware para admin
const requireAdmin = (req, res, next) => {
  if (!req.session.usuario || req.session.usuario.rol !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado'
    });
  }
  next();
};

// === RUTAS DE VISTAS PARA CLIENTES ===

// Dashboard principal de clientes
router.get('/', requireAuth, clienteController.renderDashboard);

// Solicitudes de clientes
router.get('/solicitudes', requireAuth, clienteController.renderMisSolicitudes);

// Nueva solicitud
router.get('/solicitudes/nueva', requireAuth, (req, res) => {
  res.render('clientes/solicitudes/nueva', {
    layout: false,
    usuario: req.session.usuario,
    currentPage: 'solicitudes'
  });
});

// Cotizaciones de clientes
router.get('/cotizaciones', requireAuth, (req, res) => {
  res.render('clientes/cotizaciones', {
    layout: false,
    usuario: req.session.usuario,
    currentPage: 'cotizaciones'
  });
});

// Certificados de clientes
router.get('/certificados', requireAuth, (req, res) => {
  res.render('clientes/certificados', {
    layout: false,
    usuario: req.session.usuario,
    currentPage: 'certificados'
  });
});

// Ruta para certificados (para que lo implemente tu compañera)
router.get('/clientes/certificados', requireAuth, (req, res) => {
  res.render('clientes/certificados', {
    layout: false,
    usuario: req.session.usuario,
    currentPage: 'certificados'
  });
});

// Calendario de clientes
router.get('/calendario', requireAuth, (req, res) => {
  res.render('clientes/calendario', {
    layout: false,
    usuario: req.session.usuario,
    currentPage: 'calendario'
  });
});

// Perfil de cliente
router.get('/perfil/miperfil', requireAuth, clienteController.renderMiPerfil);

// Redirección de perfil
router.get('/perfil', requireAuth, (req, res) => {
  res.redirect('/clientes/perfil/miperfil');
});

// Cambiar contraseña
router.get('/perfil/cambiar-password', requireAuth, (req, res) => {
  res.render('clientes/perfil/cambiar-password', {
    layout: false,
    usuario: req.session.usuario,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// Ayuda y soporte
router.get('/ayuda-soporte', requireAuth, (req, res) => {
  res.render('clientes/ayuda-soporte', {
    layout: false,
    usuario: req.session.usuario,
    currentPage: 'ayuda-soporte'
  });
});

// Editar perfil de cliente
router.get('/perfil/editar', requireAuth, (req, res) => {
  res.render('clientes/perfil/editar', {
    layout: false,
    usuario: req.session.usuario
  });
});

// Actualizar perfil de cliente
router.post('/perfil/actualizar', requireAuth, async (req, res) => {
  try {
    console.log('BODY RECIBIDO:', req.body);
    const usuarioId = req.session.usuario.id;
    // Actualiza datos personales en Usuario
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      console.log('NO SE ENCONTRÓ USUARIO');
      return res.json({ success: false, error: 'Usuario no encontrado' });
    }
    usuario.nombre = req.body.nombre;
    usuario.email = req.body.email;
    usuario.telefono = req.body.telefono;
    await usuario.save();

    // Actualiza la sesión con los nuevos datos
    req.session.usuario.nombre = usuario.nombre;
    req.session.usuario.email = usuario.email;
    req.session.usuario.telefono = usuario.telefono;

    // Actualiza datos de Cliente
    const cliente = await Cliente.findOne({ where: { usuario_id: usuarioId } });
    if (!cliente) {
      console.log('NO SE ENCONTRÓ CLIENTE');
      return res.json({ success: false, error: 'Cliente no encontrado' });
    }
    cliente.nombre_empresa = req.body.nombre_empresa;
    cliente.contacto_principal = req.body.contacto_principal;
    cliente.direccion = req.body.direccion;
    cliente.comuna_id = req.body.comuna_id;
    cliente.region_id = req.body.region_id;
    cliente.telefono = req.body.telefono;
    await cliente.save();

    console.log('USUARIO Y CLIENTE ACTUALIZADOS CORRECTAMENTE');
    res.json({ success: true, message: 'Perfil actualizado correctamente.', perfil: { usuario, cliente } });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.json({ success: false, error: 'Error al actualizar el perfil' });
  }
});

// === RUTAS API PARA CLIENTES ===

// API para obtener visitas del cliente para el calendario
router.get('/api/mis-visitas', requireAuth, clienteController.obtenerMisVisitas);

// API para obtener estadísticas del cliente para el dashboard
router.get('/api/mis-estadisticas', requireAuth, clienteController.obtenerMisEstadisticas);

// API para aceptar una visita
router.put('/api/visitas/:id/aceptar', requireAuth, clienteController.aceptarVisita);

// API para rechazar una visita
router.put('/api/visitas/:id/rechazar', requireAuth, clienteController.rechazarVisita);

// Listar clientes (solo admin)
router.get('/api/clientes', requireAuth, requireAdmin, clienteController.listarClientes);

// Obtener cliente específico
router.get('/api/clientes/:id', requireAuth, clienteController.obtenerCliente);

// Crear cliente (solo admin)
router.post('/api/clientes', requireAuth, requireAdmin, clienteController.crearCliente);

// Actualizar cliente
router.put('/api/clientes/:id', requireAuth, clienteController.actualizarCliente);

// Eliminar cliente (solo admin)
router.delete('/:rut', requireAuth, requireAdmin, clienteController.eliminarCliente);

// Crear solicitud de cliente
router.post('/api/clientes/solicitudes', requireAuth, async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      where: { usuarioId: req.session.usuario.id }
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const {
      tipoResiduo,
      cantidad,
      unidad,
      descripcion,
      fechaPreferida,
      urgencia,
      ubicacion,
      direccionEspecifica,
      contactoNombre,
      contactoTelefono,
      observaciones
    } = req.body;

    // Validar datos requeridos
    if (!tipoResiduo || !cantidad || !unidad || !direccionEspecifica || !contactoNombre || !contactoTelefono) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    // Generar número de solicitud
    const ultimaSolicitud = await SolicitudRetiro.findOne({
      order: [['id', 'DESC']]
    });
    const numeroSolicitud = `SR-${String((ultimaSolicitud ? ultimaSolicitud.id + 1 : 1)).padStart(4, '0')}`;

    // Crear la solicitud
    const solicitud = await SolicitudRetiro.create({
      clienteId: cliente.id,
      numeroSolicitud,
      tipoResiduo,
      cantidad,
      unidad,
      descripcion,
      fechaPreferida: fechaPreferida || null,
      urgencia: urgencia || 'normal',
      ubicacion,
      direccionEspecifica,
      contactoNombre,
      contactoTelefono,
      observaciones,
      estado: 'pendiente'
    });

    res.json({
      success: true,
      message: 'Solicitud creada exitosamente',
      solicitud: {
        id: solicitud.id,
        numeroSolicitud: solicitud.numeroSolicitud,
        estado: solicitud.estado
      }
    });

  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la solicitud',
      error: error.message
    });
  }
});

// Cambiar contraseña
router.post('/perfil/cambiar-password', requireAuth, async (req, res) => {
  try {
    const { id } = req.session.usuario;
    const { password_actual, password_nuevo, password_confirmar } = req.body;
    
    // Validar que la nueva contraseña y la confirmación coincidan
    if (password_nuevo !== password_confirmar) {
      req.flash('error', 'Las contraseñas nuevas no coinciden');
      return res.redirect('/clientes/perfil/cambiar-password');
    }
    
    // Obtener contraseña actual
    const [usuarios] = await pool.query(
      'SELECT password FROM usuarios WHERE id = ?',
      [id]
    );
    
    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(password_actual, usuarios[0].password);
    if (!passwordMatch) {
      req.flash('error', 'La contraseña actual es incorrecta');
      return res.redirect('/clientes/perfil/cambiar-password');
    }
    
    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password_nuevo, salt);
    
    // Actualizar contraseña
    await pool.query(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    
    req.flash('success', 'Contraseña actualizada exitosamente');
    res.redirect('/clientes/perfil/cambiar-password');
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    req.flash('error', 'Error al cambiar la contraseña');
    res.redirect('/clientes/perfil/cambiar-password');
  }
});

module.exports = router;