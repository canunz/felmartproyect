const emailTemplates = {
  // Estilos comunes
  styles: {
    container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;',
    header: 'background: linear-gradient(135deg, #00616e, #00818f); padding: 30px; text-align: center; color: white;',
    content: 'background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);',
    section: 'background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;',
    footer: 'background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; color: #6c757d;',
    button: 'background-color: #00616e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px 5px;'
  },

  // Plantilla para cotizaciones
  cotizacion: (data) => ({
    subject: `Cotización de Residuos N° ${data.numeroCotizacion}`,
    html: `
      <div style="${emailTemplates.styles.container}">
        <div style="${emailTemplates.styles.content}">
          <div style="${emailTemplates.styles.header}">
            <h1 style="margin: 0 0 5px 0; font-size: 24px; font-weight: bold;">Cotización de Residuos</h1>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">N° ${data.numeroCotizacion}</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="${emailTemplates.styles.section}">
              <h3 style="color: #00616e; margin: 0 0 15px 0;">Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${data.nombre}</p>
              <p><strong>Email:</strong> ${data.correo}</p>
              ${data.telefono ? `<p><strong>Teléfono:</strong> ${data.telefono}</p>` : ''}
              ${data.empresa ? `<p><strong>Empresa:</strong> ${data.empresa}</p>` : ''}
              ${data.direccion ? `<p><strong>Dirección:</strong> ${data.direccion}, ${data.comuna || ''}, ${data.ciudad || ''}</p>` : ''}
            </div>

            <div style="${emailTemplates.styles.section}">
              <h3 style="color: #00616e; margin: 0 0 15px 0;">Detalles de la Cotización</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f1f1f1;">
                    <th style="padding: 12px; text-align: left;">Residuo</th>
                    <th style="padding: 12px; text-align: right;">Cantidad</th>
                    <th style="padding: 12px; text-align: right;">Precio Unit.</th>
                    <th style="padding: 12px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.detalles.map(detalle => `
                    <tr>
                      <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${detalle.nombre}</td>
                      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${detalle.cantidad}</td>
                      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${detalle.precioUnitario.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${detalle.subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Subtotal:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">${data.subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                  </tr>
                  <tr>
                    <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">IVA (19%):</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">${data.iva.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                  </tr>
                  <tr>
                    <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">${data.total.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            ${data.observaciones ? `
              <div style="${emailTemplates.styles.section}">
                <h3 style="color: #00616e; margin: 0 0 15px 0;">Observaciones</h3>
                <p style="margin: 0;">${data.observaciones}</p>
              </div>
            ` : ''}
          </div>

          <div style="${emailTemplates.styles.footer}">
            <p style="margin: 0;">Gracias por confiar en Felmart para el manejo de sus residuos.</p>
          </div>
        </div>
      </div>
    `
  }),

  // Plantilla para contacto
  contacto: (data) => ({
    subject: 'Nuevo mensaje de contacto',
    html: `
      <div style="${emailTemplates.styles.container}">
        <div style="${emailTemplates.styles.content}">
          <div style="${emailTemplates.styles.header}">
            <h1 style="margin: 0; font-size: 24px;">Nuevo mensaje de contacto</h1>
          </div>
          
          <div style="padding: 30px;">
            <div style="${emailTemplates.styles.section}">
              <p><strong>Nombre:</strong> ${data.nombre}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              ${data.telefono ? `<p><strong>Teléfono:</strong> ${data.telefono}</p>` : ''}
              <p><strong>Mensaje:</strong></p>
              <p style="white-space: pre-wrap;">${data.mensaje}</p>
            </div>
          </div>

          <div style="${emailTemplates.styles.footer}">
            <p style="margin: 0;">Este es un correo automático, por favor no responda a este mensaje.</p>
          </div>
        </div>
      </div>
    `
  }),

  // Plantilla para recuperación de contraseña
  resetPassword: (nombre, resetUrl) => ({
    subject: 'Recuperación de Contraseña - Felmart',
    html: `
      <div style="${emailTemplates.styles.container}">
        <div style="${emailTemplates.styles.content}">
          <div style="${emailTemplates.styles.header}">
            <h1 style="margin: 0; font-size: 24px;">Recuperación de Contraseña</h1>
          </div>
          
          <div style="padding: 30px;">
            <div style="${emailTemplates.styles.section}">
              <p>Hola ${nombre},</p>
              <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="${emailTemplates.styles.button}">
                  Restablecer Contraseña
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Este enlace expirará en 2 horas por seguridad.</p>
              <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
            </div>
          </div>

          <div style="${emailTemplates.styles.footer}">
            <p style="margin: 0;">Este es un correo automático, por favor no responda a este mensaje.</p>
          </div>
        </div>
      </div>
    `
  }),

  // Plantilla para nueva visita
  nuevaVisita: (visita, cliente) => {
    const fechaFormateada = new Date(visita.fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const tipoVisitaText = visita.tipo_visita === 'evaluacion' ? 'Evaluación' : 'Retiro';

    return {
      subject: `Visita Programada - ${tipoVisitaText} - ${fechaFormateada}`,
      html: `
        <div style="${emailTemplates.styles.container}">
          <div style="${emailTemplates.styles.content}">
            <div style="${emailTemplates.styles.header}">
              <h1 style="margin: 0; font-size: 24px;">Nueva Visita Programada</h1>
              <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">Felmart - Gestión de Residuos</p>
            </div>
            
            <div style="padding: 30px;">
              <div style="${emailTemplates.styles.section}">
                <h3 style="color: #00616e; margin: 0 0 15px 0;">Hola ${cliente.nombre_empresa},</h3>
                <p>Hemos programado una nueva visita para su empresa. A continuación encontrará los detalles:</p>
              </div>

              <div style="${emailTemplates.styles.section}">
                <h3 style="color: #00616e; margin: 0 0 15px 0;">Detalles de la Visita</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Tipo de Visita:</td>
                    <td style="padding: 8px 0;">${tipoVisitaText}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Fecha:</td>
                    <td style="padding: 8px 0;">${fechaFormateada}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Hora:</td>
                    <td style="padding: 8px 0;">${visita.hora}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Dirección:</td>
                    <td style="padding: 8px 0;">${cliente.direccion || 'Dirección registrada en su perfil'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Estado:</td>
                    <td style="padding: 8px 0;">${visita.estado.charAt(0).toUpperCase() + visita.estado.slice(1)}</td>
                  </tr>
                </table>
              </div>

              <div style="${emailTemplates.styles.section}">
                <h3 style="color: #00616e; margin: 0 0 15px 0;">Acción Requerida</h3>
                <p style="margin-bottom: 20px;">Por favor, ingrese a su cuenta de Felmart para confirmar o rechazar esta visita:</p>
                <div style="text-align: center;">
                  <a href="${process.env.BASE_URL}/clientes/solicitudes" 
                     style="${emailTemplates.styles.button}">
                    Gestionar Visita
                  </a>
                </div>
                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                  * Es importante que confirme o rechace la visita lo antes posible para una mejor coordinación.
                </p>
              </div>
            </div>

            <div style="${emailTemplates.styles.footer}">
              <p style="margin: 0;">Gracias por confiar en Felmart para el manejo de sus residuos.</p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                Si tiene problemas con el botón, puede acceder directamente a través de este enlace: 
                <a href="${process.env.BASE_URL}/clientes/solicitudes" style="color: #00616e;">
                  ${process.env.BASE_URL}/clientes/solicitudes
                </a>
              </p>
            </div>
          </div>
        </div>
      `
    };
  },

  // Plantilla para confirmación de visita
  confirmacionVisita: (visita, cliente) => {
    const fechaFormateada = new Date(visita.fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const tipoVisitaText = visita.tipoVisita === 'evaluacion' ? 'Evaluación' : 'Retiro';

    return `
      <div style="${emailTemplates.styles.container}">
        <div style="${emailTemplates.styles.content}">
          <div style="${emailTemplates.styles.header}">
            <h1 style="margin: 0; font-size: 24px;">Visita Confirmada</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">Felmart - Gestión de Residuos</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="${emailTemplates.styles.section}">
              <h3 style="color: #00616e; margin: 0 0 15px 0;">Hola ${cliente.nombre_empresa},</h3>
              <p>Su visita ha sido confirmada exitosamente. Nos vemos pronto en su empresa.</p>
            </div>

            <div style="${emailTemplates.styles.section}">
              <h3 style="color: #00616e; margin: 0 0 15px 0;">Detalles de la Visita Confirmada</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Tipo de Visita:</td>
                  <td style="padding: 8px 0;">${tipoVisitaText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Fecha:</td>
                  <td style="padding: 8px 0;">${fechaFormateada}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Hora:</td>
                  <td style="padding: 8px 0;">${visita.hora}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Dirección:</td>
                  <td style="padding: 8px 0;">${cliente.direccion || 'Dirección registrada en su perfil'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Estado:</td>
                  <td style="padding: 8px 0; color: #28a745; font-weight: bold;">✓ Confirmada</td>
                </tr>
              </table>
            </div>

            ${visita.observaciones ? `
              <div style="${emailTemplates.styles.section}">
                <h3 style="color: #00616e; margin: 0 0 15px 0;">Observaciones</h3>
                <p style="margin: 0; white-space: pre-wrap;">${visita.observaciones}</p>
              </div>
            ` : ''}

            <div style="${emailTemplates.styles.section}">
              <h3 style="color: #00616e; margin: 0 0 15px 0;">Preparación para la Visita</h3>
              <p>Para agilizar el proceso, le recomendamos tener preparado:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Acceso a las áreas donde se encuentran los residuos</li>
                <li>Información sobre los tipos de residuos a evaluar/retirar</li>
                <li>Persona autorizada para firmar documentos</li>
                <li>Documentación relacionada con los residuos (si aplica)</li>
              </ul>
            </div>

            <div style="${emailTemplates.styles.section}">
              <h3 style="color: #00616e; margin: 0 0 15px 0;">Información de Contacto</h3>
              <p>Si necesita reprogramar o tiene alguna consulta:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Teléfono:</strong> +56 2 2345 6789</li>
                <li><strong>Email:</strong> contacto@felmart.cl</li>
                <li><strong>Horario:</strong> Lunes a Viernes de 8:00 a 18:00</li>
              </ul>
            </div>
          </div>

          <div style="${emailTemplates.styles.footer}">
            <p style="margin: 0;">Gracias por confiar en Felmart para el manejo de sus residuos.</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Este es un correo automático, por favor no responda a este mensaje.</p>
          </div>
        </div>
      </div>
    `;
  },

  nuevaSolicitud: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: linear-gradient(135deg, #00616e, #00818f);
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .content {
                background: #f9f9f9;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 0 0 10px 10px;
            }
            .info-section {
                background: white;
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                border-left: 4px solid #00616e;
            }
            .label {
                font-weight: bold;
                color: #00616e;
            }
            .urgencia {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 15px;
                font-weight: bold;
            }
            .urgencia-alta {
                background: #ffebee;
                color: #d32f2f;
            }
            .urgencia-media {
                background: #fff3e0;
                color: #f57c00;
            }
            .urgencia-baja {
                background: #e8f5e9;
                color: #388e3c;
            }
            .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Nueva Solicitud de Retiro</h2>
                <p>Se ha registrado una nueva solicitud en el sistema</p>
            </div>
            <div class="content">
                <div class="info-section">
                    <p><span class="label">Número de Solicitud:</span> #${data.numeroSolicitud}</p>
                    <p><span class="label">Fecha:</span> ${data.fecha}</p>
                    <p><span class="label">Tipo de Solicitud:</span> ${data.tipoSolicitud.toUpperCase()}</p>
                    <p>
                        <span class="label">Urgencia:</span> 
                        <span class="urgencia urgencia-${data.urgencia}">
                            ${data.urgencia.toUpperCase()}
                        </span>
                    </p>
                </div>

                <div class="info-section">
                    <h3 style="color: #00616e;">Información del Cliente</h3>
                    <p><span class="label">Empresa:</span> ${data.cliente.nombre}</p>
                    <p><span class="label">RUT:</span> ${data.cliente.rut}</p>
                    <p><span class="label">Email:</span> ${data.cliente.email}</p>
                    <p><span class="label">Teléfono:</span> ${data.cliente.telefono}</p>
                </div>

                <div class="info-section">
                    <h3 style="color: #00616e;">Descripción de la Solicitud</h3>
                    <p>${data.descripcion}</p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <a href="http://localhost:3000/admin/solicitud" 
                       style="background: #00616e; color: white; padding: 10px 20px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Ver Solicitud en el Sistema
                    </a>
                </div>
            </div>
            <div class="footer">
                <p>Este es un correo automático, por favor no responder.</p>
                <p>© ${new Date().getFullYear()} Felmart - Gestión de Residuos</p>
            </div>
        </div>
    </body>
    </html>
  `
};

// Funciones auxiliares para generar templates
function generarTemplateVisita(visita, cliente) {
  return emailTemplates.nuevaVisita(visita, cliente);
}

function generarTemplateConfirmacionVisita(visita, cliente) {
  return emailTemplates.confirmacionVisita(visita, cliente);
}

module.exports = {
  ...emailTemplates,
  generarTemplateVisita,
  generarTemplateConfirmacionVisita
}; 