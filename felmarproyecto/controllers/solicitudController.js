// controllers/solicitudController.js
const { SolicitudRetiro, Cliente, Usuario, Notificacion } = require('../models');
const { sendMailWithRetry } = require('../config/email.config');
const { emailTemplates } = require('../templates/emailTemplates');

const solicitudController = {
  // Listar solicitudes (filtradas según rol)
  listar: async (req, res) => {
    try {
      let solicitudes = [];
      const { usuario } = req.session;
      
      if (usuario.rol === 'administrador') {
        // Admin ve todas las solicitudes
        solicitudes = await SolicitudRetiro.findAll({
          include: [{ 
            model: Cliente,
            as: 'cliente'
          }],
          order: [['created_at', 'DESC']]
        });
      } else if (usuario.rol === 'cliente') {
        // Cliente solo ve sus solicitudes
        solicitudes = await SolicitudRetiro.findAll({
          where: { cliente_id: req.session.cliente.rut },
          order: [['created_at', 'DESC']]
        });
      }
      
      res.render('solicitudes/listar', {
        titulo: 'Solicitudes',
        solicitudes,
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al listar solicitudes:', error);
      req.flash('error', 'Error al cargar la lista de solicitudes');
      res.redirect('/dashboard');
    }
  },

  // Ver detalles de una solicitud
  detalles: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      const solicitud = await SolicitudRetiro.findByPk(id, {
        include: [{ model: Cliente }]
      });
      
      if (!solicitud) {
        req.flash('error', 'Solicitud no encontrada');
        return res.redirect('/solicitudes');
      }
      
      // Verificar acceso para clientes
      if (usuario.rol === 'cliente' && solicitud.cliente_id !== req.session.cliente_id) {
        req.flash('error', 'No tienes permiso para ver esta solicitud');
        return res.redirect('/solicitudes');
      }
      
      res.render('solicitudes/detalles', {
        titulo: 'Detalles de Solicitud',
        solicitud,
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar detalles de solicitud:', error);
      req.flash('error', 'Error al cargar detalles de la solicitud');
      res.redirect('/solicitudes');
    }
  },

  // Mostrar formulario de creación
  mostrarCrear: async (req, res) => {
    try {
      const { usuario } = req.session;
      
      // Verificar si el cliente tiene perfil
      if (usuario.rol === 'cliente' && !req.session.cliente_id) {
        req.flash('error', 'Debes completar tu perfil antes de crear solicitudes');
        return res.redirect('/clientes/perfil');
      }
      
      res.render('solicitudes/crear', {
        titulo: 'Nueva Solicitud',
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar formulario de creación:', error);
      req.flash('error', 'Error al cargar el formulario');
      res.redirect('/solicitudes');
    }
  },

  // Crear solicitud
  crear: async (req, res) => {
    try {
      const { usuario } = req.session;
      const { tipo_solicitud, descripcion, urgencia } = req.body;
      
      // Validar tipo de solicitud según ENUM
      const tiposSolicitudValidos = ['retiro', 'evaluacion', 'cotizacion', 'visitas', 'otros'];
      if (!tipo_solicitud || !tiposSolicitudValidos.includes(tipo_solicitud)) {
        req.flash('error', 'Tipo de solicitud no válido');
        return res.redirect('/solicitudes/crear');
      }

      // Validar urgencia según ENUM
      const urgenciasValidas = ['baja', 'media', 'alta'];
      if (urgencia && !urgenciasValidas.includes(urgencia)) {
        req.flash('error', 'Nivel de urgencia no válido');
        return res.redirect('/solicitudes/crear');
      }
      
      const nuevaSolicitud = await SolicitudRetiro.create({
        cliente_id: req.session.cliente.rut,
        tipo_solicitud,
        descripcion,
        urgencia: urgencia || 'media',
        estado: 'pendiente'
      });

      // Obtener información del cliente para el correo
      const cliente = await Cliente.findByPk(req.session.cliente.rut);
      
      // Notificar a administradores
      const admins = await Usuario.findAll({
        where: { rol: 'administrador' }
      });
      
      for (const admin of admins) {
        // Crear notificación en el sistema
        await Notificacion.create({
          usuarioId: admin.id,
          tipo: 'solicitud',
          titulo: 'Nueva solicitud',
          mensaje: `Se ha registrado una nueva solicitud de ${tipo_solicitud}`,
          referenciaId: nuevaSolicitud.id
        });

        // Enviar correo electrónico
        try {
          await sendMailWithRetry({
            to: admin.email,
            subject: 'Nueva Solicitud de Retiro - Felmart',
            html: emailTemplates.nuevaSolicitud({
              numeroSolicitud: nuevaSolicitud.id,
              tipoSolicitud: tipo_solicitud,
              urgencia: urgencia || 'media',
              descripcion,
              cliente: {
                nombre: cliente.nombre_empresa,
                rut: cliente.rut,
                email: cliente.email,
                telefono: cliente.telefono
              },
              fecha: new Date().toLocaleDateString('es-ES')
            })
          });
        } catch (emailError) {
          console.error('Error al enviar correo:', emailError);
          // No detenemos el flujo si falla el envío de correo
        }
      }
      
      req.flash('success', 'Solicitud creada correctamente');
      res.redirect('/solicitudes');
    } catch (error) {
      console.error('Error al crear solicitud:', error);
      req.flash('error', 'Error al crear la solicitud');
      res.redirect('/solicitudes/crear');
    }
  },

  // Mostrar formulario de edición
  mostrarEditar: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      const solicitud = await SolicitudRetiro.findByPk(id, {
        include: [{ model: Cliente }]
      });
      
      if (!solicitud) {
        req.flash('error', 'Solicitud no encontrada');
        return res.redirect('/solicitudes');
      }
      
      // Verificar permisos
      if (usuario.rol === 'cliente') {
        if (solicitud.cliente_id !== req.session.cliente_id) {
          req.flash('error', 'No tienes permiso para editar esta solicitud');
          return res.redirect('/solicitudes');
        }
        
        if (solicitud.estado !== 'pendiente') {
          req.flash('error', 'Solo puedes editar solicitudes pendientes');
          return res.redirect(`/solicitudes/detalles/${id}`);
        }
      }
      
      res.render('solicitudes/editar', {
        titulo: 'Editar Solicitud',
        solicitud,
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario');
      res.redirect('/solicitudes');
    }
  },

  // Editar solicitud
  editar: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      const { tipo_solicitud, descripcion, urgencia } = req.body;
      
      const solicitud = await SolicitudRetiro.findByPk(id);
      
      if (!solicitud) {
        req.flash('error', 'Solicitud no encontrada');
        return res.redirect('/solicitudes');
      }
      
      // Verificar permisos
      if (usuario.rol === 'cliente') {
        if (solicitud.cliente_id !== req.session.cliente_id) {
          req.flash('error', 'No tienes permiso para editar esta solicitud');
          return res.redirect('/solicitudes');
        }
        
        if (solicitud.estado !== 'pendiente') {
          req.flash('error', 'Solo puedes editar solicitudes pendientes');
          return res.redirect(`/solicitudes/detalles/${id}`);
        }
      }
      
      // Actualizar solicitud
      if (tipo_solicitud) solicitud.tipo_solicitud = tipo_solicitud;
      if (descripcion) solicitud.descripcion = descripcion;
      if (urgencia) solicitud.urgencia = urgencia;
      
      await solicitud.save();
      
      req.flash('success', 'Solicitud actualizada correctamente');
      res.redirect(`/solicitudes/detalles/${id}`);
    } catch (error) {
      console.error('Error al editar solicitud:', error);
      req.flash('error', 'Error al actualizar la solicitud');
      res.redirect(`/solicitudes/editar/${req.params.id}`);
    }
  },

  // Cambiar estado (solo admin)
  cambiarEstado: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      
      // Validar estado según ENUM
      const estadosValidos = ['pendiente', 'en_proceso', 'completada'];
      if (!estado || !estadosValidos.includes(estado)) {
        req.flash('error', 'Estado no válido');
        return res.redirect('/solicitudes');
      }

      const solicitud = await SolicitudRetiro.findByPk(id, {
        include: [{ 
          model: Cliente,
          as: 'cliente',
          include: [{ model: Usuario }] 
        }]
      });
      
      if (!solicitud) {
        req.flash('error', 'Solicitud no encontrada');
        return res.redirect('/solicitudes');
      }
      
      // Actualizar estado
      solicitud.estado = estado;
      await solicitud.save();
      
      // Notificar al cliente
      if (solicitud.cliente && solicitud.cliente.Usuario) {
        await Notificacion.create({
          usuarioId: solicitud.cliente.Usuario.id,
          tipo: 'solicitud',
          titulo: 'Actualización de solicitud',
          mensaje: `El estado de tu solicitud ha sido actualizado a: ${estado}`,
          referenciaId: solicitud.id
        });
      }
      
      req.flash('success', 'Estado actualizado correctamente');
      res.redirect(`/solicitudes/detalles/${id}`);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      req.flash('error', 'Error al actualizar el estado');
      res.redirect(`/solicitudes/detalles/${req.params.id}`);
    }
  }
};

module.exports = solicitudController;