const PrecioResiduo = require('../models/PrecioResiduo');
const Cotizacion = require('../models/Cotizacion');
const CotizacionResiduo = require('../models/CotizacionResiduo');
const Region = require('../models/Region');
const Comuna = require('../models/Comuna');
const { sendMailWithRetry, validateEmailConfig, verifyConnection } = require('../config/email.config');
const emailTemplates = require('../templates/emailTemplates');
require('dotenv').config();

/**
 * Controlador para la gestión de la Unidad de Fomento (UF)
 */
const UFController = {
  /**
   * Muestra el formulario para configurar el valor de la UF
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  mostrarFormularioUF: (req, res) => {
    const config = PrecioResiduo.getConfiguracionUF();
    res.render('admin/uf', {
      title: 'Configurar Valor UF',
      config,
      hoy: new Date()
    });
  },

  /**
   * Actualiza el valor manual de la UF
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  actualizarUF: async (req, res) => {
    const { valorUF } = req.body;
    PrecioResiduo.actualizarUFManual(parseFloat(valorUF));
    res.redirect('/admin/uf?success=true');
  }
};

/**
 * Controlador principal para la gestión de precios de residuos
 */
module.exports = {
  // Exporta el controlador UF
  ...UFController,

  /**
   * Muestra la vista principal de administración de residuos
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  mostrarAdmin: async (req, res) => {
    try {
      const precios = await PrecioResiduo.findAll();
      res.render('admin/residuos', {
        title: 'Administrar Residuos',
        titulo: 'Administrar Residuos',
        precios,
        messages: {
          error: req.flash('error'),
          success: req.flash('success')
        }
      });
    } catch (e) {
      req.flash('error', 'Error al cargar los residuos');
      res.redirect('/dashboard');
    }
  },

  /**
   * Elimina uno o múltiples residuos
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  eliminarResiduos: async (req, res) => {
    const { id, seleccionados } = req.body;
    try {
      if (id) {
        await PrecioResiduo.destroy({ where: { id } });
      } else if (seleccionados && seleccionados.length) {
        await PrecioResiduo.destroy({ where: { id: seleccionados } });
      }
      req.flash('success', 'Residuo(s) eliminado(s) correctamente');
    } catch (e) {
      req.flash('error', 'Error al eliminar el residuo');
    }
    res.redirect('/admin/residuos');
  },

  /**
   * Muestra la lista completa de precios de residuos
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  listarPrecios: (req, res) => {
    const precios = PrecioResiduo.obtenerTodos();
    res.render('residuos/listar', { 
      title: 'Lista de Precios de Residuos',
      precios 
    });
  },

  /**
   * Muestra el formulario de cotización
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  mostrarFormularioCotizacion: async (req, res) => {
    try {
      const precios = await PrecioResiduo.findAll();
      const regiones = await Region.findAll();
      const comunas = await Comuna.findAll({
        include: [{
          model: Region,
          as: 'region'
        }]
      });
      
      res.render('cotizaciones/cotizar', {
        title: 'Cotizar Residuos',
        titulo: 'Cotizar Residuos',
        precios,
        regiones,
        comunas,
        usuario: req.user || null
      });
    } catch (e) {
      console.error('Error al cargar formulario de cotización:', e);
      req.flash('error', 'Error al cargar los residuos');
      res.redirect('/dashboard');
    }
  },

  /**
   * Procesa la cotización avanzada (varios residuos, datos de contacto, correo)
   */
  procesarCotizacion: async (req, res) => {
    try {
      const {
        nombre, rut, correo, telefono, 
        nombreEmpresa, rutEmpresa, 
        direccion, comuna_id, region_id,
        residuosCotizados, observaciones
      } = req.body;

      console.log('Datos recibidos:', req.body);

      // Validar datos requeridos
      if (!nombre || !rut || !correo || !telefono || !residuosCotizados) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'Todos los campos obligatorios deben ser completados'
        });
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'El formato del correo electrónico no es válido'
        });
      }

      // Parsear residuos cotizados
      let residuos;
      try {
        residuos = JSON.parse(residuosCotizados);
      } catch (e) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'Error en los datos de residuos'
        });
      }

      if (!Array.isArray(residuos) || residuos.length === 0) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'Debe agregar al menos un residuo a la cotización'
        });
      }

      // Procesar cálculos de residuos
      let total = 0;
      let detalles = [];
      
      for (let r of residuos) {
        let valorUF = null;
        let precioUnitario = r.precioUnitario || r.precio;
        let subtotal = 0;

        if (r.moneda === 'UF') {
          try {
            valorUF = await require('../services/cmfBancosService').obtenerValorUF();
          } catch (e) {
            valorUF = await PrecioResiduo.obtenerValorUF();
          }
          precioUnitario = valorUF * (r.precio || r.precioUnitario);
        }
        
        subtotal = precioUnitario * r.cantidad;
        total += subtotal;

        detalles.push({
          ...r,
          precioUnitario: precioUnitario,
          subtotal: subtotal,
          valorUF: r.moneda === 'UF' ? valorUF : null
        });
      }

      // Generar número de cotización único
      const numeroCotizacion = 'COT-' + Date.now();
      const neto = parseFloat(total.toFixed(2));
      const iva = parseFloat((neto * 0.19).toFixed(2));
      const totalFinal = parseFloat((neto + iva).toFixed(2));

      // Buscar región y comuna por defecto si no se proporcionan
      let regionIdFinal = region_id;
      let comunaIdFinal = comuna_id;

      if (!regionIdFinal || !comunaIdFinal) {
        // Buscar región del Biobío por defecto
        const regionBiobio = await Region.findOne({ where: { nombre: 'Región del Biobío' } });
        if (regionBiobio) {
          regionIdFinal = regionBiobio.id;
          
          // Buscar Concepción como comuna por defecto
          const comunaConcepcion = await Comuna.findOne({ 
            where: { 
              nombre: 'Concepción',
              region_id: regionBiobio.id 
            } 
          });
          if (comunaConcepcion) {
            comunaIdFinal = comunaConcepcion.id;
          }
        }
      }

      // Crear la cotización en la base de datos
      let cotizacion;
      try {
        cotizacion = await Cotizacion.create({
          numeroCotizacion,
          fecha: new Date(),
          nombre,
          rut,
          correo,
          telefono,
          direccion: direccion || '',
          region_id: regionIdFinal,
          comuna_id: comunaIdFinal,
          nombreEmpresa: nombreEmpresa || null,
          rutEmpresa: rutEmpresa || null,
          subtotal: neto,
          iva: iva,
          total: totalFinal,
          estado: 'pendiente',
          observaciones: observaciones || '',
          detalles: JSON.stringify({
            datosContacto: {
              nombre,
              rut,
              correo,
              telefono,
              nombreEmpresa,
              rutEmpresa
            },
            direccion: direccion || '',
            residuos: detalles
          }),
          cliente_id: null
        });

        // Crear registros en CotizacionResiduo
        for (let detalle of detalles) {
          await CotizacionResiduo.create({
            cotizacion_id: cotizacion.numeroCotizacion,
            precio_residuo_id: detalle.residuoId || detalle.id,
            descripcion: detalle.descripcion,
            precio_unitario: detalle.precioUnitario,
            cantidad: detalle.cantidad,
            subtotal: detalle.subtotal
          });
        }

        // Validar configuración de correo y verificar conexión
        if (!validateEmailConfig()) {
          console.error('❌ Configuración de correo incompleta');
          return res.render('cotizaciones/resultado', {
            detalles,
            total: totalFinal,
            subtotal: neto,
            iva,
            numeroCotizacion,
            nombre,
            rut,
            correo,
            telefono,
            nombreEmpresa,
            rutEmpresa,
            direccion,
            observaciones,
            titulo: 'Resultado de Cotización',
            usuario: req.user || null,
            success: true,
            error: 'La cotización se guardó correctamente pero no se pudo enviar el correo debido a una configuración incompleta.'
          });
        }

        // Verificar conexión con el servidor de correo
        const isConnected = await verifyConnection();
        if (!isConnected) {
          console.error('❌ No se pudo conectar con el servidor de correo');
          return res.render('cotizaciones/resultado', {
            detalles,
            total: totalFinal,
            subtotal: neto,
            iva,
            numeroCotizacion,
            nombre,
            rut,
            correo,
            telefono,
            nombreEmpresa,
            rutEmpresa,
            direccion,
            observaciones,
            titulo: 'Resultado de Cotización',
            usuario: req.user || null,
            success: true,
            error: 'La cotización se guardó correctamente pero no se pudo enviar el correo debido a un problema de conexión.'
          });
        }

        // Enviar correo al cliente
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: correo,
          subject: `Cotización de Residuos N° ${numeroCotizacion}`,
          html: emailTemplates.cotizacion({
            numeroCotizacion,
            nombre,
            correo,
            telefono,
            empresa: nombreEmpresa,
            rutEmpresa,
            direccion: `${direccion || ''}, ${comunaIdFinal}, ${regionIdFinal}`,
            detalles: detalles.map(d => ({
              ...d,
              nombre: d.descripcion // Mapear descripcion a nombre para la plantilla
            })),
            subtotal: neto,
            iva: iva,
            total: totalFinal,
            observaciones: observaciones || ''
          }).html // Obtener solo el HTML de la plantilla
        };

        try {
          await sendMailWithRetry(mailOptions);
          console.log('✅ Correo enviado exitosamente');
        } catch (error) {
          console.error('❌ Error al enviar correo:', error);
          // Continuar con la redirección aunque falle el envío del correo
        }

        // Redirigir a la página de resultado
        return res.render('cotizaciones/resultado', {
          detalles,
          total: totalFinal,
          subtotal: neto,
          iva,
          numeroCotizacion,
          nombre,
          rut,
          correo,
          telefono,
          nombreEmpresa,
          rutEmpresa,
          direccion,
          observaciones,
          titulo: 'Resultado de Cotización',
          usuario: req.user || null,
          success: true
        });

      } catch (error) {
        console.error('❌ Error al guardar la cotización:', error);
        return res.status(500).render('error', {
          titulo: 'Error',
          mensaje: 'No se pudo guardar la cotización. Por favor, inténtelo nuevamente.'
        });
      }

    } catch (error) {
      console.error('❌ Error en procesarCotizacion:', error);
      res.status(500).render('error', { 
        titulo: 'Error', 
        mensaje: 'Error al procesar la cotización. Por favor, inténtelo nuevamente.' 
      });
    }
  },

  /**
   * Crear un nuevo residuo
   */
  crearResiduo: async (req, res) => {
    const { descripcion, precio, unidad, moneda } = req.body;
    if (!descripcion || !precio || !unidad || !moneda) {
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/admin/residuos');
    }
    try {
      await PrecioResiduo.create({ descripcion, precio, unidad, moneda });
      req.flash('success', 'Residuo creado correctamente');
    } catch (e) {
      req.flash('error', 'Error al crear el residuo');
    }
    res.redirect('/admin/residuos');
  },

  /**
   * Editar un residuo existente
   */
  editarResiduo: async (req, res) => {
    const { id } = req.params;
    const { descripcion, precio, unidad, moneda } = req.body;
    if (!descripcion || !precio || !unidad || !moneda) {
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/admin/residuos');
    }
    try {
      const [updated] = await PrecioResiduo.update(
        { descripcion, precio, unidad, moneda },
        { where: { id } }
      );
      if (updated) {
        req.flash('success', 'Residuo actualizado correctamente');
      } else {
        req.flash('error', 'Residuo no encontrado');
      }
    } catch (e) {
      req.flash('error', 'Error al actualizar el residuo');
    }
    res.redirect('/admin/residuos');
  },
};

/**
 * Función auxiliar para generar HTML del correo
 */
async function generarHTMLCotizacion(datos) {
  const {
    numeroCotizacion,
    nombre,
    rut,
    correo,
    telefono,
    nombreEmpresa,
    rutEmpresa,
    detalles,
    neto,
    iva,
    totalFinal
  } = datos;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2c7a7b, #319795); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">Felmart</h1>
        <h2 style="margin: 10px 0 0 0; font-size: 24px;">Cotización N° ${numeroCotizacion}</h2>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h3 style="color: #2c7a7b; margin-bottom: 20px;">Datos de Contacto</h3>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>RUT:</strong> ${rut}</p>
        <p><strong>Correo:</strong> ${correo}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        ${nombreEmpresa ? `<p><strong>Empresa:</strong> ${nombreEmpresa} ${rutEmpresa ? `(${rutEmpresa})` : ''}</p>` : ''}
      </div>

      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h3 style="color: #2c7a7b; margin-bottom: 20px;">Detalle de la Cotización</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Cant.</th>
              <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Descripción</th>
              <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Unidad</th>
              <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">Precio Unit.</th>
              <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${detalles.map(d => `
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${d.cantidad}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${d.descripcion}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${d.unidad}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">
                  ${d.precioUnitario.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}
                  ${d.moneda === 'UF' && d.valorUF ? ` (UF: ${d.valorUF.toLocaleString('es-CL')})` : ''}
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">
                  ${d.subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8f9fa;">
              <th colspan="4" style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">Neto</th>
              <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">
                ${neto.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}
              </th>
            </tr>
            <tr style="background: #f8f9fa;">
              <th colspan="4" style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">IVA (19%)</th>
              <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">
                ${iva.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}
              </th>
            </tr>
            <tr style="background: #2c7a7b; color: white;">
              <th colspan="4" style="padding: 15px; border: 1px solid #2c7a7b; text-align: right;">TOTAL</th>
              <th style="padding: 15px; border: 1px solid #2c7a7b; text-align: right; font-size: 18px;">
                ${totalFinal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}
              </th>
            </tr>
          </tfoot>
        </table>
        
        <div style="background: #e6fffa; border: 1px solid #81e6d9; border-radius: 8px; padding: 15px; margin-top: 20px;">
          <p style="margin: 0; color: #234e52;"><strong>Nota importante:</strong> Al valor del desecho se le debe agregar un costo operativo por kilómetro recorrido según la ubicación de retiro.</p>
        </div>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
        <p style="margin: 0; color: #6c757d;">Gracias por confiar en Felmart para el manejo de sus residuos industriales.</p>
        <p style="margin: 5px 0 0 0; color: #6c757d;">Pronto nos pondremos en contacto con usted.</p>
      </div>
    </div>
  `;
}