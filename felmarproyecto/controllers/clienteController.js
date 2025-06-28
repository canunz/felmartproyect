// controllers/clienteController.js
const { Cliente, Usuario, SolicitudRetiro, Comuna, VisitaRetiro, Cotizacion, Certificado } = require('../models');
const Region = require('../models/Region');
const { Op } = require('sequelize');

// Función para validar solo el formato del RUT chileno
const validarRut = (rut) => {
  // Eliminar puntos y guión
  const rutLimpio = rut.replace(/[.-]/g, '');
  // Validar formato básico (debe tener entre 7 y 8 dígitos + dígito verificador)
  if (!/^[0-9]{7,8}[0-9kK]$/.test(rutLimpio)) {
    return { valido: false, error: 'formato' };
  }
  return { valido: true };
};

// Función para formatear RUT
const formatearRut = (rut) => {
  // Eliminar puntos y guión
  const rutLimpio = rut.replace(/[.-]/g, '');
  
  // Separar número y dígito verificador
  const numero = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toLowerCase();
  
  // Asegurar que el número tenga 8 dígitos (rellenar con 0 a la izquierda)
  const numeroCompleto = numero.padStart(8, '0');
  
  // Formatear número con puntos
  const rutFormateado = numeroCompleto.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retornar RUT formateado con guión
  return rutFormateado + '-' + dv;
};

const clienteController = {
  // Listar todos los clientes con sus usuarios asociados
  listarClientes: async (req, res) => {
    try {
      const clientes = await Cliente.findAll({
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email', 'activo', 'nombre'],
            where: { rol: 'cliente' }
          },
          {
            model: Comuna,
            attributes: ['nombre'],
            include: [
              {
                model: Region,
                as: 'Region',
                attributes: ['nombre']
              }
            ]
          }
        ],
        attributes: [
          'rut',
          'nombre_empresa',
          'telefono',
          'contacto_principal',
          'direccion',
          'comuna_id',
          'costo_operativo_km',
          'costo_operativo_otros'
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        clientes: clientes
      });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar los clientes'
      });
    }
  },

  // Obtener un cliente específico
  obtenerCliente: async (req, res) => {
    try {
      const rut = req.params.rut || req.params.id;
      if (!rut) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar un RUT o ID de cliente válido.'
        });
      }
      const rutFormateado = formatearRut(rut);
      // Primero buscar el cliente
      const cliente = await Cliente.findOne({
        where: { rut: rutFormateado },
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email', 'activo', 'nombre'],
            where: { rol: 'cliente' }
          },
          {
            model: Comuna,
            attributes: ['nombre'],
            include: [
              {
                model: Region,
                as: 'Region',
                attributes: ['nombre']
              }
            ]
          }
        ],
        attributes: [
          'rut',
          'nombre_empresa',
          'telefono',
          'contacto_principal',
          'direccion',
          'comuna_id',
          'costo_operativo_km',
          'costo_operativo_otros'
        ]
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.json({
        success: true,
        cliente: cliente
      });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar el cliente'
      });
    }
  },

  // Crear nuevo cliente
  crearCliente: async (req, res) => {
    try {
      // Permitir ambos formatos de campos (camelCase y snake_case)
      const {
        rut,
        nombreEmpresa,
        nombre_empresa,
        email,
        telefono,
        contactoPrincipal,
        contacto_principal,
        direccion,
        comuna_id,
        comunaId,
        region_id,
        regionId
      } = req.body;

      // Normalizar campos
      const nombreEmpresaFinal = nombreEmpresa || nombre_empresa;
      const contactoPrincipalFinal = contactoPrincipal || contacto_principal;
      const comunaIdFinal = comuna_id || comunaId;
      const regionIdFinal = region_id || regionId;

      // Obtener la contraseña correctamente del body
      const passwordFinal = req.body.password;
      // Validar campos requeridos
      if (!rut || !nombreEmpresaFinal || !email || !telefono || !contactoPrincipalFinal || !direccion || !comunaIdFinal || !regionIdFinal) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son obligatorios'
        });
      }
      // Validar que la contraseña esté presente y no vacía
      if (!passwordFinal || passwordFinal.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'La contraseña es obligatoria para crear el cliente.'
        });
      }

      // Validar formato del RUT
      const resultadoRut = validarRut(rut);
      if (!resultadoRut.valido) {
        return res.status(400).json({
          success: false,
          message: 'El formato del RUT es incorrecto. Debe ser: 12.345.678-9'
        });
      }

      // Formatear RUT antes de guardar
      const rutFormateado = formatearRut(rut);

      // Verificar si ya existe un cliente con ese RUT
      const clienteExistente = await Cliente.findOne({ where: { rut: rutFormateado } });
      if (clienteExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con ese RUT'
        });
      }

      // Verificar si ya existe un usuario con ese email
      const usuarioExistente = await Usuario.findOne({ where: { email } });
      if (usuarioExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un usuario registrado con ese correo electrónico'
        });
      }

      // Validar que la región existe
      const region = await Region.findByPk(regionIdFinal);
      if (!region) {
        return res.status(400).json({
          success: false,
          message: 'La región seleccionada no existe'
        });
      }

      // Validar que la comuna existe y pertenece a la región
      const comuna = await Comuna.findOne({ where: { id: comunaIdFinal, region_id: regionIdFinal } });
      if (!comuna) {
        return res.status(400).json({
          success: false,
          message: 'La comuna seleccionada no existe o no pertenece a la región seleccionada'
        });
      }

      // Crear usuario asociado al cliente
      const usuario = await Usuario.create({
        nombre: contactoPrincipalFinal,
        email: email,
        password: passwordFinal,
        rol: 'cliente',
        activo: true
      });

      // Crear el cliente
      const nuevoCliente = await Cliente.create({
        rut: rutFormateado,
        nombre_empresa: nombreEmpresaFinal,
        telefono,
        contacto_principal: contactoPrincipalFinal,
        direccion,
        comuna_id: comunaIdFinal,
        region_id: regionIdFinal,
        usuario_id: usuario.id
      });

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        cliente: nuevoCliente
      });

    } catch (error) {
      console.error('Error al crear cliente:', error);
      // Manejar errores específicos
      if (error.name === 'SequelizeUniqueConstraintError') {
        if (error.errors && error.errors[0].path === 'email') {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un usuario registrado con ese correo electrónico'
          });
        }
        if (error.errors && error.errors[0].path === 'rut') {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un cliente con ese RUT'
          });
        }
      }
      res.status(500).json({
        success: false,
        message: 'Error al crear el cliente. Por favor, intente nuevamente.'
      });
    }
  },

  // Actualizar cliente
  actualizarCliente: async (req, res) => {
    try {
      const rut = req.params.rut || req.params.id;
      if (!rut) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar un RUT o ID de cliente válido.'
        });
      }
      const rutFormateado = formatearRut(rut);
      const { 
        nombreEmpresa, 
        email, 
        telefono, 
        contactoPrincipal, 
        direccion, 
        comuna_id,
        costo_operativo_km,
        costo_operativo_otros
      } = req.body;

      // Primero buscar el cliente con su usuario asociado
      let cliente = await Cliente.findOne({
        where: { rut: rutFormateado },
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email'],
            where: { rol: 'cliente' }
          },
          {
            model: Comuna,
            attributes: ['nombre'],
            include: [
              {
                model: Region,
                as: 'Region',
                attributes: ['nombre']
              }
            ]
          }
        ]
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Actualizar cliente
      // Si no se recibe comuna_id, mantener el valor actual
      let nuevaComunaId = comuna_id;
      if (typeof nuevaComunaId === 'undefined' || nuevaComunaId === '' || nuevaComunaId === null) {
        nuevaComunaId = cliente.comuna_id;
      }
      // --- AJUSTE PARA CAMPOS DECIMAL ---
      let costoKm = costo_operativo_km;
      let costoOtros = costo_operativo_otros;
      if (costoKm === '' || typeof costoKm === 'undefined') costoKm = null;
      if (costoOtros === '' || typeof costoOtros === 'undefined') costoOtros = null;
      await cliente.update({
        nombre_empresa: nombreEmpresa,
        telefono,
        contacto_principal: contactoPrincipal,
        direccion,
        comuna_id: nuevaComunaId,
        costo_operativo_km: costoKm,
        costo_operativo_otros: costoOtros
      });

      // Actualizar usuario asociado
      if (cliente.Usuario) {
        await Usuario.update(
          {
            nombre: contactoPrincipal,
            email: email
          },
          { 
            where: { 
              id: cliente.Usuario.id,
              rol: 'cliente'
            }
          }
        );
      }

      // Refetch para devolver el cliente actualizado con includes
      cliente = await Cliente.findOne({
        where: { rut: rutFormateado },
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email', 'activo', 'nombre'],
            where: { rol: 'cliente' }
          },
          {
            model: Comuna,
            attributes: ['nombre'],
            include: [
              {
                model: Region,
                as: 'Region',
                attributes: ['nombre']
              }
            ]
          }
        ],
        attributes: [
          'rut',
          'nombre_empresa',
          'telefono',
          'contacto_principal',
          'direccion',
          'comuna_id',
          'costo_operativo_km',
          'costo_operativo_otros'
        ]
      });

      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        cliente: cliente
      });

    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el cliente'
      });
    }
  },

  // Eliminar cliente
  eliminarCliente: async (req, res) => {
    try {
      const { rut } = req.params;
      
      if (!rut) {
        return res.status(400).json({
          success: false,
          message: 'El RUT es requerido'
        });
      }

      // Primero buscar el cliente con su usuario asociado
      const rutFormateado = formatearRut(rut);
      const cliente = await Cliente.findOne({
        where: { rut: rutFormateado },
        include: [
          {
            model: Usuario,
            attributes: ['id'],
            where: { rol: 'cliente' }
          }
        ]
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Verificar si el cliente tiene solicitudes asociadas
      const solicitudes = await SolicitudRetiro.findAll({
        where: { cliente_id: rutFormateado }
      });

      // Si tiene solicitudes, eliminarlas primero
      if (solicitudes && solicitudes.length > 0) {
        await SolicitudRetiro.destroy({ where: { cliente_id: rutFormateado } });
      }

      // Eliminar el cliente
      await Cliente.destroy({
        where: { rut: rutFormateado }
      });

      // Luego eliminar el usuario asociado
      if (cliente.Usuario) {
        await Usuario.destroy({
          where: { 
            id: cliente.Usuario.id,
            rol: 'cliente'
          }
        });
      }

      res.json({
        success: true,
        message: 'Cliente y solicitudes asociadas eliminados exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el cliente'
      });
    }
  },

  // Mostrar dashboard de clientes (render)
  mostrarDashboard: async (req, res) => {
    try {
      // Esta función renderiza la vista, las otras son para API
      res.render('admin/clientes', {
        layout: false,
        titulo: 'Gestión de Clientes',
        usuario: req.session.usuario
      });
    } catch (error) {
      console.error('Error al mostrar dashboard:', error);
      res.status(500).render('error', {
        titulo: 'Error',
        mensaje: 'Error al cargar la página'
      });
    }
  },

  // Obtener estadísticas para el dashboard del cliente
  obtenerMisEstadisticas: async (req, res) => {
    try {
      if (!req.session.usuario || !req.session.usuario.id) {
        return res.status(401).json({ success: false, message: 'No autorizado.' });
      }

      const cliente = await Cliente.findOne({ 
        where: { usuario_id: req.session.usuario.id } 
      });

      if (!cliente) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
      }

      // Consultas en paralelo para mayor eficiencia
      const [visitas, solicitudes, certificados] = await Promise.all([
        VisitaRetiro.findAll({ where: { cliente_id: cliente.rut } }),
        SolicitudRetiro.findAll({ where: { cliente_id: cliente.rut } }),
        Certificado.findAll({ where: { cliente_id: cliente.rut } })
      ]);

      // Calcular estadísticas
      const totalVisitas = visitas.length;
      const visitasPendientes = visitas.filter(v => ['pendiente', 'confirmada'].includes(v.estado)).length;
      
      const proximaVisita = visitas
        .filter(v => new Date(v.fecha) >= new Date() && ['pendiente', 'confirmada'].includes(v.estado))
        .sort((a,b) => new Date(a.fecha) - new Date(b.fecha))[0];

      const totalSolicitudes = solicitudes.length;
      const totalCertificados = certificados.length;
      
      res.json({
        success: true,
        data: {
          totalVisitas,
          visitasPendientes,
          totalCertificados,
          totalSolicitudes,
          proximaVisita: proximaVisita ? {
              fecha: proximaVisita.fecha,
              tipo: proximaVisita.tipo_visita,
              estado: proximaVisita.estado
          } : null,
          nombreCliente: cliente.nombre_empresa
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas del cliente:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  },

  // Obtener las visitas del cliente autenticado
  obtenerMisVisitas: async (req, res) => {
    try {
      console.log('Obteniendo visitas para usuario:', req.session.usuario?.id);
      
      // 1. Verificar que el usuario está en la sesión
      if (!req.session.usuario || !req.session.usuario.id) {
        console.log('Usuario no autenticado');
        // Devuelve un array vacío si no está autorizado, para que el frontend no falle
        return res.status(401).json([]);
      }

      // 2. Encontrar al cliente asociado al usuario de la sesión
      const cliente = await Cliente.findOne({ 
        where: { usuario_id: req.session.usuario.id } 
      });

      if (!cliente) {
        console.log('Cliente no encontrado para usuario:', req.session.usuario.id);
        // Devuelve un array vacío si no se encuentra el cliente
        return res.status(404).json([]);
      }

      console.log('Cliente encontrado:', cliente.rut);

      // 3. Buscar todas las visitas asociadas, incluyendo datos de la solicitud
      const visitas = await VisitaRetiro.findAll({
        where: { cliente_id: cliente.rut },
        include: [{
          model: SolicitudRetiro,
          as: 'solicitud',
          required: false // Usamos LEFT JOIN para no excluir visitas sin solicitud
        }],
        order: [['fecha', 'ASC']]
      });

      console.log(`Encontradas ${visitas.length} visitas para cliente ${cliente.rut}`);

      // 4. Formatear las visitas con los datos que el frontend espera
      const visitasData = visitas.map(visita => {
        // Combinar fecha y hora para que el frontend pueda parsearlo fácilmente
        const fechaHora = new Date(`${visita.fecha}T${visita.hora}`);

        return {
          id: visita.id,
          titulo: `Visita de ${visita.tipoVisita}`, // Para el título en FullCalendar
          fecha: fechaHora.toISOString(), // Fecha completa para parsear
          estado: visita.estado,
          tipo: visita.tipoVisita,
          observaciones: visita.observaciones,
          // Nuevos campos para la respuesta del cliente
          respuestaCliente: visita.respuestaCliente || 'pendiente',
          motivoRechazo: visita.motivoRechazo || null,
          fechaRespuestaCliente: visita.fechaRespuestaCliente || null,
          // Datos desde la solicitud asociada, con valores por defecto si no existe
          tipoResiduo: visita.solicitud ? visita.solicitud.tipo_residuo : 'No especificado',
          cantidadEstimada: visita.solicitud ? `${visita.solicitud.cantidad} ${visita.solicitud.unidad}` : 'No especificada',
          direccion: visita.solicitud ? visita.solicitud.direccion_especifica : 'No especificada',
          contacto: visita.solicitud ? visita.solicitud.contacto_nombre : 'No especificado'
        };
      });

      console.log('Visitas formateadas:', visitasData);

      // 5. Enviar los datos formateados en formato JSON
      res.json(visitasData);

    } catch (error) {
      console.error('Error al obtener las visitas del cliente:', error);
      // En caso de error, devolver un array vacío para no romper el cliente
      res.status(500).json([]);
    }
  },

  // Aceptar una visita
  aceptarVisita: async (req, res) => {
    try {
      const { id } = req.params;
      const visita = await VisitaRetiro.findByPk(id);

      if (!visita) {
        return res.status(404).json({ success: false, message: 'Visita no encontrada.' });
      }

      visita.respuestaCliente = 'aceptada';
      visita.fechaRespuestaCliente = new Date();
      visita.estado = 'confirmada';

      await visita.save();

      res.json({ success: true, message: 'Visita aceptada con éxito.' });
    } catch (error) {
      console.error('Error al aceptar la visita:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  },

  // Rechazar una visita
  rechazarVisita: async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo) {
        return res.status(400).json({ success: false, message: 'El motivo del rechazo es obligatorio.' });
      }

      const visita = await VisitaRetiro.findByPk(id);

      if (!visita) {
        return res.status(404).json({ success: false, message: 'Visita no encontrada.' });
      }

      visita.respuestaCliente = 'rechazada';
      visita.motivoRechazo = motivo;
      visita.fechaRespuestaCliente = new Date();
      visita.estado = 'cancelada';

      await visita.save();

      res.json({ success: true, message: 'Visita rechazada con éxito.' });
    } catch (error) {
      console.error('Error al rechazar la visita:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  },

  renderMiPerfil: async (req, res) => {
    try {
      if (!req.session.usuario || !req.session.usuario.id) {
        return res.redirect('/usuarios/login');
      }

      const cliente = await Cliente.findOne({
        where: { usuario_id: req.session.usuario.id },
        include: [{ model: Usuario }, { model: Comuna, include: [{ model: Region, as: 'Region' }] }]
      });

      if (!cliente) {
        req.flash('error', 'No se encontró un perfil de cliente asociado a su cuenta.');
        return res.redirect('/dashboard/cliente');
      }

      // Unificar los datos para la vista
      const perfilData = {
        nombre: cliente.Usuario.nombre,
        email: cliente.Usuario.email,
        activo: cliente.Usuario.activo,
        fechaRegistro: cliente.Usuario.createdAt,
        rut: cliente.rut,
        telefono: cliente.telefono,
        nombreEmpresa: cliente.nombre_empresa,
        contactoPrincipal: cliente.contacto_principal,
        direccion: cliente.direccion,
        comuna: cliente.Comuna ? cliente.Comuna.nombre : '',
        region: cliente.Comuna && cliente.Comuna.Region ? cliente.Comuna.Region.nombre : ''
      };

      res.render('clientes/perfil/miperfil', {
        titulo: 'Mi Perfil - Felmart',
        usuario: perfilData, // Pasamos el objeto unificado
        layout: false, // Si usas un layout principal, ajústalo
        currentPage: 'miperfil'
      });

    } catch (error) {
      console.error("Error al renderizar la página de perfil:", error);
      req.flash('error', 'Ocurrió un error al cargar tu perfil.');
      res.redirect('/dashboard/cliente');
    }
  },

  renderDashboard: async (req, res) => {
    try {
      if (!req.session.usuario || !req.session.usuario.id) {
        return res.redirect('/usuarios/login');
      }

      const cliente = await Cliente.findOne({ 
        where: { usuario_id: req.session.usuario.id } 
      });

      if (!cliente) {
        req.flash('error', 'No se encontró un perfil de cliente asociado a su cuenta.');
        return res.redirect('/usuarios/login');
      }

      const [solicitudes, visitas] = await Promise.all([
        SolicitudRetiro.findAll({
          where: { cliente_id: cliente.rut },
          order: [['createdAt', 'DESC']]
        }),
        VisitaRetiro.findAll({
          where: { cliente_id: cliente.rut }
        })
      ]);

      const misSolicitudes = solicitudes.length;
      const solicitudesPendientes = solicitudes.filter(s => s.estado.toLowerCase() === 'pendiente').length;
      
      const proximasVisitas = visitas.filter(v => 
          new Date(v.fecha) >= new Date() && 
          ['pendiente', 'confirmada'].includes(v.estado.toLowerCase())
      ).length;

      const ultimasSolicitudes = solicitudes.slice(0, 5).map(s => ({
          id: s.id,
          fechaSolicitud: s.createdAt,
          direccionRetiro: s.direccion_especifica,
          estado: s.estado
      }));

      res.render('dashboard/cliente', {
          titulo: 'Portal Cliente - Felmart',
          usuario: req.session.usuario,
          misSolicitudes,
          solicitudesPendientes,
          proximasVisitas,
          ultimasSolicitudes,
          mostrarNotificacion: !cliente
      });

    } catch (error) {
      console.error('Error al renderizar el dashboard del cliente:', error);
      req.flash('error', 'Ocurrió un error al cargar su panel de control.');
      res.redirect('/usuarios/login');
    }
  },

  renderMisSolicitudes: async (req, res) => {
    try {
      if (!req.session.usuario || !req.session.usuario.id) {
        return res.redirect('/usuarios/login');
      }

      const cliente = await Cliente.findOne({ 
        where: { usuario_id: req.session.usuario.id } 
      });

      if (!cliente) {
        req.flash('error', 'No se encontró un perfil de cliente asociado a su cuenta.');
        return res.redirect('/dashboard');
      }

      const solicitudes = await SolicitudRetiro.findAll({
        where: { cliente_id: cliente.rut },
        order: [['createdAt', 'DESC']]
      });

      // Calcular estadísticas de solicitudes
      const stats = {
        pendientes: solicitudes.filter(s => s.estado.toLowerCase() === 'pendiente').length,
        confirmadas: solicitudes.filter(s => s.estado.toLowerCase() === 'en_proceso').length,
        completadas: solicitudes.filter(s => s.estado.toLowerCase() === 'completada').length,
        canceladas: solicitudes.filter(s => s.estado.toLowerCase() === 'cancelada').length
      };

      res.render('clientes/solicitudes', {
        titulo: 'Mis Solicitudes - Felmart',
        usuario: req.session.usuario,
        solicitudes: solicitudes,
        stats: stats,
        currentPage: 'solicitudes',
        layout: false
      });

    } catch (error) {
      console.error('Error al renderizar la página de solicitudes:', error);
      req.flash('error', 'Ocurrió un error al cargar tus solicitudes.');
      res.redirect('/dashboard');
    }
  }
};

module.exports = clienteController;