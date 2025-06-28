// controllers/certificadoController.js
const { 
    Certificado, 
    VisitaRetiro, 
    SolicitudRetiro, 
    Cliente, 
    Usuario,
    Notificacion 
  } = require('../models');
  const { Op } = require('sequelize');
  const fs = require('fs');
  const path = require('path');
  const PDFDocument = require('pdfkit');
  const moment = require('moment');
  const multer = require('multer');
  
  // Configuración de multer para subida de archivos
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dirPath = path.join(__dirname, '..', 'public', 'uploads', 'certificados');
      // Crear directorio si no existe
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      cb(null, dirPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `certificado-${uniqueSuffix}${ext}`);
    }
  });
  
  const upload = multer({ 
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB máximo
    },
    fileFilter: (req, file, cb) => {
      // Aceptar solo PDFs
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
      }
    }
  });
  
  const certificadoController = {
    // Middleware para manejar la subida de archivos
    uploadMiddleware: upload.single('archivoPdf'),
    
    // Listar certificados (admin/operador ven todos, cliente solo los suyos)
    listar: async (req, res) => {
      try {
        const { usuario } = req.session;
        const { cliente, fechaDesde, fechaHasta } = req.query;
        let where = {};
        if (usuario.rol === 'cliente') {
          where.cliente_id = req.session.clienteId;
        }
        // Filtro por cliente (solo para admin/operador)
        if (cliente) {
          // Buscar el cliente asociado a ese usuario
          const ClienteModel = require('../models/Cliente');
          const clienteObj = await ClienteModel.findOne({ where: { usuario_id: cliente } });
          if (clienteObj) {
            where.cliente_id = clienteObj.rut;
          } else {
            // Si no hay cliente asociado, forzar un resultado vacío
            where.cliente_id = null;
          }
        }
        // Filtro por fecha de emisión
        if (fechaDesde && fechaHasta) {
          where.fecha_emision = { [Op.between]: [fechaDesde, moment(fechaHasta).endOf('day').toDate()] };
        } else if (fechaDesde) {
          where.fecha_emision = { [Op.gte]: fechaDesde };
        } else if (fechaHasta) {
          where.fecha_emision = { [Op.lte]: moment(fechaHasta).endOf('day').toDate() };
        }
        
        const certificados = await Certificado.findAll({ 
          where, 
          order: [['fecha_emision', 'DESC']],
          include: [
            {
              model: Cliente,
              as: 'cliente',
              attributes: ['rut', 'nombre_empresa', 'direccion']
            }
          ]
        });
        
        // Traer los usuarios con rol cliente para el select
        const Usuario = require('../models/Usuario');
        const clientes = await Usuario.findAll({ where: { rol: 'cliente', activo: true } });
        res.render('admin/certificados', {
          certificados,
          clientes,
          usuario,
          error: req.flash('error'),
          success: req.flash('success'),
          clienteSeleccionado: cliente || '',
          fechaDesde: fechaDesde || '',
          fechaHasta: fechaHasta || ''
        });
      } catch (error) {
        console.error('Error al listar certificados:', error);
        req.flash('error', 'Error al cargar certificados');
        res.redirect('/dashboard');
      }
    },
    
    // Descargar PDF
    descargarPDF: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        const certificado = await Certificado.findByPk(id);
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/admin/certificados');
        }
        if (usuario.rol === 'cliente' && certificado.cliente_id !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para descargar este certificado');
          return res.redirect('/admin/certificados');
        }
        const rutaArchivo = path.join(__dirname, '..', 'public', certificado.rutaPdf);
        if (!fs.existsSync(rutaArchivo)) {
          req.flash('error', 'Archivo PDF no encontrado');
          return res.redirect('/admin/certificados');
        }
        res.download(rutaArchivo, `certificado-${certificado.id}.pdf`);
      } catch (error) {
        console.error('Error al descargar PDF:', error);
        req.flash('error', 'Error al descargar PDF');
        res.redirect('/admin/certificados');
      }
    },
    
    // Mostrar formulario crear
    mostrarCrear: async (req, res) => {
      try {
        const { usuario } = req.session;
        if (usuario.rol === 'cliente') {
          req.flash('error', 'No tienes permiso para crear certificados');
          return res.redirect('/dashboard');
        }
        // Buscar todos los usuarios con rol cliente
        const Usuario = require('../models/Usuario');
        const clientes = await Usuario.findAll({ where: { rol: 'cliente', activo: true } });
        res.render('admin/certificados_form', { certificado: null, usuario, clientes, error: req.flash('error'), success: req.flash('success') });
      } catch (error) {
        console.error('Error al mostrar formulario:', error);
        req.flash('error', 'Error al mostrar formulario');
        res.redirect('/admin/certificados');
      }
    },
    
    // Crear certificado
    crear: async (req, res) => {
      try {
        const { cliente_id, visita_retiro_id, observaciones, fechaEmision } = req.body;
        
        // Validación de campos obligatorios
        if (!cliente_id) {
          req.flash('error', 'Debes seleccionar un cliente.');
          return res.redirect('/admin/certificados');
        }
        if (!req.file) {
          req.flash('error', 'Debes adjuntar un archivo PDF.');
          return res.redirect('/admin/certificados');
        }
        
        // Buscar usuario cliente
        const Usuario = require('../models/Usuario');
        const usuarioCliente = await Usuario.findByPk(cliente_id);
        if (!usuarioCliente) {
          req.flash('error', 'El usuario seleccionado no existe.');
          return res.redirect('/admin/certificados');
        }
        
        // Buscar cliente asociado a ese usuario
        const Cliente = require('../models/Cliente');
        const cliente = await Cliente.findOne({ where: { usuario_id: usuarioCliente.id } });
        if (!cliente) {
          req.flash('error', 'No se encontró un perfil de cliente asociado a este usuario.');
          return res.redirect('/admin/certificados');
        }
        
        // Validar PDF
        if (req.file.mimetype !== 'application/pdf') {
          req.flash('error', 'El archivo debe ser un PDF.');
          return res.redirect('/admin/certificados');
        }
        
        const rutaPdf = `/uploads/certificados/${req.file.filename}`;
        let fechaEmisionFinal = fechaEmision;
        if (fechaEmisionFinal) {
          const parsed = new Date(fechaEmisionFinal + 'T12:00:00');
          if (!isNaN(parsed.getTime())) {
            fechaEmisionFinal = parsed;
          } else {
            fechaEmisionFinal = null;
          }
        } else {
          fechaEmisionFinal = null;
        }
        
        // VALIDACIÓN DE FOREIGN KEY
        if (visita_retiro_id) {
          const visitaExiste = await VisitaRetiro.findOne({ where: { solicitudRetiroId: visita_retiro_id } });
          if (!visitaExiste) {
            req.flash('error', 'No se puede crear el certificado: la visita seleccionada no existe o no es válida.');
            return res.redirect('/admin/certificados');
          }
        }
        
        await Certificado.create({ 
          cliente_id: cliente.rut, 
          visita_retiro_id: visita_retiro_id || null, 
          observaciones, 
          rutaPdf, 
          fecha_emision: fechaEmisionFinal 
        });
        
        // Enviar correo al cliente
        const { sendMailWithRetry } = require('../config/email.config');
        try {
          await sendMailWithRetry({
            from: {
              name: 'Felmart - Gestión de Residuos',
              address: process.env.EMAIL_USER
            },
            to: usuarioCliente.email,
            subject: 'Nuevo certificado disponible',
            html: `<p>Hola <b>${usuarioCliente.nombre}</b>,<br>Ya puedes descargar tu certificado desde la página de Felmart.</p>`
          });
        } catch (correoError) {
          console.error('Error al enviar correo:', correoError);
          req.flash('warning', 'Certificado creado, pero no se pudo enviar el correo al cliente.');
          return res.redirect('/admin/certificados');
        }
        
        req.flash('success', 'Certificado creado correctamente y correo enviado al cliente.');
        res.redirect('/admin/certificados');
      } catch (error) {
        console.error('Error al crear certificado:', error);
        req.flash('error', 'Error al crear certificado. Por favor revisa los datos e intenta nuevamente.');
        res.redirect('/admin/certificados');
      }
    },
    
    // Mostrar formulario editar
    mostrarEditar: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        if (usuario.rol === 'cliente') {
          req.flash('error', 'No tienes permiso para editar certificados');
          return res.redirect('/dashboard');
        }
        const certificado = await Certificado.findByPk(id);
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/admin/certificados');
        }
        res.render('admin/certificados_form', { certificado, usuario, error: req.flash('error'), success: req.flash('success') });
      } catch (error) {
        console.error('Error al mostrar formulario editar:', error);
        req.flash('error', 'Error al mostrar formulario');
        res.redirect('/admin/certificados');
      }
    },
    
    // Editar certificado
    editar: async (req, res) => {
      try {
        const { id } = req.params;
        const { cliente_id, visita_retiro_id, observaciones, fechaEmision } = req.body;
        const certificado = await Certificado.findByPk(id);
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/admin/certificados');
        }
        let rutaPdf = certificado.rutaPdf;
        if (req.file) {
          // Eliminar PDF anterior
          const rutaAnterior = path.join(__dirname, '..', 'public', certificado.rutaPdf);
          if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
          rutaPdf = `/uploads/certificados/${req.file.filename}`;
        }
        // Permitir actualizar solo la fecha de emisión si es lo único que se envía
        const updateData = {
          visita_retiro_id: typeof visita_retiro_id !== 'undefined' ? visita_retiro_id : certificado.visita_retiro_id,
          observaciones: typeof observaciones !== 'undefined' ? observaciones : certificado.observaciones,
          rutaPdf
        };
        if (fechaEmision) {
          // Forzar hora a mediodía para evitar desfase de zona horaria
          updateData.fecha_emision = new Date(fechaEmision + 'T12:00:00');
        }
        await certificado.update(updateData);
        req.flash('success', 'Certificado actualizado correctamente.');
        res.redirect('/admin/certificados');
      } catch (error) {
        console.error('Error al editar certificado:', error);
        req.flash('error', 'Error al editar certificado.');
        res.redirect('/admin/certificados');
      }
    },
    
    // Eliminar certificado
    eliminar: async (req, res) => {
      try {
        const { id } = req.params;
        const certificado = await Certificado.findByPk(id);
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/admin/certificados');
        }
        // Eliminar PDF
        const rutaArchivo = path.join(__dirname, '..', 'public', certificado.rutaPdf);
        if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
        await certificado.destroy();
        req.flash('success', 'Certificado eliminado exitosamente.');
        res.redirect('/admin/certificados');
      } catch (error) {
        console.error('Error al eliminar certificado:', error);
        req.flash('error', 'Error al eliminar certificado.');
        res.redirect('/admin/certificados');
      }
    },

    // API: Obtener certificados por cliente
    obtenerPorCliente: async (req, res) => {
      try {
        const { clienteId } = req.params;
        const certificados = await Certificado.findAll({
          where: { cliente_id: clienteId },
          order: [['fecha_emision', 'DESC']],
          include: [
            {
              model: Cliente,
              as: 'cliente',
              attributes: ['rut', 'nombre_empresa', 'direccion']
            }
          ]
        });
        
        res.json({
          success: true,
          data: certificados
        });
      } catch (error) {
        console.error('Error al obtener certificados por cliente:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener certificados'
        });
      }
    },

    // API: Asignar certificado a visita
    asignarAVisita: async (req, res) => {
      try {
        const { visitaId, certificadoId } = req.body;
        
        if (!visitaId || !certificadoId) {
          return res.status(400).json({
            success: false,
            message: 'Se requiere ID de visita y certificado'
          });
        }

        // Verificar que la visita existe
        const visita = await VisitaRetiro.findByPk(visitaId);
        if (!visita) {
          return res.status(404).json({
            success: false,
            message: 'Visita no encontrada'
          });
        }

        // Verificar que el certificado existe
        const certificado = await Certificado.findByPk(certificadoId);
        if (!certificado) {
          return res.status(404).json({
            success: false,
            message: 'Certificado no encontrado'
          });
        }

        // Actualizar el certificado con la visita
        await certificado.update({ visita_retiro_id: visitaId });

        res.json({
          success: true,
          message: 'Certificado asignado correctamente a la visita'
        });
      } catch (error) {
        console.error('Error al asignar certificado a visita:', error);
        res.status(500).json({
          success: false,
          message: 'Error al asignar certificado'
        });
      }
    },

    // API: Crear certificado desde visita
    crearDesdeVisita: async (req, res) => {
      try {
        const { visitaId, observaciones, fechaEmision } = req.body;
        
        if (!visitaId) {
          return res.status(400).json({
            success: false,
            message: 'Se requiere ID de visita'
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'Se requiere archivo PDF'
          });
        }

        // Verificar que la visita existe
        const visita = await VisitaRetiro.findByPk(visitaId, {
          include: [
            {
              model: Cliente,
              as: 'cliente'
            }
          ]
        });
        
        if (!visita) {
          return res.status(404).json({
            success: false,
            message: 'Visita no encontrada'
          });
        }

        // Verificar que la visita existe y su id es válido para la FK
        if (!visita || !visita.id) {
          return res.status(400).json({
            success: false,
            message: 'No se puede crear el certificado porque la visita asociada no es válida. Contacta a soporte.'
          });
        }
        // Validar que el id de la visita existe en solicitud_retiro_id
        const visitaRetiroValida = await VisitaRetiro.findOne({ where: { solicitudRetiroId: visita.id } });
        if (!visitaRetiroValida) {
          return res.status(400).json({
            success: false,
            message: 'No se puede crear el certificado porque la visita no es válida para la relación. Contacta a soporte.'
          });
        }

        const rutaPdf = `/uploads/certificados/${req.file.filename}`;
        let fechaEmisionFinal = fechaEmision;
        if (fechaEmisionFinal) {
          const parsed = new Date(fechaEmisionFinal + 'T12:00:00');
          if (!isNaN(parsed.getTime())) {
            fechaEmisionFinal = parsed;
          } else {
            fechaEmisionFinal = null;
          }
        } else {
          fechaEmisionFinal = null;
        }

        let obs = observaciones;
        if (typeof obs !== 'string') {
          obs = Array.isArray(obs) ? obs.join(', ') : JSON.stringify(obs);
        }

        // Crear el certificado
        const certificado = await Certificado.create({
          cliente_id: visita.clienteId,
          visita_retiro_id: visita.id, // Usar el id correcto
          observaciones: obs,
          rutaPdf,
          fecha_emision: fechaEmisionFinal
        });

        // Enviar correo al cliente si tiene usuario asociado
        if (visita.cliente && visita.cliente.usuario_id) {
          const Usuario = require('../models/Usuario');
          const usuarioCliente = await Usuario.findByPk(visita.cliente.usuario_id);
          
          if (usuarioCliente) {
            const { sendMailWithRetry } = require('../config/email.config');
            try {
              await sendMailWithRetry({
                from: {
                  name: 'Felmart - Gestión de Residuos',
                  address: process.env.EMAIL_USER
                },
                to: usuarioCliente.email,
                subject: 'Nuevo certificado disponible',
                html: `<p>Hola <b>${usuarioCliente.nombre}</b>,<br>Ya puedes descargar tu certificado desde la página de Felmart.</p>`
              });
            } catch (correoError) {
              console.error('Error al enviar correo:', correoError);
            }
          }
        }

        res.json({
          success: true,
          message: 'Certificado creado correctamente',
          data: certificado
        });
      } catch (error) {
        console.error('Error al crear certificado desde visita:', error);
        res.status(500).json({
          success: false,
          message: 'Error al crear certificado'
        });
      }
    },

    // Método para mostrar la vista de certificados del cliente
    listarCertificadosCliente: async (req, res) => {
        try {
            // Verificar que el usuario está autenticado y es un cliente
            if (!req.session.usuario || !req.session.clienteId) {
                req.flash('error', 'No tienes permiso para ver esta página');
                return res.redirect('/login');
            }

            res.render('clientes/certificados', {
                usuario: req.session.usuario,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Error al mostrar certificados:', error);
            req.flash('error', 'Error al cargar la página de certificados');
            res.redirect('/dashboard');
        }
    },

    // Método API para obtener los certificados del cliente
    obtenerCertificadosCliente: async (req, res) => {
        try {
            // Asegurar que la respuesta sea JSON
            res.setHeader('Content-Type', 'application/json');

            if (!req.session.usuario || !req.session.clienteId) {
                return res.status(403).json({
                    error: 'No autorizado'
                });
            }

            const clienteId = req.session.clienteId;

            const certificados = await Certificado.findAll({
                where: { cliente_id: clienteId },
                order: [['fecha_emision', 'DESC']]
            });

            return res.json(certificados.map(cert => ({
                id: cert.id,
                titulo: `Certificado #${cert.id}`,
                fecha: moment(cert.fecha_emision).format('DD/MM/YYYY'),
                descripcion: cert.observaciones || 'Sin observaciones',
                rutaPdf: cert.rutaPdf,
                visita_retiro_id: cert.visita_retiro_id
            })));

        } catch (error) {
            console.error('Error al obtener certificados:', error);
            return res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
  };
  
  // Función para generar PDF de certificado
  const generarPDFCertificado = async (certificadoId) => {
    try {
      // Buscar certificado con todos sus detalles
      const certificado = await Certificado.findByPk(certificadoId, {
        include: [
          { 
            model: VisitaRetiro,
            include: [
              { 
                model: SolicitudRetiro,
                include: [
                  { model: Cliente }
                ]
              }
            ]
          }
        ]
      });
      
      if (!certificado) {
        throw new Error('Certificado no encontrado');
      }
      
      // Crear directorio si no existe
      const directorioDestino = path.join(__dirname, '..', 'public', 'uploads', 'certificados');
      if (!fs.existsSync(directorioDestino)) {
        fs.mkdirSync(directorioDestino, { recursive: true });
      }
      
      // Generar PDF
      const nombreArchivo = `certificado-${certificadoId}.pdf`;
      const rutaArchivoPDF = path.join(directorioDestino, nombreArchivo);
      
      const doc = new PDFDocument();
      const writeStream = fs.createWriteStream(rutaArchivoPDF);
      doc.pipe(writeStream);
      
      // Contenido del PDF
      doc.fontSize(20).text('CERTIFICADO DE GESTIÓN DE RESIDUOS', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Certificado N°: ${certificadoId}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text('Felmart - Gestión de Residuos', { align: 'center' });
      doc.moveDown(2);
      
      doc.fontSize(12).text(`Cliente: ${certificado.cliente_id}`);
      doc.moveDown();
      doc.fontSize(12).text(`Fecha de Emisión: ${certificado.fecha_emision ? new Date(certificado.fecha_emision).toLocaleDateString('es-ES') : 'No especificada'}`);
      doc.moveDown();
      if (certificado.observaciones) {
        doc.fontSize(12).text(`Observaciones: ${certificado.observaciones}`);
        doc.moveDown();
      }
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          resolve(rutaArchivoPDF);
        });
        writeStream.on('error', reject);
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  };
  
  module.exports = certificadoController;