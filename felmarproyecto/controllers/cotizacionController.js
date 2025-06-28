// controllers/cotizacionController.js
const { 
  Cotizacion, 
  Cliente, 
  Residuo, 
  DetalleResiduo,
  Usuario,
  Notificacion,
  PrecioResiduo,
  Region,
  Comuna,
  CotizacionResiduo
} = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const { sendMailWithRetry } = require('../config/email.config');
const emailTemplates = require('../templates/emailTemplates');
moment.locale('es');

const cotizacionController = {
  // Listar todas las cotizaciones
  listar: async (req, res) => {
    try {
      const cotizaciones = await Cotizacion.findAll({
        order: [['fecha', 'DESC']]
      });
      res.render('admin/cotizaciones', {
        title: 'Gestión de Cotizaciones',
        cotizaciones,
        usuario: req.user || null
      });
    } catch (error) {
      console.error('Error al listar cotizaciones:', error);
      req.flash('error', 'Error al cargar las cotizaciones');
      res.redirect('/dashboard');
    }
  },

  // Obtener una cotización específica
  obtener: async (req, res) => {
    try {
      const cotizacion = await Cotizacion.findByPk(req.params.id);
      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }
      res.json({
        success: true,
        cotizacion
      });
    } catch (error) {
      console.error('Error al obtener cotización:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar la cotización'
      });
    }
  },

  // Actualizar cotización
  actualizar: async (req, res) => {
    try {
      const { estado, detalles, subtotal, iva, total, observaciones, enviarCorreo } = req.body;
      const cotizacion = await Cotizacion.findByPk(req.params.id);
      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }

      // Parsear detalles y residuos
      let detallesObj;
      try {
        detallesObj = typeof detalles === 'string' ? JSON.parse(detalles) : detalles;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Error en los datos de residuos' });
      }
      const residuos = detallesObj.residuos || [];

      // Recalcular totales y residuos (incluyendo UF)
      let totalResiduos = 0;
      let detallesResiduos = [];
      for (let r of residuos) {
        let valorUF = null;
        let precioUnitarioCLP = r.precioUnitario;
        if (r.moneda === 'UF') {
          valorUF = await require('../services/cmfBancosService').obtenerValorUF();
          precioUnitarioCLP = valorUF * r.precioUnitario;
        }
        const subtotalResiduo = precioUnitarioCLP * r.cantidad;
        totalResiduos += subtotalResiduo;
        detallesResiduos.push({
          ...r,
          precioUnitario: precioUnitarioCLP,
          subtotal: subtotalResiduo,
          valorUF: r.moneda === 'UF' ? valorUF : null
        });
      }
      // Recalcular totales finales
      const costoOperativo = detallesObj.costoOperativo || 0;
      const descuento = detallesObj.descuento || 0;
      const descuentoDinero = (totalResiduos + costoOperativo) * (descuento / 100);
      const subtotalFinal = totalResiduos + costoOperativo - descuentoDinero;
      const ivaFinal = subtotalFinal * 0.19;
      const totalFinal = subtotalFinal + ivaFinal;

      // Actualizar cotización
      await cotizacion.update({
        estado,
        detalles: JSON.stringify({ ...detallesObj, residuos: detallesResiduos }),
        subtotal: subtotalFinal,
        iva: ivaFinal,
        total: totalFinal,
        observaciones
      });

      // Actualizar residuos asociados (CotizacionResiduo)
      const CotizacionResiduo = require('../models/CotizacionResiduo');
      await CotizacionResiduo.destroy({ where: { cotizacion_id: cotizacion.numeroCotizacion } });
      for (let detalle of detallesResiduos) {
        await CotizacionResiduo.create({
          cotizacion_id: cotizacion.numeroCotizacion,
          precio_residuo_id: detalle.residuoId || detalle.id,
          descripcion: detalle.descripcion,
          precio_unitario: detalle.precioUnitario,
          cantidad: detalle.cantidad,
          subtotal: detalle.subtotal
        });
      }

      // Enviar correo si se solicita
      let correoEnviado = false;
      if (enviarCorreo) {
        try {
          const emailCliente = detallesObj.datosContacto?.correo;
          if (emailCliente) {
            correoEnviado = await enviarCotizacionPorCorreo(cotizacion, emailCliente, detallesObj);
          }
        } catch (error) {
          console.error('Error al enviar correo:', error);
        }
      }

      res.json({
        success: true,
        message: 'Cotización actualizada correctamente',
        correoEnviado
      });
    } catch (error) {
      console.error('Error al actualizar cotización:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la cotización'
      });
    }
  },

  // Eliminar cotización
  eliminar: async (req, res) => {
    try {
      const cotizacion = await Cotizacion.findByPk(req.params.id);
      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }
      await cotizacion.destroy();
      res.json({
        success: true,
        message: 'Cotización eliminada correctamente'
      });
    } catch (error) {
      console.error('Error al eliminar cotización:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la cotización'
      });
    }
  },

  // Exportar cotizaciones a CSV
  exportar: async (req, res) => {
    try {
      const cotizaciones = await Cotizacion.findAll({
        order: [['fecha', 'DESC']]
      });
      const headers = ['Número', 'Fecha', 'Nombre', 'Estado', 'Total', 'Observaciones'];
      const csvContent = [headers.join(',')];
      cotizaciones.forEach(cotizacion => {
        const fila = [
          cotizacion.numeroCotizacion || '',
          cotizacion.fecha ? new Date(cotizacion.fecha).toLocaleDateString('es-CL') : '',
          cotizacion.nombre || '',
          cotizacion.estado || '',
          cotizacion.total || 0,
          (cotizacion.observaciones || '').replace(/,/g, ';')
        ];
        csvContent.push(fila.join(','));
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=cotizaciones_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent.join('\n'));
    } catch (error) {
      console.error('Error al exportar cotizaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar las cotizaciones'
      });
    }
  },

  // API: Listar cotizaciones (JSON)
  listarAPI: async (req, res) => {
    try {
      const cotizaciones = await Cotizacion.findAll({
        order: [['fecha', 'DESC']]
      });
      res.json({
        success: true,
        cotizaciones
      });
    } catch (error) {
      console.error('Error al listar cotizaciones API:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar las cotizaciones: ' + error.message
      });
    }
  },

  // API: Obtener cotización específica (JSON)
  obtenerAPI: async (req, res) => {
    try {
      const { id } = req.params;
      const cotizacion = await Cotizacion.findByPk(id, {
        include: [
          { model: require('../models/Region'), as: 'region', attributes: ['id', 'nombre'] },
          { model: require('../models/Comuna'), as: 'comuna', attributes: ['id', 'nombre'] },
        ]
      });
      if (!cotizacion) {
        return res.json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }
      // Traer residuos asociados desde CotizacionResiduo
      const CotizacionResiduo = require('../models/CotizacionResiduo');
      const PrecioResiduo = require('../models/PrecioResiduo');
      const residuos = await CotizacionResiduo.findAll({
        where: { cotizacion_id: cotizacion.numeroCotizacion },
        attributes: ['descripcion', 'cantidad', 'precio_unitario', 'subtotal', 'precio_residuo_id']
      });
      // Para cada residuo, buscar la unidad manualmente
      const residuosConUnidad = [];
      for (const residuo of residuos) {
        let unidad = '';
        if (residuo.precio_residuo_id) {
          const precio = await PrecioResiduo.findByPk(residuo.precio_residuo_id, { attributes: ['unidad'] });
          unidad = precio ? precio.unidad : '';
        }
        residuosConUnidad.push({
          ...residuo.toJSON(),
          unidad
        });
      }
      res.json({
        success: true,
        cotizacion,
        region: cotizacion.region ? cotizacion.region.nombre : null,
        comuna: cotizacion.comuna ? cotizacion.comuna.nombre : null,
        residuos: residuosConUnidad
      });
    } catch (error) {
      console.error('Error al obtener cotización API:', error);
      res.json({
        success: false,
        message: 'Error al cargar la cotización: ' + error.message
      });
    }
  },

  // Ver detalles de una cotización
  detalles: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      // Buscar cotización
      const cotizacion = await Cotizacion.findByPk(id);
      
      if (!cotizacion) {
        req.flash('error', 'Cotización no encontrada');
        return res.redirect('/cotizaciones');
      }
      
      // Obtener detalles desde el campo o desde CotizacionResiduo
      let detalles = [];
      if (cotizacion.detalles || cotizacion.detallesJson) {
        try {
          const detallesData = JSON.parse(cotizacion.detalles || cotizacion.detallesJson);
          detalles = detallesData.residuos || [];
        } catch (e) {
          console.error('Error al parsear detalles/detallesJson', e);
        }
      }
      if (!detalles.length) {
        // Si no hay detalles en el campo, buscar en CotizacionResiduo
        const CotizacionResiduo = require('../models/CotizacionResiduo');
        detalles = await CotizacionResiduo.findAll({
          where: { cotizacion_id: cotizacion.numeroCotizacion }
        });
      }
      
      res.render('cotizaciones/detalles', {
        titulo: 'Detalles de Cotización',
        cotizacion,
        detalles,
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar detalles de cotización:', error);
      req.flash('error', 'Error al cargar detalles de la cotización');
      res.redirect('/cotizaciones');
    }
  },
  
  // Mostrar formulario para crear cotización
  mostrarCrear: async (req, res) => {
    try {
      const { usuario } = req.session;
      // Solo admins y operadores pueden crear cotizaciones
      if (usuario.rol === 'cliente') {
        req.flash('error', 'No tienes permiso para crear cotizaciones');
        return res.redirect('/dashboard');
      }
      // Generar número de cotización automático
      const fechaActual = new Date();
      const año = fechaActual.getFullYear().toString().substr(-2);
      const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
      // Obtener el último número de cotización del mes
      const ultimaCotizacion = await Cotizacion.findOne({
        where: {
          numeroCotizacion: {
            [Op.like]: `COT-${año}${mes}%`
          }
        },
        order: [['numeroCotizacion', 'DESC']]
      });
      let numeroCotizacion;
      if (ultimaCotizacion) {
        const ultimoNumero = parseInt(ultimaCotizacion.numeroCotizacion.split('-')[2]);
        numeroCotizacion = `COT-${año}${mes}-${(ultimoNumero + 1).toString().padStart(3, '0')}`;
      } else {
        numeroCotizacion = `COT-${año}${mes}-001`;
      }
      res.render('cotizaciones/crear', {
        titulo: 'Nueva Cotización',
        numeroCotizacion,
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar formulario de creación:', error);
      req.flash('error', 'Error al cargar el formulario');
      res.redirect('/cotizaciones');
    }
  },
  
  // Crear cotización
  crear: async (req, res) => {
    try {
      const {
        numeroCotizacion,
        subtotal,
        iva,
        total,
        validezCotizacion,
        observaciones,
        residuoIds,
        cantidades,
        preciosUnitarios,
        subtotales,
        descripciones
      } = req.body;
      // Validar campos
      if (!numeroCotizacion || !subtotal || !iva || !total || !validezCotizacion) {
        req.flash('error', 'Todos los campos marcados con * son obligatorios');
        return res.redirect(`/cotizaciones/crear`);
      }
      // Validar que haya al menos un residuo
      if (!residuoIds || !Array.isArray(residuoIds) || residuoIds.length === 0) {
        req.flash('error', 'Debe agregar al menos un residuo');
        return res.redirect(`/cotizaciones/crear`);
      }
      // Crear cotización
      const nuevaCotizacion = await Cotizacion.create({
        numeroCotizacion,
        fechaCotizacion: new Date(),
        subtotal,
        iva,
        total,
        validezCotizacion,
        observaciones,
        estado: 'pendiente'
      });
      // Crear detalles de cotización y almacenarlos en formato JSON
      const detalles = [];
      for (let i = 0; i < residuoIds.length; i++) {
        detalles.push({
          residuoId: residuoIds[i],
          cantidad: cantidades[i],
          precioUnitario: preciosUnitarios[i],
          subtotal: subtotales[i],
          descripcion: descripciones[i] || null
        });
      }
      nuevaCotizacion.detallesJson = JSON.stringify({ residuos: detalles });
      await nuevaCotizacion.save();
      req.flash('success', 'Cotización creada correctamente');
      res.redirect(`/cotizaciones/detalles/${nuevaCotizacion.id}`);
    } catch (error) {
      console.error('Error al crear cotización:', error);
      req.flash('error', 'Error al crear cotización');
      res.redirect(`/cotizaciones/crear`);
    }
  },
  
  // Aceptar cotización (para clientes)
  aceptar: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      // Verificar que sea un cliente
      if (usuario.rol !== 'cliente') {
        req.flash('error', 'Solo los clientes pueden aceptar cotizaciones');
        return res.redirect(`/cotizaciones/detalles/${id}`);
      }
      
      // Buscar cotización
      const cotizacion = await Cotizacion.findByPk(id);
      
      if (!cotizacion) {
        req.flash('error', 'Cotización no encontrada');
        return res.redirect('/cotizaciones');
      }
      
      // Verificar que la cotización esté pendiente
      if (cotizacion.estado !== 'pendiente') {
        req.flash('error', 'Solo se pueden aceptar cotizaciones pendientes');
        return res.redirect(`/cotizaciones/detalles/${id}`);
      }
      
      // Actualizar estado de la cotización
      cotizacion.estado = 'aceptada';
      await cotizacion.save();
      
      // Notificar a administradores
      const admins = await Usuario.findAll({
        where: { rol: 'administrador' }
      });
      
      for (const admin of admins) {
        await Notificacion.create({
          usuarioId: admin.id,
          tipo: 'cotizacion',
          titulo: 'Cotización aceptada',
          mensaje: `El cliente ha aceptado la cotización #${cotizacion.numeroCotizacion}`,
          referenciaId: id
        });
      }
      
      req.flash('success', 'Cotización aceptada correctamente');
      res.redirect(`/cotizaciones/detalles/${id}`);
    } catch (error) {
      console.error('Error al aceptar cotización:', error);
      req.flash('error', 'Error al aceptar cotización');
      res.redirect(`/cotizaciones/detalles/${req.params.id}`);
    }
  },
  
  // Rechazar cotización (para clientes)
  rechazar: async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const { usuario } = req.session;
      
      // Verificar que sea un cliente
      if (usuario.rol !== 'cliente') {
        req.flash('error', 'Solo los clientes pueden rechazar cotizaciones');
        return res.redirect(`/cotizaciones/detalles/${id}`);
      }
      
      // Buscar cotización
      const cotizacion = await Cotizacion.findByPk(id);
      
      if (!cotizacion) {
        req.flash('error', 'Cotización no encontrada');
        return res.redirect('/cotizaciones');
      }
      
      // Verificar que la cotización esté pendiente
      if (cotizacion.estado !== 'pendiente') {
        req.flash('error', 'Solo se pueden rechazar cotizaciones pendientes');
        return res.redirect(`/cotizaciones/detalles/${id}`);
      }
      
      // Actualizar estado de la cotización
      cotizacion.estado = 'rechazada';
      cotizacion.observaciones = motivo ? `Rechazada: ${motivo}` : 'Rechazada por el cliente';
      await cotizacion.save();
      
      // Notificar a administradores
      const admins = await Usuario.findAll({
        where: { rol: 'administrador' }
      });
      
      for (const admin of admins) {
        await Notificacion.create({
          usuarioId: admin.id,
          tipo: 'cotizacion',
          titulo: 'Cotización rechazada',
          mensaje: `El cliente ha rechazado la cotización #${cotizacion.numeroCotizacion}${motivo ? `. Motivo: ${motivo}` : ''}`,
          referenciaId: id
        });
      }
      
      req.flash('success', 'Cotización rechazada correctamente');
      res.redirect(`/cotizaciones/detalles/${id}`);
    } catch (error) {
      console.error('Error al rechazar cotización:', error);
      req.flash('error', 'Error al rechazar cotización');
      res.redirect(`/cotizaciones/detalles/${req.params.id}`);
    }
  },

  // Esta es la nueva función para descargar el PDF con PDFKit
  descargarPdf: async (req, res) => {
    try {
        const { id } = req.params;
        const cotizacion = await Cotizacion.findByPk(id, {
            include: [{
                model: CotizacionResiduo,
                as: 'residuos'
            }]
        });

        if (!cotizacion) {
            return res.status(404).send('Cotización no encontrada');
        }

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=cotizacion-${cotizacion.numeroCotizacion}.pdf`);

        doc.pipe(res);

        // Header
        const logoPath = path.join(__dirname, '../public/img/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 50 });
        }
        
        doc.fontSize(20).text('COTIZACIÓN', { align: 'right' });
        doc.moveDown(0.5);

        // Info de la empresa
        doc.fontSize(10);
        doc.text('Felmar E.I.R.L.', { align: 'right' });
        doc.text('76.327.Fel-k', { align: 'right' });
        
        doc.moveDown(2);

        // Client details
        doc.fontSize(12).text(`Cotización N°: ${cotizacion.numeroCotizacion}`);
        doc.text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-CL')}`);
        doc.moveDown();
        doc.fontSize(10).text('Cliente:', { continued: true, underline: true });
        doc.font('Helvetica').text(` ${cotizacion.nombre}`);
        doc.font('Helvetica-Bold').text('RUT:', { continued: true });
        doc.font('Helvetica').text(` ${cotizacion.rut}`);
        doc.font('Helvetica-Bold').text('Correo:', { continued: true });
        doc.font('Helvetica').text(` ${cotizacion.correo}`);
        doc.font('Helvetica-Bold').text('Teléfono:', { continued: true });
        doc.font('Helvetica').text(` ${cotizacion.telefono}`);
        if(cotizacion.nombreEmpresa) {
            doc.font('Helvetica-Bold').text('Empresa:', { continued: true });
            doc.font('Helvetica').text(` ${cotizacion.nombreEmpresa}`);
        }
        doc.moveDown();

        // Tabla de residuos
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Ítem / Descripción', 50, tableTop);
        doc.text('Cantidad', 300, tableTop, { width: 90, align: 'right' });
        doc.text('Precio Unit.', 370, tableTop, { width: 100, align: 'right' });
        doc.text('Subtotal', 450, tableTop, { width: 100, align: 'right' });
        
        const startX = 50;
        const endX = 550;
        doc.moveTo(startX, tableTop + 20).lineTo(endX, tableTop + 20).stroke();

        let y = tableTop + 30;
        
        cotizacion.residuos.forEach(item => {
            doc.font('Helvetica').text(item.descripcion, 50, y, { width: 250 });
            doc.text(item.cantidad.toString(), 300, y, { width: 90, align: 'right' });
            doc.text(`$${Number(item.precio_unitario).toLocaleString('es-CL')}`, 370, y, { width: 100, align: 'right' });
            doc.text(`$${Number(item.subtotal).toLocaleString('es-CL')}`, 450, y, { width: 100, align: 'right' });
            y += 25;
        });

        // Línea divisoria
        doc.moveTo(startX, y).lineTo(endX, y).stroke();
        y += 10;
        
        // Totales
        const totalX = 450;
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 350, y, { align: 'right', width: 100 });
        doc.font('Helvetica').text(`$${Number(cotizacion.subtotal).toLocaleString('es-CL')}`, totalX, y, { width: 100, align: 'right' });
        y += 20;

        doc.font('Helvetica-Bold').text('IVA (19%):', 350, y, { align: 'right', width: 100 });
        doc.font('Helvetica').text(`$${Number(cotizacion.iva).toLocaleString('es-CL')}`, totalX, y, { width: 100, align: 'right' });
        y += 20;

        doc.font('Helvetica-Bold').text('Total:', 350, y, { align: 'right', width: 100 });
        doc.font('Helvetica-Bold').text(`$${Number(cotizacion.total).toLocaleString('es-CL')}`, totalX, y, { width: 100, align: 'right' });
        
        // Footer / Observaciones
        if (cotizacion.observaciones) {
            doc.font('Helvetica').text('Observaciones:', 50, y + 50, { underline: true });
            doc.text(cotizacion.observaciones, {
                width: 500,
                align: 'justify'
            });
        }

        doc.end();

    } catch (error) {
        console.error('Error al generar PDF con pdfkit:', error);
        res.status(500).send('Error al generar el PDF');
    }
  },

  /**
   * Muestra el formulario de nueva cotización
   */
  mostrarFormularioNueva: (req, res) => {
    const usuario = req.session.usuario || null;
    
    res.render('cotizaciones/nueva', {
      title: 'Nueva Cotización',
      usuario,
      layout: 'layouts/main'
    });
  },

  /**
   * Procesa una nueva cotización
   */
  crearCotizacion: async (req, res) => {
    try {
      const {
        email,
        username,
        first_name,
        last_name,
        telefono,
        direccion,
        ciudad,
        region,
        rut,
        tipo_residuo,
        cantidad,
        fecha_retiro,
        observaciones
      } = req.body;

      // Crear nueva cotización
      const cotizacion = await Cotizacion.create({
        usuario_id: req.session.usuario?.id,
        email,
        nombre: `${first_name} ${last_name}`,
        telefono,
        direccion,
        ciudad,
        region,
        rut,
        tipo_residuo,
        cantidad,
        fecha_retiro,
        observaciones,
        estado: 'pendiente'
      });

      req.flash('success_msg', 'Cotización enviada exitosamente');
      res.redirect('/cotizaciones/mis-cotizaciones');
    } catch (error) {
      console.error('Error al crear cotización:', error);
      req.flash('error_msg', 'Error al procesar la cotización');
      res.redirect('/cotizaciones/nueva');
    }
  },

  /**
   * Muestra las cotizaciones del usuario
   */
  misCotizaciones: async (req, res) => {
    try {
      const cotizaciones = await Cotizacion.findByUsuario(req.session.usuario?.id);
      
      res.render('cotizaciones/lista', {
        title: 'Mis Cotizaciones',
        cotizaciones,
        layout: 'layouts/main'
      });
    } catch (error) {
      console.error('Error al obtener cotizaciones:', error);
      req.flash('error_msg', 'Error al cargar las cotizaciones');
      res.redirect('/');
    }
  },

  /**
   * Muestra el formulario público de cotización
   */
  mostrarFormularioCotizar: (req, res) => {
    const usuario = req.session?.usuario || null;
    const precios = require('../models/PrecioResiduo').obtenerTodos();
    res.render('cotizaciones/cotizar', {
      title: 'Cotizar Residuos',
      titulo: 'Cotizar Residuos',
      usuario,
      precios
    });
  },

  /**
   * Procesa el formulario público de cotización y muestra el resultado
   */
  procesarCotizacion: async (req, res) => {
    try {
      // Aquí puedes guardar la cotización o solo mostrar el resultado
      const cotizacion = {
        numeroCotizacion: 'COT-PRUEBA-001',
        fechaCotizacion: new Date(),
        nombre: req.body.nombre,
        rut: req.body.rut,
        DetalleCotizacions: [{
          descripcion: req.body.tipo_residuo === 'peligroso' ? 'Residuo Peligroso' : 'Residuo No Peligroso',
          cantidad: req.body.cantidad,
          precioUnitario: 1000, // Valor de ejemplo
          subtotal: req.body.cantidad * 1000
        }],
        subtotal: req.body.cantidad * 1000,
        iva: Math.round(req.body.cantidad * 1000 * 0.19),
        total: Math.round(req.body.cantidad * 1000 * 1.19),
        observaciones: req.body.observaciones
      };
      res.render('cotizaciones/resultado', {
        title: 'Resultado Cotización',
        cotizacion
      });
    } catch (error) {
      console.error('Error al procesar cotización pública:', error);
      req.flash('error_msg', 'Error al procesar la cotización');
      res.redirect('/cotizaciones/cotizar');
    }
  },

  /**
   * Muestra el formulario de cotización desde la ruta /cotizaciones/cotizar
   */
  mostrarCotizador: async (req, res) => {
    try {
      console.log('🔍 Cargando formulario de cotización...');
      
      // Cargar precios, regiones y comunas
      let precios = [];
      let regiones = [];
      let comunas = [];
      
      try {
        precios = await PrecioResiduo.findAll({
          order: [['descripcion', 'ASC']]
        });
        console.log('✅ Precios cargados:', precios.length);
      } catch (error) {
        console.error('❌ Error al cargar precios:', error);
        precios = [];
      }
      
      try {
        regiones = await Region.findAll({
          order: [['nombre', 'ASC']]
        });
        console.log('✅ Regiones cargadas:', regiones.length);
      } catch (error) {
        console.error('❌ Error al cargar regiones:', error);
        regiones = [];
      }
      
      try {
        comunas = await Comuna.findAll({
          order: [['nombre', 'ASC']],
          include: [{
            model: Region,
            as: 'Region'
          }]
        });
        console.log('✅ Comunas cargadas:', comunas.length);
      } catch (error) {
        console.error('❌ Error al cargar comunas:', error);
        comunas = [];
      }
      
      console.log('🎯 Renderizando vista cotizaciones/cotizar');
      
      res.render('cotizaciones/cotizar', {
        title: 'Cotizar Residuos',
        titulo: 'Cotizar Residuos',
        precios,
        regiones,
        comunas,
        usuario: req.session?.usuario || null,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('❌ Error general al mostrar cotizador:', error);
      res.status(500).send(`
        <h1>Error al cargar la página de cotización</h1>
        <p>Error: ${error.message}</p>
        <a href="/">Volver al inicio</a>
      `);
    }
  },

  /**
   * Procesa la cotización pública desde /cotizaciones/cotizar
   */
  procesarCotizacionPublica: async (req, res) => {
    try {
      // Si no hay sesión, recargar la página con la alerta, sin redirigir al login
      if (!req.session || !req.session.usuario) {
        req.flash('error', 'Debes iniciar sesión o registrarte para poder realizar una cotización.');
        return res.redirect('/cotizaciones/cotizar');
      }
      const {
        nombre, rut, correo, telefono, 
        nombreEmpresa, rutEmpresa, 
        direccion, comuna_id, region_id,
        residuosCotizados, observaciones, total
      } = req.body;

      // Validar datos requeridos
      if (!nombre || !rut || !correo || !residuosCotizados) {
        req.flash('error', 'Todos los campos obligatorios deben ser completados');
        return res.redirect('/cotizaciones/cotizar');
      }

      // Parsear residuos cotizados
      let residuos;
      try {
        residuos = JSON.parse(residuosCotizados);
      } catch (e) {
        req.flash('error', 'Error en los datos de residuos');
        return res.redirect('/cotizaciones/cotizar');
      }

      if (!Array.isArray(residuos) || residuos.length === 0) {
        req.flash('error', 'Debe agregar al menos un residuo a la cotización');
        return res.redirect('/cotizaciones/cotizar');
      }

      // Generar número de cotización único
      const numeroCotizacion = 'COT-' + Date.now();
      const totalFinal = parseFloat(total) || 0;
      const neto = Math.round(totalFinal / 1.19);
      const iva = totalFinal - neto;

      // Crear la cotización en la base de datos
      const cotizacion = await Cotizacion.create({
        numeroCotizacion,
        fechaCotizacion: new Date(),
        subtotal: neto,
        iva: iva,
        total: totalFinal,
        estado: 'pendiente',
        observaciones: observaciones || '',
        detallesJson: JSON.stringify({
          datosContacto: {
            nombre,
            rut,
            correo,
            telefono,
            nombreEmpresa,
            rutEmpresa,
            direccion,
            comuna_id,
            region_id
          },
          residuos: residuos
        })
      });

      // Renderizar la página de resultado
      res.render('cotizaciones/resultado', {
        title: 'Resultado de Cotización',
        cotizacion: {
          numeroCotizacion,
          fechaCotizacion: new Date(),
          nombre,
          rut,
          residuos,
          subtotal: neto,
          iva: iva,
          total: totalFinal,
          observaciones
        }
      });
    } catch (error) {
      console.error('Error al procesar cotización pública:', error);
      req.flash('error', 'Error al procesar la cotización');
      res.redirect('/cotizaciones/cotizar');
    }
  },

  // Actualizar solo el estado y observaciones de la cotización (API)
  actualizarEstadoAPI: async (req, res) => {
    try {
      const { estado, detalles, subtotal, iva, total, observaciones, enviarCorreo } = req.body;
      const cotizacion = await Cotizacion.findByPk(req.params.id);
      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }

      // Si se envían detalles, recalcula todo igual que en actualizar
      if (detalles) {
        let detallesObj;
        try {
          detallesObj = typeof detalles === 'string' ? JSON.parse(detalles) : detalles;
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Error en los datos de residuos' });
        }
        const residuos = detallesObj.residuos || [];
        let totalResiduos = 0;
        let detallesResiduos = [];
        for (let r of residuos) {
          let valorUF = null;
          let precioUnitarioCLP = r.precioUnitario;
          if (r.moneda === 'UF') {
            valorUF = await require('../services/cmfBancosService').obtenerValorUF();
            precioUnitarioCLP = valorUF * r.precioUnitario;
          }
          const subtotalResiduo = precioUnitarioCLP * r.cantidad;
          totalResiduos += subtotalResiduo;
          detallesResiduos.push({
            ...r,
            precioUnitario: precioUnitarioCLP,
            subtotal: subtotalResiduo,
            valorUF: r.moneda === 'UF' ? valorUF : null
          });
        }
        // Recalcular totales finales
        const costoOperativo = detallesObj.costoOperativo || 0;
        const descuento = detallesObj.descuento || 0;
        const descuentoDinero = (totalResiduos + costoOperativo) * (descuento / 100);
        const subtotalFinal = totalResiduos + costoOperativo - descuentoDinero;
        const ivaFinal = subtotalFinal * 0.19;
        const totalFinal = subtotalFinal + ivaFinal;

        await cotizacion.update({
          estado,
          detalles: JSON.stringify({ ...detallesObj, residuos: detallesResiduos }),
          subtotal: subtotalFinal,
          iva: ivaFinal,
          total: totalFinal,
          observaciones
        });

        // Actualizar residuos asociados (CotizacionResiduo)
        const CotizacionResiduo = require('../models/CotizacionResiduo');
        await CotizacionResiduo.destroy({ where: { cotizacion_id: cotizacion.numeroCotizacion } });
        for (let detalle of detallesResiduos) {
          await CotizacionResiduo.create({
            cotizacion_id: cotizacion.numeroCotizacion,
            precio_residuo_id: detalle.residuoId || detalle.id,
            descripcion: detalle.descripcion,
            precio_unitario: detalle.precioUnitario,
            cantidad: detalle.cantidad,
            subtotal: detalle.subtotal
          });
        }

        // Enviar correo si se solicita
        let correoEnviado = false;
        if (enviarCorreo) {
          try {
            const emailCliente = detallesObj.datosContacto?.correo;
            if (emailCliente) {
              correoEnviado = await enviarCotizacionPorCorreo(cotizacion, emailCliente, detallesObj);
            }
          } catch (error) {
            console.error('Error al enviar correo:', error);
          }
        }

        return res.json({
          success: true,
          message: 'Cotización actualizada correctamente',
          correoEnviado
        });
      } else {
        // Solo actualizar estado y observaciones
        await cotizacion.update({ estado, observaciones });
        return res.json({ success: true, message: 'Estado actualizado correctamente' });
      }
    } catch (error) {
      console.error('Error al actualizar estado de cotización:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado de la cotización'
      });
    }
  },

  // Eliminar cotización (API)
  eliminarAPI: async (req, res) => {
    try {
      const cotizacion = await Cotizacion.findByPk(req.params.id);
      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }
      await cotizacion.destroy();
      res.json({
        success: true,
        message: 'Cotización eliminada correctamente'
      });
    } catch (error) {
      console.error('Error al eliminar cotización:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la cotización'
      });
    }
  },

  // API: Listar precios de residuos
  listarPreciosResiduos: async (req, res) => {
    try {
      const precios = await PrecioResiduo.findAll({
        attributes: ['id', 'descripcion', 'unidad', 'precio', 'moneda']
      });
      res.json({ success: true, residuos: precios });
    } catch (error) {
      res.json({ success: false, message: 'Error al cargar precios de residuos' });
    }
  },
};

// Función para enviar correo de cotización
async function enviarCotizacionPorCorreo(cotizacion, emailCliente, detallesObj) {
  try {
    const residuos = detallesObj.residuos || [];
    const cliente = detallesObj.datosContacto || detallesObj.cliente || {};
    const mailOptions = {
      from: {
        name: 'Felmart - Gestión de Residuos',
        address: process.env.EMAIL_USER
      },
      to: emailCliente,
      ...emailTemplates.cotizacion({
        numeroCotizacion: cotizacion.numeroCotizacion,
        nombre: cliente.nombre,
        correo: emailCliente,
        telefono: cliente.telefono,
        empresa: cliente.nombreEmpresa,
        direccion: cliente.direccion,
        comuna: cliente.comuna,
        ciudad: cliente.ciudad,
        detalles: residuos,
        subtotal: cotizacion.subtotal,
        iva: cotizacion.iva,
        total: cotizacion.total,
        observaciones: cotizacion.observaciones
      })
    };
    await sendMailWithRetry(mailOptions);
    return true;
  } catch (error) {
    console.error('Error al enviar correo de cotización:', error);
    return false;
  }
}

// Función auxiliar para la tabla del PDF
function generarFilaTabla(doc, y, c1, c2, c3, c4, c5) {
    doc.fontSize(10)
        .text(c1, 50, y, { width: 190, align: 'left' })
        .text(c2, 240, y, { width: 60, align: 'center' })
        .text(c3, 300, y, { width: 80, align: 'center' })
        .text(c4, 380, y, { width: 90, align: 'right' })
        .text(c5, 470, y, { width: 90, align: 'right' });
}

module.exports = cotizacionController;